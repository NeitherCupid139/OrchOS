import { oc } from "@orpc/contract";
import { z } from "zod";

const integrationTypeSchema = z.enum(["github", "gitlab", "google-calendar", "gmail", "smtp-imap"]);

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

const googleCalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  allDay: z.boolean(),
  accountId: z.string(),
  provider: z.literal("google"),
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
        id: z.enum(["google-calendar", "gmail"]),
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
  listGoogleCalendarEvents: oc
    .input(
      z.object({
        accountId: z.string().optional(),
        timeMin: z.string().optional(),
        timeMax: z.string().optional(),
        maxResults: z.number().optional(),
      }).optional(),
    )
    .output(z.array(googleCalendarEventSchema)),
  disconnect: oc.input(z.object({ id: z.string() })).output(z.object({ success: z.boolean() })),
};
