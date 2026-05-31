import {
  useState,
  useEffect,
  useCallback,
  useReducer,
  useRef,
  type ChangeEvent,
} from "react";
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
  Edit02Icon,
  EyeIcon,
  ViewOffSlashIcon,
  CommandIcon,
  DatabaseIcon,
  Download01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  EMAIL_PROVIDERS,
  CUSTOM_PROVIDER_ID,
  getEmailProvider,
} from "@/lib/email-providers";
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
import type { Locale } from "@/lib/i18n";
import { useUIStore } from "@/lib/store";
import { playUiSound } from "@/lib/audio";
import {
  about,
  about_acknowledgements_desc,
  about_acknowledgements_title,
  about_project_summary_title,
  cancel,
  close,
  delete as delete_message,
  data,
  data_control_desc,
  data_control_title,
  data_export_button,
  data_export_desc,
  data_export_error,
  data_export_success,
  data_export_title,
  data_exporting,
  data_import_button,
  data_import_confirm,
  data_import_desc,
  data_import_error,
  data_import_success,
  data_import_title,
  data_importing,
  data_sensitive_hint,
  display_name,
  display_name_placeholder,
  edit,
  edit_mail_account,
  email,
  email_placeholder,
  event_calendar,
  event_email,
  event_message,
  event_reminder,
  event_social,
  event_sounds,
  event_sounds_desc,
  event_system,
  general,
  imap_configuration,
  imap_host,
  imap_port,
  language,
  language_desc,
  mail,
  mail_accounts,
  mail_accounts_desc,
  mail_accounts_empty_hint,
  no_accounts,
  no_mail_accounts_configured,
  notifications,
  orchos_desc,
  password,
  password_placeholder,
  prefer_kanji,
  prefer_kanji_desc,
  save,
  settings as settings_label,
  shortcut_hints,
  shortcut_hints_desc,
  shortcuts,
  shortcuts_enter,
  shortcuts_send_message,
  shortcuts_send_message_desc,
  smtp_configuration,
  smtp_host,
  smtp_port,
  sound_bell_1,
  sound_bell_2,
  sound_bell_3,
  sound_error,
  sound_pop,
  sound_pong,
  sound_ring_1,
  sound_ring_2,
  system_notifications,
  system_notifications_desc,
  notification_permission_denied,
  notification_test_send,
  notification_test_send_desc,
  notification_test_sent,
  notification_test_failed,
  use_mixed_script,
  use_mixed_script_desc,
  use_tls_imap,
  use_tls_smtp,
  username,
  username_placeholder,
  email_provider,
} from "@/paraglide/messages";
import type { ControlSettings, NotificationEvent, SoundId } from "@/lib/types";
import { NOTIFICATION_EVENTS, AVAILABLE_SOUNDS } from "@/lib/types";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  ensureSystemNotificationAccess,
  sendTestNotification,
  canUseNotifications,
  getNotificationPermissionState,
} from "@/lib/notifications";

const defaultEventSounds: Record<string, string> = {
  email: "bell",
  calendar: "bell2",
  message: "bell3",
  reminder: "error",
  system: "pop",
  social: "pong",
};

type SettingsTab =
  | "general"
  | "notifications"
  | "mail"
  | "data"
  | "shortcuts"
  | "about";

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

const tabDefs: {
  id: SettingsTab;
  icon: IconSvgElement;
  labelKey: () => string;
}[] = [
  { id: "general", icon: SlidersHorizontalIcon, labelKey: general },
  { id: "notifications", icon: NotificationIcon, labelKey: notifications },
  { id: "mail", icon: InboxIcon, labelKey: mail },
  { id: "data", icon: DatabaseIcon, labelKey: data },
  { id: "shortcuts", icon: CommandIcon, labelKey: shortcuts },
  { id: "about", icon: InformationCircleIcon, labelKey: about },
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

const EVENT_LABELS: Record<NotificationEvent, () => string> = {
  email: event_email,
  calendar: event_calendar,
  message: event_message,
  reminder: event_reminder,
  system: event_system,
  social: event_social,
};

const SOUND_LABELS: Record<SoundId, () => string> = {
  bell: sound_bell_1,
  bell2: sound_bell_2,
  bell3: sound_bell_3,
  error: sound_error,
  pop: sound_pop,
  pong: sound_pong,
  ring: sound_ring_1,
  ring2: sound_ring_2,
};

function ShortcutKeycaps({ value }: { value: "enter" | "cmd-enter" }) {
  const keys =
    value === "cmd-enter"
      ? [
          { id: "cmd", display: "⌘", label: "Command" },
          { id: "enter", display: "↵", label: shortcuts_enter() },
        ]
      : [{ id: "enter", display: "↵", label: shortcuts_enter() }];

  return (
    <span className="flex items-center gap-1.5">
      {keys.map((key) => (
        <kbd
          key={key.id}
          aria-label={key.label}
          title={key.label}
          className="inline-flex min-w-8 items-center justify-center rounded-md border border-border/80 bg-muted/60 px-2 py-1 text-[11px] font-medium leading-none text-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]"
        >
          {key.display}
        </kbd>
      ))}
    </span>
  );
}

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
  const activeTab = useUIStore((s) => s.settingsDialogTab) as SettingsTab;
  const setActiveTab = useUIStore((s) => s.setSettingsDialogTab);
  const [mailState, dispatchMail] = useReducer(
    (
      state: {
        mailIntegrations: SettingsMailIntegration[];
        loadingMail: boolean;
      },
      action:
        | { type: "SET_LOADING" }
        | { type: "SET_INTEGRATIONS"; payload: SettingsMailIntegration[] }
        | { type: "LOAD_ERROR" },
    ) => {
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

  // oxlint-disable-next-line react-doctor/no-event-handler -- dialog-open with deep-link tab requires initialization
  useEffect(() => {
    if (open && defaultTab) {
      setActiveTab(defaultTab);
      if (defaultTab === "mail" && !mailState.loadingMail) {
        dispatchMail({ type: "SET_LOADING" });
        api
          .listIntegrations()
          .then((result) => {
            dispatchMail({
              type: "SET_INTEGRATIONS",
              payload: result.filter(
                (i) => i.id === "smtp-imap",
              ) as SettingsMailIntegration[],
            });
          })
          .catch(() => {
            dispatchMail({ type: "LOAD_ERROR" });
          });
      }
    }
  }, [open, defaultTab]);

  const [editingMailAccount, setEditingMailAccount] = useState<{
    integrationId: string;
    account: MailIntegrationAccount;
  } | null>(null);
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
  }>({
    label: "",
    email: "",
    username: "",
    displayName: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpSecure: false,
    imapHost: "imap.gmail.com",
    imapPort: "993",
    imapSecure: true,
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedEditProviderId, setSelectedEditProviderId] = useState<string>(
    EMAIL_PROVIDERS[0].id,
  );
  const dataImportInputRef = useRef<HTMLInputElement | null>(null);
  const [dataTransferState, setDataTransferState] = useState<
    | "idle"
    | "exporting"
    | "importing"
    | "exported"
    | "imported"
    | "export_error"
    | "import_error"
  >("idle");
  const { locale: currentLocale, setLocaleWithSync } = useLocale();

  /** Try to match current SMTP/IMAP settings to a known provider */
  function detectProvider(
    host: string,
    port: number,
    imapHost: string,
  ): string {
    const match = EMAIL_PROVIDERS.find(
      (p) =>
        p.smtp.host === host &&
        p.smtp.port === port &&
        p.imap.host === imapHost,
    );
    return match?.id ?? CUSTOM_PROVIDER_ID;
  }

  /** Apply a provider's settings to the edit form */
  function applyProviderToEditForm(providerId: string | null) {
    if (!providerId) return;
    setSelectedEditProviderId(providerId);
    const provider = getEmailProvider(providerId);
    if (provider) {
      setEditMailForm((f) => ({
        ...f,
        smtpHost: provider.smtp.host,
        smtpPort: String(provider.smtp.port),
        smtpSecure: provider.smtp.secure,
        imapHost: provider.imap.host,
        imapPort: String(provider.imap.port),
        imapSecure: provider.imap.secure,
      }));
    }
  }

  const currentSettings = settings;

  const getSoundLabel = useCallback((soundId: SoundId) => {
    return (SOUND_LABELS[soundId] ?? sound_bell_1)();
  }, []);

  const handleToggle = async (
    key: keyof Pick<
      ControlSettings,
      "showShortcutHints" | "useMixedScript" | "preferKanji"
    >,
  ) => {
    if (!currentSettings) return;
    try {
      const updated = await api.updateSettings({
        [key]: !currentSettings[key],
      });
      const merged = { ...currentSettings, ...updated };
      onSettingsChange(merged);
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  const handleLocaleChange = async (value: Locale) => {
    if (!currentSettings) return;

    try {
      setLocaleWithSync(value);
      const merged = { ...currentSettings, locale: value };
      onSettingsChange(merged);
    } catch (err) {
      console.error("Failed to update locale:", err);
    }
  };

  const handleSendShortcutChange = (value: "enter" | "cmd-enter") => {
    if (!currentSettings) return;
    const merged = { ...currentSettings, sendShortcut: value };
    onSettingsChange(merged);
  };

  const handleNotificationToggle = async (key: "system" | "sound") => {
    if (!currentSettings) return;

    const newValue = !(currentSettings.notifications?.[key] ?? false);

    // When enabling system notifications, request browser permission first
    if (key === "system" && newValue) {
      const result = await ensureSystemNotificationAccess();
      if (!result.granted) {
        console.error(notification_permission_denied());
        // Force re-render so AppleSwitch snaps back to OFF
        onSettingsChange({ ...currentSettings });
        return;
      }
      // Permission granted, but test notification may have failed due to
      // lost user gesture after the async permission dialog.
      // The manual test button can be used to verify.
      if (!result.testSent) {
        console.warn(
          "[OrchOS] Test notification may have failed due to lost user gesture. " +
            "Use the 'Send Test' button to verify notifications are working.",
        );
      }
    }

    const updated = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        [key]: newValue,
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
          ...currentSettings.notifications?.eventSounds,
          [event]: !(
            currentSettings.notifications?.eventSounds?.[event] ?? false
          ),
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

  const handleEventSoundFileChange = async (
    event: NotificationEvent,
    soundId: SoundId,
  ) => {
    if (!currentSettings) return;
    const updated = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        eventSoundFiles: {
          ...currentSettings.notifications?.eventSoundFiles,
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

  const handleEditMailAccount = useCallback(
    (integrationId: string, account: MailIntegrationAccount) => {
      const smtpHost = account.smtpImap?.smtp.host || "smtp.gmail.com";
      const smtpPort = account.smtpImap?.smtp.port ?? 587;
      const imapHost = account.smtpImap?.imap.host || "imap.gmail.com";
      setEditMailForm({
        label: account.label,
        email: account.email || account.smtpImap?.email || "",
        username: account.username || account.smtpImap?.username || "",
        displayName: account.smtpImap?.displayName || "",
        smtpHost,
        smtpPort: String(smtpPort),
        smtpSecure: account.smtpImap?.smtp.secure ?? false,
        imapHost,
        imapPort: String(account.smtpImap?.imap.port ?? 993),
        imapSecure: account.smtpImap?.imap.secure ?? true,
        password: account.smtpImap?.password || "",
      });
      setSelectedEditProviderId(detectProvider(smtpHost, smtpPort, imapHost));
      setEditingMailAccount({ integrationId, account });
    },
    [],
  );

  const handleSaveMailAccount = useCallback(async () => {
    if (!editingMailAccount) return;
    try {
      const smtpPort = parseInt(editMailForm.smtpPort, 10);
      const imapPort = parseInt(editMailForm.imapPort, 10);
      const smtpImap = {
        email: editMailForm.email,
        displayName: editMailForm.displayName || undefined,
        username: editMailForm.username,
        password: editMailForm.password,
        smtp: {
          host: editMailForm.smtpHost,
          port: isNaN(smtpPort) ? 587 : smtpPort,
          secure: editMailForm.smtpSecure,
        },
        imap: {
          host: editMailForm.imapHost,
          port: isNaN(imapPort) ? 993 : imapPort,
          secure: editMailForm.imapSecure,
        },
      };

      let updated: SettingsMailIntegration;

      if (!editingMailAccount.account?.id) {
        // Creating a new SMTP/IMAP account
        updated = await api.createSmtpImapAccount(smtpImap);
        const allIntegrations = await api.listIntegrations();
        const mailIntegrations = allIntegrations.filter(
          (i) => i.id === "smtp-imap",
        ) as SettingsMailIntegration[];
        dispatchMail({ type: "SET_INTEGRATIONS", payload: mailIntegrations });
      } else {
        // Updating an existing account
        updated = await api.updateIntegrationAccount(
          editingMailAccount.integrationId,
          editingMailAccount.account.id,
          {
            label: editMailForm.label,
            email: editMailForm.email,
            username: editMailForm.username || undefined,
            smtpImap,
          },
        );
        dispatchMail({
          type: "SET_INTEGRATIONS",
          payload: mailState.mailIntegrations.map((i) =>
            i.id === updated.id ? updated : i,
          ),
        });
      }
      setEditingMailAccount(null);
    } catch (err) {
      console.error("Failed to save mail account:", err);
    }
  }, [editingMailAccount, editMailForm, mailState.mailIntegrations, selectedEditProviderId]);

  const handleDeleteMailAccount = useCallback(
    async (integrationId: string, accountId: string) => {
      try {
        const updated = await api.deleteIntegrationAccount(
          integrationId,
          accountId,
        );
        dispatchMail({
          type: "SET_INTEGRATIONS",
          payload: mailState.mailIntegrations.map((i) =>
            i.id === updated.id ? updated : i,
          ),
        });
      } catch (err) {
        console.error("Failed to delete mail account:", err);
      }
    },
    [mailState.mailIntegrations],
  );

  /** Open the edit dialog in "create" mode for a new SMTP/IMAP account. */
  function openNewSmtpAccount() {
    setEditMailForm({
      label: "",
      email: "",
      username: "",
      displayName: "",
      smtpHost: EMAIL_PROVIDERS[0].smtp.host,
      smtpPort: String(EMAIL_PROVIDERS[0].smtp.port),
      smtpSecure: EMAIL_PROVIDERS[0].smtp.secure,
      imapHost: EMAIL_PROVIDERS[0].imap.host,
      imapPort: String(EMAIL_PROVIDERS[0].imap.port),
      imapSecure: EMAIL_PROVIDERS[0].imap.secure,
      password: "",
    });
    setSelectedEditProviderId(EMAIL_PROVIDERS[0].id);
    // Use a special marker so handleSaveMailAccount knows to create instead of update
    setEditingMailAccount({ integrationId: "smtp-imap", account: null as unknown as MailIntegrationAccount });
  }

  const handleExportPlatformData = useCallback(async () => {
    setDataTransferState("exporting");

    try {
      const payload = await api.exportPlatformData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orchos-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDataTransferState("exported");
    } catch (error) {
      console.error("Failed to export platform data:", error);
      setDataTransferState("export_error");
    }
  }, []);

  const handleImportPlatformDataFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      if (!window.confirm(data_import_confirm())) {
        return;
      }

      setDataTransferState("importing");

      try {
        const payload = JSON.parse(await file.text());
        await api.importPlatformData(payload);
        setDataTransferState("imported");
        window.setTimeout(() => window.location.reload(), 800);
      } catch (error) {
        console.error("Failed to import platform data:", error);
        setDataTransferState("import_error");
      }
    },
    [],
  );

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-[600px] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Left: Tabs */}
        <div className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30">
          <div className="flex h-12 items-center px-4">
            <HugeiconsIcon
              icon={Settings02Icon}
              className="mr-2 size-4 text-muted-foreground"
            />
            <span className="text-sm font-semibold text-foreground">
              {settings_label()}
            </span>
          </div>
          <nav className="flex-1 space-y-0.5 px-2 py-1">
            {tabDefs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "mail" && !mailState.loadingMail) {
                      dispatchMail({ type: "SET_LOADING" });
                      api
                        .listIntegrations()
                        .then((result) => {
                          dispatchMail({
                            type: "SET_INTEGRATIONS",
                            payload: result.filter(
                              (i) => i.id === "smtp-imap" || i.id === "gmail",
                            ) as SettingsMailIntegration[],
                          });
                        })
                        .catch(() => {
                          dispatchMail({ type: "LOAD_ERROR" });
                        });
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer outline-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2",
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
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label={close()}
              className="shrink-0 text-muted-foreground/60 hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M4 4L10 10M10 4L4 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </Button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "general" && (
              <div className="space-y-6">
                {/* Shortcut Hints */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">
                      {shortcut_hints()}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {shortcut_hints_desc()}
                    </p>
                  </div>
                  <AppleSwitch
                    checked={currentSettings.showShortcutHints}
                    onCheckedChange={() =>
                      void handleToggle("showShortcutHints")
                    }
                    size="sm"
                    aria-label={shortcut_hints()}
                  />
                </div>

                {/* Language */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">
                      {language()}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {language_desc()}
                    </p>
                  </div>
                  <Select
                    value={currentLocale}
                    onValueChange={(value) =>
                      value && void handleLocaleChange(value)
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue>
                        {AVAILABLE_LOCALES.find(
                          (l) => l.value === currentLocale,
                        )?.label || AVAILABLE_LOCALES[0].label}
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
                      <span className="text-sm font-medium text-foreground">
                        {use_mixed_script()}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {use_mixed_script_desc()}
                      </p>
                    </div>
                    <AppleSwitch
                      checked={Boolean(currentSettings.useMixedScript)}
                      onCheckedChange={() =>
                        void handleToggle("useMixedScript")
                      }
                      size="sm"
                      aria-label={use_mixed_script()}
                    />
                  </div>
                )}

                {/* Japanese Kanji Preference */}
                {currentLocale === "ja" && (
                  <div className="flex items-center justify-between">
                    <div className="max-w-[280px]">
                      <span className="text-sm font-medium text-foreground">
                        {prefer_kanji()}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {prefer_kanji_desc()}
                      </p>
                    </div>
                    <AppleSwitch
                      checked={Boolean(currentSettings.preferKanji)}
                      onCheckedChange={() => void handleToggle("preferKanji")}
                      size="sm"
                      aria-label={prefer_kanji()}
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
                      {system_notifications()}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {system_notifications_desc()}
                    </p>
                  </div>
                  <AppleSwitch
                    checked={Boolean(currentSettings.notifications?.system)}
                    onCheckedChange={() =>
                      void handleNotificationToggle("system")
                    }
                    size="sm"
                    aria-label={system_notifications()}
                  />
                </div>
                {/* Test Notification */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">
                      {notification_test_send()}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {notification_test_send_desc()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      !canUseNotifications() ||
                      getNotificationPermissionState() !== "granted"
                    }
                    onClick={() => {
                      const result = sendTestNotification();
                      if (result.sent) {
                        console.log(notification_test_sent());
                      } else if (result.reason === "denied") {
                        console.error(notification_permission_denied());
                      } else {
                        console.error(notification_test_failed());
                      }
                    }}
                  >
                    {notification_test_send()}
                  </Button>
                </div>
                {/* Per-Event Sound Config */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    {event_sounds()}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {event_sounds_desc()}
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {NOTIFICATION_EVENTS.map((event) => {
                      const currentSoundId =
                        currentSettings.notifications?.eventSoundFiles?.[
                          event.id
                        ] ||
                        (defaultEventSounds[event.id] as SoundId) ||
                        "bell";
                      const isEnabled =
                        currentSettings.notifications?.eventSounds?.[
                          event.id
                        ] !== false;
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-2.5"
                        >
                          <span className="text-sm text-foreground min-w-[120px]">
                            {EVENT_LABELS[event.id]()}
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
                                  /* oxlint-disable-next-line react-doctor/prefer-tag-over-role -- contains nested play button, invalid to nest <button> */
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    key={sound.id}
                                    className={cn(
                                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2",
                                      sound.id === currentSoundId
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-accent/50 cursor-pointer",
                                    )}
                                    onClick={(e) => {
                                      if (
                                        (e.target as HTMLElement).closest(
                                          ".play-btn",
                                        )
                                      )
                                        return;
                                      handleEventSoundFileChange(
                                        event.id,
                                        sound.id,
                                      );
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        if (
                                          (e.target as HTMLElement).closest(
                                            ".play-btn",
                                          )
                                        )
                                          return;
                                        handleEventSoundFileChange(
                                          event.id,
                                          sound.id,
                                        );
                                      }
                                    }}
                                  >
                                    <button
                                      onClick={() => playSound(sound.id)}
                                      className="play-btn rounded p-0.5 hover:bg-muted transition-colors outline-none focus-visible:outline-dashed focus-visible:outline-[0.5px] focus-visible:outline-blue-500 focus-visible:outline-offset-2"
                                      type="button"
                                    >
                                      <HugeiconsIcon
                                        icon={VolumeHighIcon}
                                        className="size-3.5"
                                      />
                                    </button>
                                    <span className="flex-1 select-none">
                                      {getSoundLabel(sound.id)}
                                    </span>
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
                            onCheckedChange={() =>
                              void handleEventSoundToggle(event.id)
                            }
                            size="sm"
                            aria-label={EVENT_LABELS[event.id]()}
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
                    <span className="text-sm font-medium text-foreground">
                      {mail_accounts()}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {mail_accounts_desc()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openNewSmtpAccount}
                  >
                    <HugeiconsIcon icon={Edit02Icon} className="size-3.5 mr-1.5" />
                    Add SMTP/IMAP
                  </Button>
                </div>

                {mailState.loadingMail ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="sm" />
                  </div>
                ) : mailState.mailIntegrations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/50 py-6 text-center">
                    <HugeiconsIcon
                      icon={InboxIcon}
                      className="mx-auto size-5 text-muted-foreground/30 mb-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      {no_mail_accounts_configured()}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {mail_accounts_empty_hint()}
                    </p>
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openNewSmtpAccount}
                      >
                        <HugeiconsIcon icon={Edit02Icon} className="size-3.5 mr-1.5" />
                        Add SMTP/IMAP
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mailState.mailIntegrations.map((integration) => (
                      <div key={integration.id} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <HugeiconsIcon icon={InboxIcon} className="size-4" />
                          {integration.name}
                        </div>
                        {integration.accounts &&
                        integration.accounts.length > 0 ? (
                          <div className="space-y-1.5 pl-6">
                            {integration.accounts.map((account) => (
                              <div
                                key={account.id}
                                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm text-foreground truncate">
                                    {account.label}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {account.email || account.username}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          variant="ghost"
                                          size="icon-xs"
                                          onClick={() =>
                                            handleEditMailAccount(
                                              integration.id,
                                              account,
                                            )
                                          }
                                        >
                                          <HugeiconsIcon
                                            icon={Edit02Icon}
                                            className="size-3.5"
                                          />
                                        </Button>
                                      }
                                    />
                                    <TooltipContent side="top">
                                      {edit()}
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          variant="ghost"
                                          size="icon-xs"
                                          onClick={() =>
                                            handleDeleteMailAccount(
                                              integration.id,
                                              account.id,
                                            )
                                          }
                                        >
                                          <HugeiconsIcon
                                            icon={Cancel01Icon}
                                            className="size-3.5"
                                          />
                                        </Button>
                                      }
                                    />
                                    <TooltipContent side="top">
                                      {delete_message()}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground pl-6">
                            {no_accounts()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <AppDialog
                  open={editingMailAccount !== null}
                  onOpenChange={(open) => {
                    if (!open) setEditingMailAccount(null);
                  }}
                  title={edit_mail_account()}
                  size="lg"
                  nested
                  footer={
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingMailAccount(null)}
                      >
                        {cancel()}
                      </Button>
                      <Button type="button" onClick={handleSaveMailAccount}>
                        {save()}
                      </Button>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">{email()}</span>
                      <input
                        value={editMailForm.email}
                        onChange={(e) =>
                          setEditMailForm((f) => ({
                            ...f,
                            email: e.target.value,
                            username: f.username || e.target.value,
                          }))
                        }
                        placeholder={email_placeholder()}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">
                        {display_name()}
                      </span>
                      <input
                        value={editMailForm.displayName}
                        onChange={(e) =>
                          setEditMailForm((f) => ({
                            ...f,
                            displayName: e.target.value,
                          }))
                        }
                        placeholder={display_name_placeholder()}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">
                        {username()}
                      </span>
                      <input
                        value={editMailForm.username}
                        onChange={(e) =>
                          setEditMailForm((f) => ({
                            ...f,
                            username: e.target.value,
                          }))
                        }
                        placeholder={username_placeholder()}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">
                        {password()}
                      </span>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={editMailForm.password}
                          onChange={(e) =>
                            setEditMailForm((f) => ({
                              ...f,
                              password: e.target.value,
                            }))
                          }
                          placeholder={password_placeholder()}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 pr-9 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          <HugeiconsIcon
                            icon={showPassword ? ViewOffSlashIcon : EyeIcon}
                            className="size-4"
                          />
                        </button>
                      </div>
                    </label>

                    {/* Provider selector */}
                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">
                        {email_provider()}
                      </p>
                      <Select
                        value={selectedEditProviderId}
                        onValueChange={applyProviderToEditForm}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={email_provider()} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {EMAIL_PROVIDERS.map((provider) => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {selectedEditProviderId &&
                      getEmailProvider(selectedEditProviderId)?.helpText ? (
                        <p className="mt-2 rounded-md border border-border/60 bg-muted/30 p-2 text-xs leading-5 text-muted-foreground">
                          {getEmailProvider(selectedEditProviderId)!.helpText}
                        </p>
                      ) : null}
                    </div>

                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">
                        {smtp_configuration()}
                      </p>
                      <div className="space-y-3">
                        <label className="grid gap-1.5 text-sm">
                          <span className="text-muted-foreground">
                            {smtp_host()}
                          </span>
                          <input
                            value={editMailForm.smtpHost}
                            onChange={(e) =>
                              setEditMailForm((f) => ({
                                ...f,
                                smtpHost: e.target.value,
                              }))
                            }
                            placeholder="smtp.gmail.com"
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="grid gap-1.5 text-sm">
                            <span className="text-muted-foreground">
                              {smtp_port()}
                            </span>
                            <input
                              value={editMailForm.smtpPort}
                              onChange={(e) =>
                                setEditMailForm((f) => ({
                                  ...f,
                                  smtpPort: e.target.value,
                                }))
                              }
                              placeholder="587"
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm pt-5">
                            <input
                              type="checkbox"
                              checked={editMailForm.smtpSecure}
                              onChange={(e) =>
                                setEditMailForm((f) => ({
                                  ...f,
                                  smtpSecure: e.target.checked,
                                }))
                              }
                              className="rounded border-border"
                            />
                            <span className="text-muted-foreground">
                              {use_tls_smtp()}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">
                        {imap_configuration()}
                      </p>
                      <div className="space-y-3">
                        <label className="grid gap-1.5 text-sm">
                          <span className="text-muted-foreground">
                            {imap_host()}
                          </span>
                          <input
                            value={editMailForm.imapHost}
                            onChange={(e) =>
                              setEditMailForm((f) => ({
                                ...f,
                                imapHost: e.target.value,
                              }))
                            }
                            placeholder="imap.gmail.com"
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="grid gap-1.5 text-sm">
                            <span className="text-muted-foreground">
                              {imap_port()}
                            </span>
                            <input
                              value={editMailForm.imapPort}
                              onChange={(e) =>
                                setEditMailForm((f) => ({
                                  ...f,
                                  imapPort: e.target.value,
                                }))
                              }
                              placeholder="993"
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm pt-5">
                            <input
                              type="checkbox"
                              checked={editMailForm.imapSecure}
                              onChange={(e) =>
                                setEditMailForm((f) => ({
                                  ...f,
                                  imapSecure: e.target.checked,
                                }))
                              }
                              className="rounded border-border"
                            />
                            <span className="text-muted-foreground">
                              {use_tls_imap()}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </AppDialog>
              </div>
            )}

            {activeTab === "data" && (
              <div className="space-y-5">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <HugeiconsIcon icon={DatabaseIcon} className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {data_control_title()}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {data_control_desc()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <HugeiconsIcon
                          icon={Download01Icon}
                          className="size-4"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {data_export_title()}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {data_export_desc()}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 w-full"
                      disabled={dataTransferState === "exporting"}
                      onClick={() => void handleExportPlatformData()}
                    >
                      {dataTransferState === "exporting" ? (
                        <Spinner size="sm" />
                      ) : (
                        <HugeiconsIcon
                          icon={Download01Icon}
                          className="size-4"
                        />
                      )}
                      {dataTransferState === "exporting"
                        ? data_exporting()
                        : data_export_button()}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <HugeiconsIcon
                          icon={Upload01Icon}
                          className="size-4"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {data_import_title()}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {data_import_desc()}
                        </p>
                      </div>
                    </div>
                    <input
                      ref={dataImportInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      aria-label="Import platform data"
                      onChange={(event) => void handleImportPlatformDataFile(event)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 w-full"
                      disabled={dataTransferState === "importing"}
                      onClick={() => dataImportInputRef.current?.click()}
                    >
                      {dataTransferState === "importing" ? (
                        <Spinner size="sm" />
                      ) : (
                        <HugeiconsIcon
                          icon={Upload01Icon}
                          className="size-4"
                        />
                      )}
                      {dataTransferState === "importing"
                        ? data_importing()
                        : data_import_button()}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-xs leading-5 text-muted-foreground">
                  {data_sensitive_hint()}
                </div>

                {dataTransferState === "exported" ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {data_export_success()}
                  </p>
                ) : null}
                {dataTransferState === "imported" ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {data_import_success()}
                  </p>
                ) : null}
                {dataTransferState === "export_error" ? (
                  <p className="text-xs text-destructive">
                    {data_export_error()}
                  </p>
                ) : null}
                {dataTransferState === "import_error" ? (
                  <p className="text-xs text-destructive">
                    {data_import_error()}
                  </p>
                ) : null}
              </div>
            )}

            {activeTab === "shortcuts" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">
                      {shortcuts_send_message()}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {shortcuts_send_message_desc()}
                    </p>
                  </div>
                  <Select
                    value={currentSettings.sendShortcut}
                    onValueChange={(value) =>
                      value &&
                      handleSendShortcutChange(value as "enter" | "cmd-enter")
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue>
                        <ShortcutKeycaps value={currentSettings.sendShortcut} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="enter">
                          <ShortcutKeycaps value="enter" />
                        </SelectItem>
                        <SelectItem value="cmd-enter">
                          <ShortcutKeycaps value="cmd-enter" />
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img src="/logo.svg" alt="OrchOS" className="size-10" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      OrchOS
                    </p>
                    <p className="text-xs text-muted-foreground">v1.0.0</p>
                  </div>
                </div>
                <div className="rounded-lg p-4">
                  <p className="text-sm font-medium text-foreground">
                    {about_project_summary_title()}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {orchos_desc()}
                  </p>
                </div>
                <div className="rounded-lg p-4">
                  <p className="text-sm font-medium text-foreground">
                    {about_acknowledgements_title()}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {about_acknowledgements_desc()}
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
