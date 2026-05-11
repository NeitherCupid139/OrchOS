import { settings } from "@/server/db/schema";
import type { AppDb } from "@/server/db/types";
import type { ControlSettings } from "@/server/types";

export class SettingsService {
  private settings: ControlSettings = {
    autoCommit: false,
    autoFix: true,
    modelStrategy: "adaptive",
    locale: "en",
    showShortcutHints: false,
    sendShortcut: "enter",
    useMixedScript: false,
    preferKanji: false,
  };

  private constructor(private db: AppDb) {}

  static async create(db: AppDb) {
    const service = new SettingsService(db);
    await service.load();
    return service;
  }

  private async load() {
    const rows = (await this.db.select().from(settings).all()) as { key: string; value: string }[];
    for (const row of rows) {
      if (row.key === "autoCommit") this.settings.autoCommit = row.value === "true";
      if (row.key === "autoFix") this.settings.autoFix = row.value === "true";
      if (row.key === "modelStrategy") this.settings.modelStrategy = row.value as ControlSettings["modelStrategy"];
      if (row.key === "locale") this.settings.locale = row.value;
      if (row.key === "showShortcutHints") this.settings.showShortcutHints = row.value === "true";
      if (row.key === "sendShortcut") this.settings.sendShortcut = row.value as ControlSettings["sendShortcut"];
      if (row.key === "useMixedScript") this.settings.useMixedScript = row.value === "true";
      if (row.key === "preferKanji") this.settings.preferKanji = row.value === "true";
    }
  }

  get() {
    return { ...this.settings };
  }

  async update(patch: Partial<ControlSettings>) {
    if (patch.autoCommit !== undefined) {
      this.settings.autoCommit = patch.autoCommit;
      await this.db.insert(settings).values({ key: "autoCommit", value: String(patch.autoCommit) }).onConflictDoUpdate({
        target: settings.key,
        set: { value: String(patch.autoCommit) },
      }).run();
    }
    if (patch.autoFix !== undefined) {
      this.settings.autoFix = patch.autoFix;
      await this.db.insert(settings).values({ key: "autoFix", value: String(patch.autoFix) }).onConflictDoUpdate({
        target: settings.key,
        set: { value: String(patch.autoFix) },
      }).run();
    }
    if (patch.modelStrategy !== undefined) {
      this.settings.modelStrategy = patch.modelStrategy;
      await this.db.insert(settings).values({ key: "modelStrategy", value: patch.modelStrategy }).onConflictDoUpdate({
        target: settings.key,
        set: { value: patch.modelStrategy },
      }).run();
    }
    if (patch.locale !== undefined) {
      this.settings.locale = patch.locale;
      await this.db.insert(settings).values({ key: "locale", value: patch.locale }).onConflictDoUpdate({
        target: settings.key,
        set: { value: patch.locale },
      }).run();
    }
    if (patch.showShortcutHints !== undefined) {
      this.settings.showShortcutHints = patch.showShortcutHints;
      await this.db.insert(settings).values({ key: "showShortcutHints", value: String(patch.showShortcutHints) }).onConflictDoUpdate({
        target: settings.key,
        set: { value: String(patch.showShortcutHints) },
      }).run();
    }
    if (patch.sendShortcut !== undefined) {
      this.settings.sendShortcut = patch.sendShortcut;
      await this.db.insert(settings).values({ key: "sendShortcut", value: patch.sendShortcut }).onConflictDoUpdate({
        target: settings.key,
        set: { value: patch.sendShortcut },
      }).run();
    }
    if (patch.useMixedScript !== undefined) {
      this.settings.useMixedScript = patch.useMixedScript;
      await this.db.insert(settings).values({ key: "useMixedScript", value: String(patch.useMixedScript) }).onConflictDoUpdate({
        target: settings.key,
        set: { value: String(patch.useMixedScript) },
      }).run();
    }
    if (patch.preferKanji !== undefined) {
      this.settings.preferKanji = patch.preferKanji;
      await this.db.insert(settings).values({ key: "preferKanji", value: String(patch.preferKanji) }).onConflictDoUpdate({
        target: settings.key,
        set: { value: String(patch.preferKanji) },
      }).run();
    }
    return { ...this.settings };
  }
}
