import { os } from "@/server/orpc/base";
import { DataPortabilityService } from "@/server/modules/data-portability/service";
import { getLocalDb } from "@/server/runtime/local-db";

function getDataPortabilityService() {
  return getLocalDb().then((db) => new DataPortabilityService(db));
}

export const dataPortabilityRouter = {
  exportAll: os.dataPortability.exportAll.handler(async () => {
    const service = await getDataPortabilityService();
    return service.exportAll();
  }),
  importAll: os.dataPortability.importAll.handler(async ({ input }) => {
    const service = await getDataPortabilityService();
    return service.importAll(input);
  }),
};
