import { os } from "@/server/orpc/base";
import { IntegrationService } from "@/server/modules/integration/service";
import { getLocalDb } from "@/server/runtime/local-db";

async function getService() {
  return new IntegrationService(await getLocalDb());
}

export const integrationsRouter = {
  list: os.integrations.list.handler(async () => {
    return (await getService()).listIntegrations();
  }),
  connect: os.integrations.connect.handler(async ({ input }) => {
    return (await getService()).connectIntegration(input.id, {
      accessToken: input.accessToken,
      apiUrl: input.apiUrl,
    });
  }),
  connectGoogle: os.integrations.connectGoogle.handler(async ({ input }) => {
    return (await getService()).connectGoogleIntegration(input.id, {
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      refreshToken: input.refreshToken,
      label: input.label,
    });
  }),
  createSmtpImapAccount: os.integrations.createSmtpImapAccount.handler(async ({ input }) => {
    return (await getService()).createSmtpImapAccount(input);
  }),
  updateAccount: os.integrations.updateAccount.handler(async ({ input }) => {
    return (await getService()).updateIntegrationAccount(input.id, input.accountId, {
      label: input.label,
      email: input.email,
      username: input.username,
      smtpImap: input.smtpImap,
    });
  }),
  deleteAccount: os.integrations.deleteAccount.handler(async ({ input }) => {
    return (await getService()).deleteIntegrationAccount(input.id, input.accountId);
  }),
  listGoogleCalendarEvents: os.integrations.listGoogleCalendarEvents.handler(async ({ input }) => {
    return (await getService()).listGoogleCalendarEvents(input);
  }),
  disconnect: os.integrations.disconnect.handler(async ({ input }) => {
    return (await getService()).disconnectIntegration(input.id);
  }),
};
