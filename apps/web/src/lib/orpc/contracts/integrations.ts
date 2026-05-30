import { oc } from "@orpc/contract";
import { z } from "zod";

const integrationTypeSchema = z.enum(["github", "gitlab", "gmail", "smtp-imap"]);

const integrationAccountSchema = z.object({
  id: z.string(),
  label: z.string(),
  email: z.string().optional(),
  username: z.string().optional(),
  scopes: z.array(z.string()),
  connectedAt: z.string(),
  hasRefreshToken: z.boolean().optional(),
  hasPassword: z.boolean().optional(),
  smtpHost: z.string().optional(),
  imapHost: z.string().optional(),
});

export const integrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: integrationTypeSchema,
  connected: z.boolean(),
  username: z.string().optional(),
  apiUrl: z.string().optional(),
  accounts: z.array(integrationAccountSchema),
});

const smtpImapConfigSchema = z.object({
  email: z.string(),
  displayName: z.string().optional(),
  smtp: z.object({
    host: z.string(),
    port: z.number(),
    secure: z.boolean(),
  }),
  imap: z.object({
    host: z.string(),
    port: z.number(),
    secure: z.boolean(),
  }),
  username: z.string(),
  password: z.string(),
});

export const integrationsContract = {
  list: oc.input(z.object({}).optional()).output(z.array(integrationSchema)),
  connect: oc
    .input(
      z.object({
        id: z.enum(["github", "gitlab"]),
        accessToken: z.string(),
        apiUrl: z.string().optional(),
      }),
    )
    .output(integrationSchema),
  connectGoogle: oc
    .input(
      z.object({
        id: z.enum(["gmail"]),
        clientId: z.string(),
        clientSecret: z.string(),
        refreshToken: z.string(),
        label: z.string().optional(),
      }),
    )
    .output(integrationSchema),
  createSmtpImapAccount: oc
    .input(
      z.object({
        email: z.string(),
        displayName: z.string().optional(),
        username: z.string(),
        password: z.string(),
        smtp: z.object({
          host: z.string(),
          port: z.number(),
          secure: z.boolean(),
        }),
        imap: z.object({
          host: z.string(),
          port: z.number(),
          secure: z.boolean(),
        }),
      }),
    )
    .output(integrationSchema),
  updateAccount: oc
    .input(
      z.object({
        id: z.string(),
        accountId: z.string(),
        label: z.string().optional(),
        email: z.string().optional(),
        username: z.string().optional(),
        smtpImap: smtpImapConfigSchema.optional(),
      }),
    )
    .output(integrationSchema),
  deleteAccount: oc
    .input(
      z.object({
        id: z.string(),
        accountId: z.string(),
      }),
    )
    .output(integrationSchema),
  disconnect: oc.input(z.object({ id: z.string() })).output(z.object({ success: z.boolean() })),
  sendMail: oc
    .input(
      z.object({
        provider: z.enum(["smtp-imap", "gmail"]),
        accountId: z.string().optional(),
        to: z.array(z.string().email()),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string().min(1),
        body: z.string(),
      }),
    )
    .output(
      z.object({
        id: z.string(),
        provider: z.string(),
        accountId: z.string().optional(),
      }),
    ),
};
