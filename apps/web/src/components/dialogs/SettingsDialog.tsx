import { useState, useEffect, useCallback, useReducer } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Cancel01Icon,
  Settings02Icon,
  SlidersHorizontalIcon,
  InformationCircleIcon,
  NotificationIcon,
  VolumeHighIcon,
  UnfoldMoreIcon,
  Tick02Icon,
  InboxIcon,
  GoogleIcon,
  Edit02Icon,
  EyeIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { Spinner } from "@/components/ui/spinner";
import { AppleSwitch } from "@/components/unlumen-ui/apple-switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n-provider";
import { AVAILABLE_LOCALES } from "@/lib/i18n";
import { playUiSound } from "@/lib/audio";
import { m } from "@/paraglide/messages";
import type { ControlSettings, NotificationEvent, SoundId } from "@/lib/types";
import { NOTIFICATION_EVENTS, AVAILABLE_SOUNDS } from "@/lib/types";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const defaultEventSounds: Record<string, string> = {
  email: "bell",
  calendar: "bell2",
  message: "bell3",
  reminder: "error",
  system: "pop",
  social: "pong",
};

type SettingsTab = "general" | "notifications" | "mail" | "about";

type MailServerConfig = {
  host: string;
  port: number;
  secure: boolean;
};

type SmtpImapConfig = {
  email: string;
  displayName?: string;
  smtp: MailServerConfig;
  imap: MailServerConfig;
  username: string;
  password: string;
};

type MailIntegrationAccount = {
  id: string;
  label: string;
  email?: string;
  username?: string;
  smtpImap?: SmtpImapConfig;
};

type SettingsMailIntegration = {
  id: string;
  name: string;
  accounts?: MailIntegrationAccount[];
};

const tabDefs: { id: SettingsTab; icon: IconSvgElement; labelKey: () => string }[] = [
  { id: "general", icon: SlidersHorizontalIcon, labelKey: m.general },
  { id: "notifications", icon: NotificationIcon, labelKey: m.notifications },
  { id: "mail", icon: InboxIcon, labelKey: m.mail },
  { id: "about", icon: InformationCircleIcon, labelKey: m.about },
];

const ACKNOWLEDGEMENT_LIBRARIES = [
  "Bun",
  "Vite",
  "Cloudflare",
  "Wrangler",
  "TanStack Start",
  "TanStack Router",
  "React",
  "Tailwind CSS",
  "Base UI",
  "Radix UI",
  "shadcn/ui",
  "Motion",
  "Lucide React",
  "React Resizable Panels",
  "React Grab",
  "React Nice Avatar",
  "Zustand",
  "oRPC",
  "AI SDK",
  "Drizzle",
  "Clerk",
  "Paraglide JS",
  "Shiki",
  "React Markdown",
  "Remark GFM",
  "Recharts",
  "Remotion",
  "Remotion Player",
  "Hugeicons",
  "Web Kits Audio",
  "Border Beam",
  "Liveline",
  "class-variance-authority",
  "clsx",
  "zod",
  "Sonner",
  "dotenv",
  "Vitest",
] as const;

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: ControlSettings | null;
  onSettingsChange: (settings: ControlSettings) => void;
  defaultTab?: SettingsTab;
}

export function SettingsDialog({
  open,
  onClose,
  settings,
  onSettingsChange,
  defaultTab,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  useEffect(() => {
    if (open && defaultTab) {
      setActiveTab(defaultTab);
      if (defaultTab === "mail" && !mailState.loadingMail) {
        dispatchMail({ type: "SET_LOADING" });
        api.listIntegrations().then((result) => {
          dispatchMail({ type: "SET_INTEGRATIONS", payload: result.filter((i) => i.id === "gmail" || i.id === "smtp-imap") as SettingsMailIntegration[] });
        }).catch(() => {
          dispatchMail({ type: "LOAD_ERROR" });
        });
      }
    }
  }, [open, defaultTab]);
  const [mailState, dispatchMail] = useReducer(
    (state: { mailIntegrations: SettingsMailIntegration[]; loadingMail: boolean }, action: { type: "SET_LOADING" } | { type: "SET_INTEGRATIONS"; payload: SettingsMailIntegration[] } | { type: "LOAD_ERROR" }) => {
      switch (action.type) {
        case "SET_LOADING":
          return { ...state, loadingMail: true };
        case "SET_INTEGRATIONS":
          return { mailIntegrations: action.payload, loadingMail: false };
        case "LOAD_ERROR":
          return { ...state, loadingMail: false };
      }
    },
    { mailIntegrations: [], loadingMail: false },
  );
  const [editingMailAccount, setEditingMailAccount] = useState<{ integrationId: string; account: MailIntegrationAccount } | null>(null);
  const [editMailForm, setEditMailForm] = useState<{
    label: string;
    email: string;
    username: string;
    displayName: string;
    smtpHost: string;
    smtpPort: string;
    smtpSecure: boolean;
    imapHost: string;
    imapPort: string;
    imapSecure: boolean;
    password: string;
  }>({ label: "", email: "", username: "", displayName: "", smtpHost: "smtp.gmail.com", smtpPort: "587", smtpSecure: false, imapHost: "imap.gmail.com", imapPort: "993", imapSecure: true, password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const { locale: currentLocale, setLocaleWithSync } = useLocale();

  const currentSettings = settings;

  const getSoundLabel = useCallback((soundId: SoundId) => {
    const sound = AVAILABLE_SOUNDS.find((item) => item.id === soundId);
    if (!sound) return m.sound_bell_1();
    return m[sound.labelKey]();
  }, []);

  const handleToggle = async (
    key: keyof Pick<ControlSettings, "showShortcutHints" | "useMixedScript" | "preferKanji">,
  ) => {
    if (!currentSettings) return;
    try {
      const updated = await api.updateSettings({ [key]: !currentSettings[key] });
      const merged = { ...currentSettings, ...updated };
      onSettingsChange(merged);
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  const handleLocaleChange = async (value: string) => {
    if (!currentSettings) return;

    try {
      setLocaleWithSync(value);
      const merged = { ...currentSettings, locale: value };
      onSettingsChange(merged);
    } catch (err) {
      console.error("Failed to update locale:", err);
    }
  };

  const handleNotificationToggle = async (key: "system" | "sound") => {
    if (!currentSettings) return;
    const updated = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        [key]: !currentSettings.notifications[key],
      },
    };
    onSettingsChange(updated);
    try {
      await api.updateSettings({ notifications: updated.notifications });
    } catch (err) {
      console.error("Failed to update notification settings:", err);
    }
  };

  const handleEventSoundToggle = async (event: NotificationEvent) => {
    if (!currentSettings) return;
    const updated = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        eventSounds: {
          ...currentSettings.notifications.eventSounds,
          [event]: !currentSettings.notifications.eventSounds[event],
        },
      },
    };
    onSettingsChange(updated);
    try {
      await api.updateSettings({ notifications: updated.notifications });
    } catch (err) {
      console.error("Failed to update event sound settings:", err);
    }
  };

  const handleEventSoundFileChange = async (event: NotificationEvent, soundId: SoundId) => {
    if (!currentSettings) return;
    const updated = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        eventSoundFiles: {
          ...currentSettings.notifications.eventSoundFiles,
          [event]: soundId,
        },
      },
    };
    onSettingsChange(updated);
    try {
      await api.updateSettings({ notifications: updated.notifications });
    } catch (err) {
      console.error("Failed to update event sound file settings:", err);
    }
  };

  const playSound = (soundId: SoundId) => {
    const sound = AVAILABLE_SOUNDS.find((s) => s.id === soundId);
    if (sound) {
      void playUiSound(sound.id, sound.file || undefined);
    }
  };

  const handleEditMailAccount = useCallback((integrationId: string, account: MailIntegrationAccount) => {
    setEditMailForm({
      label: account.label,
      email: account.email || account.smtpImap?.email || "",
      username: account.username || account.smtpImap?.username || "",
      displayName: account.smtpImap?.displayName || "",
      smtpHost: account.smtpImap?.smtp.host || "smtp.gmail.com",
      smtpPort: String(account.smtpImap?.smtp.port ?? 587),
      smtpSecure: account.smtpImap?.smtp.secure ?? false,
      imapHost: account.smtpImap?.imap.host || "imap.gmail.com",
      imapPort: String(account.smtpImap?.imap.port ?? 993),
      imapSecure: account.smtpImap?.imap.secure ?? true,
      password: account.smtpImap?.password || "",
    });
    setEditingMailAccount({ integrationId, account });
  }, []);

  const handleSaveMailAccount = useCallback(async () => {
    if (!editingMailAccount) return;
    try {
      const smtpPort = parseInt(editMailForm.smtpPort, 10);
      const imapPort = parseInt(editMailForm.imapPort, 10);
      const updated = await api.updateIntegrationAccount(editingMailAccount.integrationId, editingMailAccount.account.id, {
        label: editMailForm.label,
        email: editMailForm.email,
        username: editMailForm.username || undefined,
        smtpImap: {
          email: editMailForm.email,
          displayName: editMailForm.displayName || undefined,
          username: editMailForm.username,
          password: editMailForm.password,
          smtp: { host: editMailForm.smtpHost, port: isNaN(smtpPort) ? 587 : smtpPort, secure: editMailForm.smtpSecure },
          imap: { host: editMailForm.imapHost, port: isNaN(imapPort) ? 993 : imapPort, secure: editMailForm.imapSecure },
        },
      });
      dispatchMail({ type: "SET_INTEGRATIONS", payload: mailState.mailIntegrations.map((i) => (i.id === updated.id ? updated : i)) });
      setEditingMailAccount(null);
    } catch (err) {
      console.error("Failed to update mail account:", err);
    }
  }, [editingMailAccount, editMailForm]);

  const handleDeleteMailAccount = useCallback(async (integrationId: string, accountId: string) => {
    try {
      const updated = await api.deleteIntegrationAccount(integrationId, accountId);
      dispatchMail({ type: "SET_INTEGRATIONS", payload: mailState.mailIntegrations.map((i) => (i.id === updated.id ? updated : i)) });
    } catch (err) {
      console.error("Failed to delete mail account:", err);
    }
  }, []);

  if (!open) return null;

  if (!currentSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex h-[600px] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Left: Tabs */}
        <div className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30">
          <div className="flex h-12 items-center px-4">
            <HugeiconsIcon icon={Settings02Icon} className="mr-2 size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{m.settings()}</span>
          </div>
          <nav className="flex-1 space-y-0.5 px-2 py-1">
            {tabDefs.map((tab) => {
              const Icon = tab.icon;
              return (
                   <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === "mail" && !mailState.loadingMail) {
                        dispatchMail({ type: "SET_LOADING" });
                        api.listIntegrations().then((result) => {
                          dispatchMail({ type: "SET_INTEGRATIONS", payload: result.filter((i) => i.id === "gmail" || i.id === "smtp-imap") as SettingsMailIntegration[] });
                        }).catch(() => {
                          dispatchMail({ type: "LOAD_ERROR" });
                        });
                      }
                    }}
                   className={cn(
                     "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                     activeTab === tab.id
                       ? "bg-accent text-accent-foreground"
                       : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                   )}
                 >
                  <HugeiconsIcon icon={Icon} className="size-4" />
                  {tab.labelKey()}
                </button>
              );
            })}
          </nav>
          <div className="flex justify-center border-t border-border p-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex h-12 items-center justify-between border-b border-border px-6">
            <h2 className="text-sm font-semibold text-foreground">
              {tabDefs.find((t) => t.id === activeTab)?.labelKey()}
            </h2>
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="ghost" size="icon-sm" onClick={onClose}>
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </Button>}
              />
              <TooltipContent side="top">{m.close()}</TooltipContent>
            </Tooltip>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "general" && (
              <div className="space-y-6">
                {/* Shortcut Hints */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">{m.shortcut_hints()}</span>
                    <p className="text-xs text-muted-foreground">{m.shortcut_hints_desc()}</p>
                  </div>
                  <AppleSwitch
                    checked={currentSettings.showShortcutHints}
                    onCheckedChange={() => void handleToggle("showShortcutHints")}
                    size="sm"
                    aria-label={m.shortcut_hints()}
                  />
                </div>

                {/* Language */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">{m.language()}</span>
                    <p className="text-xs text-muted-foreground">{m.language_desc()}</p>
                  </div>
                  <Select
                    value={currentLocale}
                    onValueChange={(value) => value && void handleLocaleChange(value)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue>
                        {AVAILABLE_LOCALES.find((l) => l.value === currentLocale)?.label ||
                          AVAILABLE_LOCALES[0].label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {AVAILABLE_LOCALES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Korean Mixed Script Toggle */}
                {currentLocale === "ko" && (
                  <div className="flex items-center justify-between">
                    <div className="max-w-[280px]">
                      <span className="text-sm font-medium text-foreground">{m.use_mixed_script()}</span>
                      <p className="text-xs text-muted-foreground">{m.use_mixed_script_desc()}</p>
                    </div>
                    <AppleSwitch
                      checked={Boolean(currentSettings.useMixedScript)}
                      onCheckedChange={() => void handleToggle("useMixedScript")}
                      size="sm"
                      aria-label={m.use_mixed_script()}
                    />
                  </div>
                )}

                {/* Japanese Kanji Preference */}
                {currentLocale === "ja" && (
                  <div className="flex items-center justify-between">
                    <div className="max-w-[280px]">
                      <span className="text-sm font-medium text-foreground">{m.prefer_kanji()}</span>
                      <p className="text-xs text-muted-foreground">{m.prefer_kanji_desc()}</p>
                    </div>
                    <AppleSwitch
                      checked={Boolean(currentSettings.preferKanji)}
                      onCheckedChange={() => void handleToggle("preferKanji")}
                      size="sm"
                      aria-label={m.prefer_kanji()}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                {/* System Notifications */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">
                      {m.system_notifications()}
                    </span>
                    <p className="text-xs text-muted-foreground">{m.system_notifications_desc()}</p>
                  </div>
                  <AppleSwitch
                    checked={Boolean(currentSettings.notifications?.system)}
                    onCheckedChange={() => void handleNotificationToggle("system")}
                    size="sm"
                    aria-label={m.system_notifications()}
                  />
                </div>
                {/* Per-Event Sound Config */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">{m.event_sounds()}</span>
                  <p className="text-xs text-muted-foreground">{m.event_sounds_desc()}</p>
                  <div className="space-y-1.5 pt-1">
                    {NOTIFICATION_EVENTS.map((event) => {
                      const currentSoundId =
                        currentSettings.notifications?.eventSoundFiles?.[event.id] ||
                        (defaultEventSounds[event.id] as SoundId) ||
                        "bell";
                      const isEnabled =
                        currentSettings.notifications?.eventSounds?.[event.id] !== false;
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-2.5"
                        >
                          <span className="text-sm text-foreground min-w-[120px]">
                            {m[event.labelKey]()}
                          </span>
                          <div className="flex items-center gap-2 flex-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                disabled={!isEnabled}
                                className={cn(
                                  "flex items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent h-7 px-2.5 text-xs min-w-[100px]",
                                  !isEnabled && "cursor-not-allowed opacity-50",
                                )}
                                >
                                  <span className="truncate">
                                  {getSoundLabel(currentSoundId)}
                                  </span>
                                <HugeiconsIcon
                                  icon={UnfoldMoreIcon}
                                  className="size-3 text-muted-foreground"
                                />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-[140px] p-1">
                                {AVAILABLE_SOUNDS.map((sound) => (
                                  <div
                                    key={sound.id}
                                    className={cn(
                                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                                      sound.id === currentSoundId
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-accent/50 cursor-pointer",
                                    )}
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      if ((e.target as HTMLElement).closest(".play-btn")) return;
                                      handleEventSoundFileChange(event.id, sound.id);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        if ((e.target as HTMLElement).closest(".play-btn")) return;
                                        handleEventSoundFileChange(event.id, sound.id);
                                      }
                                    }}
                                  >
                                    <button
                                      onClick={() => playSound(sound.id)}
                                      className="play-btn rounded p-0.5 hover:bg-muted transition-colors"
                                      type="button"
                                    >
                                      <HugeiconsIcon icon={VolumeHighIcon} className="size-3.5" />
                                    </button>
                                    <span className="flex-1 select-none">{m[sound.labelKey]()}</span>
                                    {sound.id === currentSoundId && (
                                      <HugeiconsIcon
                                        icon={Tick02Icon}
                                        className="size-3 text-primary"
                                      />
                                    )}
                                  </div>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <AppleSwitch
                            checked={isEnabled}
                            onCheckedChange={() => void handleEventSoundToggle(event.id)}
                            size="sm"
                            aria-label={m[event.labelKey]()}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "mail" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">{m.mail_accounts()}</span>
                    <p className="text-xs text-muted-foreground">{m.mail_accounts_desc()}</p>
                  </div>
                </div>

                {mailState.loadingMail ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="sm" />
                  </div>
                ) : mailState.mailIntegrations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/50 py-6 text-center">
                    <HugeiconsIcon icon={InboxIcon} className="mx-auto size-5 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">{m.no_mail_accounts_configured()}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {m.mail_accounts_empty_hint()}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mailState.mailIntegrations.map((integration) => (
                      <div key={integration.id} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <HugeiconsIcon icon={integration.id === "google-mail" ? GoogleIcon : InboxIcon} className="size-4" />
                          {integration.name}
                        </div>
                        {integration.accounts && integration.accounts.length > 0 ? (
                          <div className="space-y-1.5 pl-6">
                            {integration.accounts.map((account) => (
                              <div key={account.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                                <div className="min-w-0">
                                  <div className="text-sm text-foreground truncate">{account.label}</div>
                                  <div className="text-xs text-muted-foreground truncate">{account.email || account.username}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={<Button variant="ghost" size="icon-xs" onClick={() => handleEditMailAccount(integration.id, account)}>
                                        <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                                      </Button>}
                                    />
                                    <TooltipContent side="top">{m.edit()}</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={<Button variant="ghost" size="icon-xs" onClick={() => handleDeleteMailAccount(integration.id, account.id)}>
                                        <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                                      </Button>}
                                    />
                                    <TooltipContent side="top">{m.delete()}</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground pl-6">{m.no_accounts()}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <AppDialog
                  open={editingMailAccount !== null}
                  onOpenChange={(open) => { if (!open) setEditingMailAccount(null); }}
                  title={m.edit_mail_account()}
                  size="lg"
                  nested
                  footer={
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditingMailAccount(null)}>{m.cancel()}</Button>
                      <Button type="button" onClick={handleSaveMailAccount}>{m.save()}</Button>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">{m.email()}</span>
                      <input
                        value={editMailForm.email}
                        onChange={(e) => setEditMailForm((f) => ({ ...f, email: e.target.value, username: f.username || e.target.value }))}
                        placeholder={m.email_placeholder()}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">{m.display_name()}</span>
                      <input
                        value={editMailForm.displayName}
                        onChange={(e) => setEditMailForm((f) => ({ ...f, displayName: e.target.value }))}
                        placeholder={m.display_name_placeholder()}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">{m.username()}</span>
                      <input
                        value={editMailForm.username}
                        onChange={(e) => setEditMailForm((f) => ({ ...f, username: e.target.value }))}
                        placeholder={m.username_placeholder()}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">{m.password()}</span>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={editMailForm.password}
                          onChange={(e) => setEditMailForm((f) => ({ ...f, password: e.target.value }))}
                          placeholder={m.password_placeholder()}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 pr-9 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          <HugeiconsIcon icon={showPassword ? ViewOffSlashIcon : EyeIcon} className="size-4" />
                        </button>
                      </div>
                    </label>

                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">{m.smtp_configuration()}</p>
                      <div className="space-y-3">
                        <label className="grid gap-1.5 text-sm">
                          <span className="text-muted-foreground">{m.smtp_host()}</span>
                          <input
                            value={editMailForm.smtpHost}
                            onChange={(e) => setEditMailForm((f) => ({ ...f, smtpHost: e.target.value }))}
                            placeholder="smtp.gmail.com"
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="grid gap-1.5 text-sm">
                            <span className="text-muted-foreground">{m.smtp_port()}</span>
                            <input
                              value={editMailForm.smtpPort}
                              onChange={(e) => setEditMailForm((f) => ({ ...f, smtpPort: e.target.value }))}
                              placeholder="587"
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm pt-5">
                            <input
                              type="checkbox"
                              checked={editMailForm.smtpSecure}
                              onChange={(e) => setEditMailForm((f) => ({ ...f, smtpSecure: e.target.checked }))}
                              className="rounded border-border"
                            />
                            <span className="text-muted-foreground">{m.use_tls_smtp()}</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">{m.imap_configuration()}</p>
                      <div className="space-y-3">
                        <label className="grid gap-1.5 text-sm">
                          <span className="text-muted-foreground">{m.imap_host()}</span>
                          <input
                            value={editMailForm.imapHost}
                            onChange={(e) => setEditMailForm((f) => ({ ...f, imapHost: e.target.value }))}
                            placeholder="imap.gmail.com"
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="grid gap-1.5 text-sm">
                            <span className="text-muted-foreground">{m.imap_port()}</span>
                            <input
                              value={editMailForm.imapPort}
                              onChange={(e) => setEditMailForm((f) => ({ ...f, imapPort: e.target.value }))}
                              placeholder="993"
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm pt-5">
                            <input
                              type="checkbox"
                              checked={editMailForm.imapSecure}
                              onChange={(e) => setEditMailForm((f) => ({ ...f, imapSecure: e.target.checked }))}
                              className="rounded border-border"
                            />
                            <span className="text-muted-foreground">{m.use_tls_imap()}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </AppDialog>
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img src="/logo.svg" alt="OrchOS" className="size-10" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">OrchOS</p>
                    <p className="text-xs text-muted-foreground">v1.0.0</p>
                  </div>
                </div>
                <div className="rounded-lg p-4">
                  <p className="text-sm font-medium text-foreground">{m.about_project_summary_title()}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{m.orchos_desc()}</p>
                </div>
                <div className="rounded-lg p-4">
                  <p className="text-sm font-medium text-foreground">{m.about_acknowledgements_title()}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {m.about_acknowledgements_desc()}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ACKNOWLEDGEMENT_LIBRARIES.map((library) => (
                      <span
                        key={library}
                        className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-foreground"
                      >
                        {library}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
