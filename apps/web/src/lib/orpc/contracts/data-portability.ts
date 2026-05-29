import { oc } from "@orpc/contract";
import { z } from "zod";

const dataRowSchema = z.record(z.string(), z.unknown());

export const platformDataExportSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(dataRowSchema)),
});

export const platformDataImportResultSchema = z.object({
  success: z.literal(true),
  importedAt: z.string(),
  tables: z.record(z.string(), z.number()),
});

export const dataPortabilityContract = {
  exportAll: oc.input(z.object({}).optional()).output(platformDataExportSchema),
  importAll: oc
    .input(platformDataExportSchema)
    .output(platformDataImportResultSchema),
};
