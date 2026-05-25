import { os } from "@/server/orpc/base";
import { IntegrationService } from "@/server/modules/integration/service";
import { getLocalDb } from "@/server/runtime/local-db";
import { createServiceCache } from "@/server/service-cache";

const getService = createServiceCache((db) => new IntegrationService(db));

export const integrationsRouter = {
  list: os.integrations.list.handler(async () => {
    return getService(await getLocalDb()).listIntegrations();
  }),
  connect: os.integrations.connect.handler(async ({ input }) => {
    return getService(await getLocalDb()).connectIntegration(input.id, {
      accessToken: input.accessToken,
      apiUrl: input.apiUrl,
    });
  }),
  connectGoogle: os.integrations.connectGoogle.handler(async ({ input }) => {
    return getService(await getLocalDb()).connectGoogleIntegration(input.id, {
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      refreshToken: input.refreshToken,
      label: input.label,
    });
  }),
  createSmtpImapAccount: os.integrations.createSmtpImapAccount.handler(async ({ input }) => {
    return getService(await getLocalDb()).createSmtpImapAccount(input);
  }),
  updateAccount: os.integrations.updateAccount.handler(async ({ input }) => {
    return getService(await getLocalDb()).updateIntegrationAccount(input.id, input.accountId, {
      label: input.label,
      email: input.email,
      username: input.username,
      smtpImap: input.smtpImap,
    });
  }),
  deleteAccount: os.integrations.deleteAccount.handler(async ({ input }) => {
    return getService(await getLocalDb()).deleteIntegrationAccount(input.id, input.accountId);
  }),
  listGoogleCalendarEvents: os.integrations.listGoogleCalendarEvents.handler(async ({ input }) => {
    return getService(await getLocalDb()).listGoogleCalendarEvents(input);
  }),
  disconnect: os.integrations.disconnect.handler(async ({ input }) => {
    return getService(await getLocalDb()).disconnectIntegration(input.id);
  }),
};
