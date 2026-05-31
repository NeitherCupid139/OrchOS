import { createTransport } from "nodemailer";
import Imap from "node-imap";
import { simpleParser, type ParsedMail } from "mailparser";
import { eq } from "drizzle-orm";
import type { AppDb } from "@/server/db/types";
import { settings } from "@/server/db/schema";

type IntegrationType = "github" | "gitlab" | "gmail" | "smtp-imap";

interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface MailServerConfig {
  host: string;
  port: number;
  secure: boolean;
}

interface SmtpImapConfig {
  email: string;
  displayName?: string;
  smtp: MailServerConfig;
  imap: MailServerConfig;
  username: string;
  password: string;
}

interface IntegrationAccount {
  id: string;
  label: string;
  email?: string;
  username?: string;
  scopes?: string[];
  connectedAt: string;
  oauth?: OAuthCredentials;
  smtpImap?: SmtpImapConfig;
}

interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  connected: boolean;
  accounts: IntegrationAccount[];
  accessToken?: string;
  apiUrl?: string;
  username?: string;
}

interface GoogleTokenResult {
  accessToken: string;
  scopes: string[];
}

export interface EmailSummary {
  id: string;
  threadId?: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  provider: "gmail" | "smtp";
  accountId: string;
}

export interface EmailDetail extends EmailSummary {
  cc: string;
  body: string;
}

const INTEGRATION_KEY = "integrations";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_SCOPES = {
  gmail: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
  ],
} as const;

const defaultIntegrations: IntegrationConfig[] = [
  { id: "github", name: "GitHub", type: "github", connected: false, accounts: [] },
  { id: "gitlab", name: "GitLab", type: "gitlab", connected: false, accounts: [] },
  { id: "gmail", name: "Gmail", type: "gmail", connected: false, accounts: [] },
  { id: "smtp-imap", name: "SMTP / IMAP", type: "smtp-imap", connected: false, accounts: [] },
];

export class IntegrationService {
  constructor(private db: AppDb) {}

  private async getIntegrations(): Promise<IntegrationConfig[]> {
    const row = (await this.db.select().from(settings).where(eq(settings.key, INTEGRATION_KEY)).get()) as
      | { key: string; value: string }
      | undefined;
    if (!row) return defaultIntegrations;

    try {
      const stored = JSON.parse(row.value) as IntegrationConfig[];
      return defaultIntegrations.map((base) => {
        const found = stored.find((item) => item.id === base.id);
        return found
          ? {
              ...base,
              ...found,
              accounts: Array.isArray(found.accounts) ? found.accounts : [],
              connected:
                typeof found.connected === "boolean"
                  ? found.connected
                  : Array.isArray(found.accounts) && found.accounts.length > 0,
            }
          : base;
      });
    } catch {
      return defaultIntegrations;
    }
  }

  private async saveIntegrations(integrations: IntegrationConfig[]) {
    const existing = (await this.db.select().from(settings).where(eq(settings.key, INTEGRATION_KEY)).get()) as
      | { key: string; value: string }
      | undefined;
    const value = JSON.stringify(integrations);

    if (existing) {
      this.db.update(settings).set({ value }).where(eq(settings.key, INTEGRATION_KEY)).run();
    } else {
      this.db.insert(settings).values({ key: INTEGRATION_KEY, value }).run();
    }
  }

  private sanitizeIntegration(config: IntegrationConfig) {
    return {
      id: config.id,
      name: config.name,
      type: config.type,
      connected: config.connected,
      username: config.username,
      apiUrl: config.apiUrl,
      accounts: config.accounts.map((account) => ({
        id: account.id,
        label: account.label,
        email: account.email,
        username: account.username,
        scopes: account.scopes ?? [],
        connectedAt: account.connectedAt,
        hasRefreshToken: Boolean(account.oauth?.refreshToken),
        hasPassword: Boolean(account.smtpImap?.password),
        smtpHost: account.smtpImap?.smtp.host,
        imapHost: account.smtpImap?.imap.host,
      })),
    };
  }

  private requireIntegration(integrations: IntegrationConfig[], id: string) {
    const integration = integrations.find((item) => item.id === id);
    if (!integration) {
      throw new Error("Integration not found");
    }
    return integration;
  }

  private recomputeConnectionState(integration: IntegrationConfig) {
    integration.connected = integration.accounts.length > 0 || Boolean(integration.accessToken);
  }

  private createAccountId(prefix: string) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  private async verifyGitHubToken(token: string): Promise<{ username: string } | null> {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "OrchOS" },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { login?: string };
      return data.login ? { username: data.login } : null;
    } catch {
      return null;
    }
  }

  private async verifyGitLabToken(token: string, apiUrl: string): Promise<{ username: string } | null> {
    try {
      const res = await fetch(`${apiUrl}/api/v4/user`, {
        headers: { "Private-Token": token },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { username?: string };
      return data.username ? { username: data.username } : null;
    } catch {
      return null;
    }
  }

  private async exchangeGoogleRefreshToken(credentials: OAuthCredentials): Promise<{ accessToken: string; scopes: string[] }> {
    const body = new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      throw new Error("Failed to exchange Google refresh token");
    }

    const payload = (await response.json()) as { access_token?: string; scope?: string };
    if (!payload.access_token) {
      throw new Error("Google token response did not include an access token");
    }

    return {
      accessToken: payload.access_token,
      scopes: payload.scope?.split(" ").filter(Boolean) ?? [],
    };
  }

  private async getGoogleAccessToken(account: IntegrationAccount): Promise<GoogleTokenResult> {
    if (!account.oauth) {
      throw new Error("Google account is missing OAuth credentials");
    }

    return this.exchangeGoogleRefreshToken(account.oauth);
  }

  private requireAccount(integration: IntegrationConfig, accountId?: string) {
    const account = accountId
      ? integration.accounts.find((item) => item.id === accountId)
      : integration.accounts[0];

    if (!account) {
      throw new Error(`No connected account found for ${integration.name}`);
    }

    return account;
  }

  private toBase64Url(value: string) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  private async fetchGoogleProfile(accessToken: string): Promise<{ email: string; label: string }> {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Google account profile");
    }

    const payload = (await response.json()) as { email?: string; name?: string };
    return {
      email: payload.email ?? "",
      label: payload.name?.trim() || payload.email?.trim() || "Google account",
    };
  }

  private ensureScopes(actual: string[], required: readonly string[]) {
    return required.every((scope) => actual.includes(scope));
  }

  private validateSmtpImapConfig(config: SmtpImapConfig) {
    if (!config.email.trim()) throw new Error("Email is required");
    if (!config.username.trim()) throw new Error("Username is required");
    if (!config.password.trim()) throw new Error("Password is required");
    if (!config.smtp.host.trim() || !config.imap.host.trim()) throw new Error("SMTP and IMAP host are required");
    if (config.smtp.port <= 0 || config.imap.port <= 0) throw new Error("SMTP and IMAP ports must be positive numbers");
  }

  async listIntegrations() {
    return (await this.getIntegrations()).map((item) => this.sanitizeIntegration(item));
  }

  async connectIntegration(id: "github" | "gitlab", body: { accessToken: string; apiUrl?: string }) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);

    if (id === "github") {
      const result = await this.verifyGitHubToken(body.accessToken);
      if (!result) throw new Error("Invalid GitHub token");
      integration.connected = true;
      integration.accessToken = body.accessToken;
      integration.username = result.username;
    } else {
      const apiUrl = body.apiUrl || "https://gitlab.com";
      const result = await this.verifyGitLabToken(body.accessToken, apiUrl);
      if (!result) throw new Error("Invalid GitLab token");
      integration.connected = true;
      integration.accessToken = body.accessToken;
      integration.apiUrl = apiUrl;
      integration.username = result.username;
    }

    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  async connectGoogleIntegration(id: "gmail", body: { clientId: string; clientSecret: string; refreshToken: string; label?: string }) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);
    const credentials: OAuthCredentials = {
      clientId: body.clientId.trim(),
      clientSecret: body.clientSecret.trim(),
      refreshToken: body.refreshToken.trim(),
    };

    const { accessToken, scopes } = await this.exchangeGoogleRefreshToken(credentials);
    const requiredScopes = GOOGLE_OAUTH_SCOPES.gmail;

    if (!this.ensureScopes(scopes, requiredScopes)) {
      throw new Error("Google account is missing required scopes");
    }

    const profile = await this.fetchGoogleProfile(accessToken);
    const account: IntegrationAccount = {
      id: this.createAccountId(id),
      label: body.label?.trim() || profile.label,
      email: profile.email,
      username: profile.email,
      scopes,
      connectedAt: new Date().toISOString(),
      oauth: credentials,
    };

    const existingIndex = integration.accounts.findIndex((item) => item.email === profile.email);
    if (existingIndex >= 0) {
      integration.accounts[existingIndex] = account;
    } else {
      integration.accounts.push(account);
    }

    integration.accessToken = accessToken;
    integration.username = profile.email;
    this.recomputeConnectionState(integration);
    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  /**
   * Exchange an OAuth authorization code for tokens and connect a Google integration.
   * Uses the server-side Google OAuth app credentials (env vars) instead of requiring
   * the user to bring their own clientId/clientSecret.
   */
  async connectGoogleWithAuthCode(
    id: "gmail",
    code: string,
    redirectUri: string,
  ) {
    const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID ?? "").trim();
    const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "").trim();

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth is not configured on this server. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.");
    }

    // Exchange authorization code for tokens
    const tokenBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => "Unknown error");
      throw new Error(`Failed to exchange authorization code: ${errorText}`);
    }

    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      scope?: string;
      error?: string;
    };

    if (!tokenPayload.access_token) {
      throw new Error(`Google token response did not include an access token: ${tokenPayload.error ?? "unknown error"}`);
    }

    if (!tokenPayload.refresh_token) {
      throw new Error("Google did not return a refresh token. The user may have already authorized this app. They need to revoke access and try again, or add `prompt=consent` to the auth URL.");
    }

    const scopes = tokenPayload.scope?.split(" ").filter(Boolean) ?? [];
    const requiredScopes = GOOGLE_OAUTH_SCOPES.gmail;

    if (!this.ensureScopes(scopes, requiredScopes)) {
      throw new Error("Google account is missing required scopes. Please re-authorize with all requested permissions.");
    }

    // Fetch profile
    const profile = await this.fetchGoogleProfile(tokenPayload.access_token);

    // Store the integration with the server-side credentials
    const credentials: OAuthCredentials = {
      clientId,
      clientSecret,
      refreshToken: tokenPayload.refresh_token,
    };

    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);

    const account: IntegrationAccount = {
      id: this.createAccountId(id),
      label: profile.label,
      email: profile.email,
      username: profile.email,
      scopes,
      connectedAt: new Date().toISOString(),
      oauth: credentials,
    };

    const existingIndex = integration.accounts.findIndex((item) => item.email === profile.email);
    if (existingIndex >= 0) {
      integration.accounts[existingIndex] = account;
    } else {
      integration.accounts.push(account);
    }

    integration.accessToken = tokenPayload.access_token;
    integration.username = profile.email;
    this.recomputeConnectionState(integration);
    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  async createSmtpImapAccount(body: {
    email: string;
    displayName?: string;
    username: string;
    password: string;
    smtp: { host: string; port: number; secure: boolean };
    imap: { host: string; port: number; secure: boolean };
  }) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, "smtp-imap");
    const account: IntegrationAccount = {
      id: this.createAccountId("smtp-imap"),
      label: body.displayName?.trim() || body.email.trim(),
      email: body.email.trim(),
      username: body.username.trim(),
      connectedAt: new Date().toISOString(),
      smtpImap: {
        email: body.email.trim(),
        displayName: body.displayName?.trim(),
        username: body.username.trim(),
        password: body.password,
        smtp: {
          host: body.smtp.host.trim(),
          port: body.smtp.port,
          secure: body.smtp.secure,
        },
        imap: {
          host: body.imap.host.trim(),
          port: body.imap.port,
          secure: body.imap.secure,
        },
      },
    };

    if (!account.smtpImap) {
      throw new Error("SMTP / IMAP configuration is required");
    }

    this.validateSmtpImapConfig(account.smtpImap);
    const existingIndex = integration.accounts.findIndex((item) => item.email === account.email);
    if (existingIndex >= 0) {
      integration.accounts[existingIndex] = account;
    } else {
      integration.accounts.push(account);
    }

    integration.username = account.email;
    this.recomputeConnectionState(integration);
    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  async updateIntegrationAccount(id: string, accountId: string, data: {
    label?: string;
    email?: string;
    username?: string;
    smtpImap?: SmtpImapConfig;
  }) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);
    const account = integration.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (data.label !== undefined) account.label = data.label;
    if (data.email !== undefined) account.email = data.email;
    if (data.username !== undefined) account.username = data.username;
    if (data.smtpImap !== undefined) account.smtpImap = data.smtpImap;
    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  async deleteIntegrationAccount(id: string, accountId: string) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);
    integration.accounts = integration.accounts.filter((account) => account.id !== accountId);
    if (integration.accounts.length === 0) {
      integration.accessToken = undefined;
      integration.username = undefined;
    }
    this.recomputeConnectionState(integration);
    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  async disconnectIntegration(id: string) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);
    integration.connected = false;
    integration.accessToken = undefined;
    integration.apiUrl = undefined;
    integration.username = undefined;
    integration.accounts = [];
    await this.saveIntegrations(integrations);
    return { success: true };
  }

  async sendGmailMessage(input: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    accountId?: string;
  }) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, "gmail");
    const account = this.requireAccount(integration, input.accountId);
    const { accessToken } = await this.getGoogleAccessToken(account);

    const headers = [
      `From: ${account.email ?? account.label}`,
      `To: ${input.to.join(", ")}`,
      input.cc && input.cc.length > 0 ? `Cc: ${input.cc.join(", ")}` : null,
      `Subject: ${input.subject}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      input.body,
    ].filter((line): line is string => typeof line === "string");

    const raw = this.toBase64Url(headers.join("\r\n"));

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Failed to send Gmail message: ${errorText}`);
    }

    const data = await response.json() as { id?: string; threadId?: string };
    return {
      id: data.id ?? "",
      threadId: data.threadId,
      accountId: account.id,
      provider: "gmail" as const,
    };
  }

  async sendSmtpMessage(input: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    accountId?: string;
  }) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, "smtp-imap");
    const account = this.requireAccount(integration, input.accountId);
    const config = account.smtpImap;

    if (!config) {
      throw new Error("SMTP account is missing SMTP/IMAP configuration");
    }

    const transporter = createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });

    const info = await transporter.sendMail({
      from: config.displayName
        ? `"${config.displayName}" <${config.email}>`
        : config.email,
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      text: input.body,
    });

    return {
      id: info.messageId,
      accountId: account.id,
      provider: "smtp" as const,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  }

  /**
   * Fetch recent emails from a Gmail account via the Gmail API.
   */
  async fetchGmailMessages(input: {
    accountId?: string;
    maxResults?: number;
    query?: string;
  }): Promise<EmailSummary[]> {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, "gmail");
    const account = this.requireAccount(integration, input.accountId);
    const { accessToken } = await this.getGoogleAccessToken(account);

    const maxResults = Math.min(input.maxResults ?? 10, 50);
    const q = input.query ?? "in:inbox";
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(q)}`;

    const listResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text().catch(() => "Unknown error");
      throw new Error(`Failed to list Gmail messages: ${errorText}`);
    }

    const listData = (await listResponse.json()) as {
      messages?: { id: string; threadId: string }[];
      resultSizeEstimate?: number;
    };

    if (!listData.messages || listData.messages.length === 0) {
      return [];
    }

    // Fetch details for each message
    const summaries: EmailSummary[] = [];
    for (const msg of listData.messages) {
      try {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!detailResponse.ok) continue;

        const detail = (await detailResponse.json()) as {
          id: string;
          threadId: string;
          snippet?: string;
          internalDate?: string;
          payload?: {
            headers?: { name: string; value: string }[];
          };
        };

        const headers = detail.payload?.headers ?? [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

        summaries.push({
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader("From"),
          to: getHeader("To"),
          subject: getHeader("Subject"),
          date: getHeader("Date") || (detail.internalDate ? new Date(Number(detail.internalDate)).toISOString() : ""),
          snippet: detail.snippet ?? "",
          provider: "gmail",
          accountId: account.id,
        });
      } catch {
        // Skip individual message fetch errors
      }
    }

    return summaries;
  }

  /**
   * Get the full content of a specific Gmail message.
   */
  async getGmailMessage(input: {
    accountId?: string;
    messageId: string;
  }): Promise<EmailDetail | null> {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, "gmail");
    const account = this.requireAccount(integration, input.accountId);
    const { accessToken } = await this.getGoogleAccessToken(account);

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${input.messageId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!response.ok) {
      throw new Error(`Failed to get Gmail message: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      id: string;
      threadId: string;
      snippet?: string;
      internalDate?: string;
      payload?: {
        headers?: { name: string; value: string }[];
        body?: { data?: string };
        parts?: {
          mimeType: string;
          body?: { data?: string };
          parts?: { mimeType: string; body?: { data?: string } }[];
        }[];
      };
    };

    const headers = data.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

    // Decode body from base64
    let body = "";
    const parts = data.payload?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.mimeType === "text/plain" || part.mimeType === "text/html") {
          const data = part.body?.data;
          if (data) {
            const decoded = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
            if (part.mimeType === "text/plain") {
              body = decoded;
              break;
            } else if (!body) {
              // Fallback to HTML, strip tags for plain text
              body = decoded.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
            }
          }
        }
      }
    } else if (data.payload?.body?.data) {
      body = atob(data.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }

    return {
      id: data.id,
      threadId: data.threadId,
      from: getHeader("From"),
      to: getHeader("To"),
      cc: getHeader("Cc"),
      subject: getHeader("Subject"),
      date: getHeader("Date") || (data.internalDate ? new Date(Number(data.internalDate)).toISOString() : ""),
      snippet: data.snippet ?? "",
      body,
      provider: "gmail",
      accountId: account.id,
    };
  }

  /**
   * Fetch recent emails from an IMAP inbox.
   */
  async fetchImapMessages(input: {
    accountId?: string;
    maxResults?: number;
  }): Promise<EmailSummary[]> {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, "smtp-imap");
    const account = this.requireAccount(integration, input.accountId);
    const config = account.smtpImap;

    if (!config) {
      throw new Error("IMAP account is missing configuration");
    }

    const maxResults = Math.min(input.maxResults ?? 10, 50);

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.username,
        password: config.password,
        host: config.imap.host,
        port: config.imap.port,
        tls: config.imap.secure,
        tlsOptions: { rejectUnauthorized: false },
      });

      const summaries: EmailSummary[] = [];

      imap.once("ready", () => {
        imap.openBox("INBOX", false, (err) => {
          if (err) {
            imap.end();
            reject(new Error(`Failed to open inbox: ${err.message}`));
            return;
          }

          imap.search(["ALL"], (searchErr, uids) => {
            if (searchErr) {
              imap.end();
              reject(new Error(`Failed to search inbox: ${searchErr.message}`));
              return;
            }

            if (!uids || uids.length === 0) {
              imap.end();
              resolve([]);
              return;
            }

            const recentUids = uids.slice(-maxResults);
            const fetch = imap.fetch(recentUids, {
              bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
              struct: true,
            });

            fetch.on("message", (msg) => {
              let from = "";
              let to = "";
              let subject = "";
              let date = "";
              let snippet = "";

              msg.on("body", (stream, info) => {
                let buffer = "";
                stream.on("data", (chunk: Buffer) => {
                  buffer += chunk.toString("utf-8");
                });
                stream.once("end", () => {
                  if (info.which.startsWith("HEADER")) {
                    from = buffer.match(/^From:\s*(.+)$/im)?.[1] ?? "";
                    to = buffer.match(/^To:\s*(.+)$/im)?.[1] ?? "";
                    subject = buffer.match(/^Subject:\s*(.+)$/im)?.[1] ?? "";
                    date = buffer.match(/^Date:\s*(.+)$/im)?.[1] ?? "";
                  } else {
                    snippet = buffer.replace(/\r?\n/g, " ").slice(0, 200);
                  }
                });
              });

              msg.once("attributes", (attrs) => {
                summaries.push({
                  id: String(attrs.uid),
                  threadId: undefined,
                  from,
                  to,
                  subject,
                  date,
                  snippet,
                  provider: "smtp",
                  accountId: account.id,
                });
              });
            });

            fetch.once("error", (fetchErr) => {
              imap.end();
              reject(new Error(`Fetch error: ${fetchErr.message}`));
            });

            fetch.once("end", () => {
              imap.end();
              // Sort by most recent first (reverse order)
              summaries.reverse();
              resolve(summaries);
            });
          });
        });
      });

      imap.once("error", (imapErr: Error) => {
        reject(new Error(`IMAP connection error: ${imapErr.message}`));
      });

      imap.connect();
    });
  }

  /**
   * Get the full content of a specific IMAP message.
   */
  async getImapMessage(input: {
    accountId?: string;
    messageId: string;
  }): Promise<EmailDetail | null> {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, "smtp-imap");
    const account = this.requireAccount(integration, input.accountId);
    const config = account.smtpImap;

    if (!config) {
      throw new Error("IMAP account is missing configuration");
    }

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.username,
        password: config.password,
        host: config.imap.host,
        port: config.imap.port,
        tls: config.imap.secure,
        tlsOptions: { rejectUnauthorized: false },
      });

      imap.once("ready", () => {
        imap.openBox("INBOX", false, (err) => {
          if (err) {
            imap.end();
            reject(new Error(`Failed to open inbox: ${err.message}`));
            return;
          }

          const uid = Number(input.messageId);
          if (Number.isNaN(uid)) {
            imap.end();
            reject(new Error(`Invalid message ID: ${input.messageId}`));
            return;
          }

          const fetch = imap.fetch([uid], { bodies: [""] });

          fetch.on("message", (msg) => {
            const chunks: Buffer[] = [];
            msg.on("body", (stream) => {
              stream.on("data", (chunk: Buffer) => {
                chunks.push(chunk);
              });
              stream.once("end", () => {
                const full = Buffer.concat(chunks);
                simpleParser(full, (parseErr, parsed: ParsedMail) => {
                  imap.end();
                  if (parseErr) {
                    reject(new Error(`Failed to parse email: ${parseErr.message}`));
                    return;
                  }

                  resolve({
                    id: input.messageId,
                    threadId: undefined,
                    from: parsed.from?.text ?? "",
                    to: Array.isArray(parsed.to)
                      ? parsed.to.map((a) => a.text).join(", ")
                      : parsed.to?.text ?? "",
                    cc: Array.isArray(parsed.cc)
                      ? parsed.cc.map((a) => a.text).join(", ")
                      : parsed.cc?.text ?? "",
                    subject: parsed.subject ?? "",
                    date: parsed.date?.toISOString() ?? "",
                    snippet: parsed.text?.slice(0, 200) ?? "",
                    body: parsed.text ?? "",
                    provider: "smtp",
                    accountId: account.id,
                  });
                });
              });
            });
          });

          fetch.once("error", (fetchErr) => {
            imap.end();
            reject(new Error(`Fetch error: ${fetchErr.message}`));
          });
        });
      });

      imap.once("error", (imapErr: Error) => {
        reject(new Error(`IMAP connection error: ${imapErr.message}`));
      });

      imap.connect();
    });
  }

}
