import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  SquareArrowDataTransferHorizontalIcon,
  EyeIcon,
  ViewOffSlashIcon,
  MailEdit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

import { InboxDetail, InboxNoSelection } from "@/components/panels/InboxDetail";
import { InboxList } from "@/components/panels/InboxList";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/interactive-empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  api,
  type InboxMessage,
  type InboxThread,
  type Integration,
} from "@/lib/api";
import { matchesMailFolder } from "@/lib/mail";
import { EMAIL_PROVIDERS, getEmailProvider } from "@/lib/email-providers";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";
import {
  back,
  cancel,
  collapse_sidebar,
  compose_mail,
  connect_mail_account,
  connect_mailbox,
  connect_mailbox_desc,
  display_name,
  display_name_placeholder,
  email,
  email_placeholder,
  email_provider,
  email_provider_help,
  expand_sidebar,
  host,
  imap_configuration,
  imap_host_placeholder,
  imap_port_placeholder,
  loading as loading_label,
  mail,
  mail_accounts,
  mail_accounts_desc,
  no_mail_accounts,
  password,
  password_placeholder,
  port,
  resize_mail_sidebar,
  smtp_configuration,
  smtp_host_placeholder,
  smtp_port_placeholder,
  use_tls_ssl,
  username,
  username_placeholder,
  mail_from,
  mail_to,
  mail_cc,
  mail_subject,
  send,
  sending,
  mail_sent_success,
  mail_send_failed,
  no_mail_account_for_send,
  recipient_placeholder,
  subject_placeholder,
  body_placeholder,
} from "@/paraglide/messages";

type MailIntegrationAccount = {
  id: string;
  label: string;
  email?: string;
  username?: string;
  scopes?: string[];
};

type MailIntegration = Integration & {
  accounts?: MailIntegrationAccount[];
};

export function MailPage() {
  const navigate = useNavigate();
  const { projects: dashboardProjects } = useDashboard();
  const activeInboxId = useUIStore((s) => s.activeInboxId);
  const setActiveInboxId = useUIStore((s) => s.setActiveInboxId);
  const mailFolderFilter = useUIStore((s) => s.mailFolderFilter);
  const activeAccountId = useUIStore((s) => s.mailActiveAccountId);
  const setActiveAccountIdFilter = useUIStore(
    (s) => s.setMailActiveAccountId,
  );
  const projects = dashboardProjects ?? [];

  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [messagesByThreadId, setMessagesByThreadId] = useState<
    Record<string, InboxMessage[]>
  >({});
  const [integrations, setIntegrations] = useState<MailIntegration[]>([]);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isAccountsDialogOpen, setIsAccountsDialogOpen] = useState(false);
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: "",
    cc: "",
    subject: "",
    body: "",
    accountId: "" as string,
  });
  const [sendingMail, setSendingMail] = useState(false);
  const [sendMailError, setSendMailError] = useState<string | null>(null);
  const [sendMailSent, setSendMailSent] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    EMAIL_PROVIDERS[0].id,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [, setLoading] = useState(true);
  const [submittingAccount, setSubmittingAccount] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const collapseTimerRef = useRef<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [mailAccountForm, setMailAccountForm] = useState({
    email: "",
    displayName: "",
    username: "",
    password: "",
    smtpHost: "",
    smtpPort: "587",
    smtpSecure: false,
    imapHost: "",
    imapPort: "993",
    imapSecure: true,
  });

  const projectNameById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project.name]));
  }, [projects]);

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) =>
      matchesMailFolder(thread, mailFolderFilter),
    );
  }, [mailFolderFilter, threads]);

  const activeThread = useMemo(() => {
    return (
      filteredThreads.find((thread) => thread.id === activeInboxId) ??
      filteredThreads[0] ??
      null
    );
  }, [activeInboxId, filteredThreads]);

  const smtpImapIntegration = useMemo(
    () => integrations.find((item) => item.id === "smtp-imap") ?? null,
    [integrations],
  );
  const mailAccounts = useMemo(
    () =>
      smtpImapIntegration?.accounts?.map((account) => ({
        ...account,
        source: "IMAP/SMTP",
      })) ?? [],
    [smtpImapIntegration],
  );

  const activeMessages = activeThread
    ? (messagesByThreadId[activeThread.id] ?? [])
    : [];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchThreads = api
      .listInboxThreads()
      .then((nextThreads) => {
        if (!cancelled) setThreads(nextThreads);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
        }
      });

    const fetchIntegrations = api
      .listIntegrations()
      .then((result) => {
        if (!cancelled) setIntegrations(result as MailIntegration[]);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
        }
      });

    Promise.all([fetchThreads, fetchIntegrations]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleOpenMailAccounts = () => setIsAccountsDialogOpen(true);
    window.addEventListener(
      "orchos:open-mail-accounts",
      handleOpenMailAccounts,
    );
    return () =>
      window.removeEventListener(
        "orchos:open-mail-accounts",
        handleOpenMailAccounts,
      );
  }, []);

  useEffect(() => {
    if (filteredThreads.length === 0) {
      if (activeInboxId !== null) {
        setActiveInboxId(null);
      }
      return;
    }

    if (
      !activeInboxId ||
      !filteredThreads.some((thread) => thread.id === activeInboxId)
    ) {
      setActiveInboxId(filteredThreads[0].id);
    }
  }, [activeInboxId, filteredThreads, setActiveInboxId]);

  useEffect(() => {
    if (!activeThread) return;
    if (messagesByThreadId[activeThread.id]) return;

    let cancelled = false;

    api
      .listInboxMessages(activeThread.id)
      .then((nextMessages) => {
        if (cancelled) return;
        setMessagesByThreadId((current) => ({
          ...current,
          [activeThread.id]: nextMessages,
        }));
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeThread, messagesByThreadId]);

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) {
      setShowExpandedContent(false);
      return;
    }

    setShowExpandedContent(true);
  }, [sidebarCollapsed]);

  // On mobile: switch to detail view when a thread becomes active
  useEffect(() => {
    if (isMobile && activeInboxId) {
      setMobileView("detail");
    }
  }, [isMobile, activeInboxId]);

  async function loadThreads() {
    setLoading(true);
    try {
      const nextThreads = await api.listInboxThreads();
      setThreads(nextThreads);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadIntegrations() {
    try {
      setIntegrations((await api.listIntegrations()) as MailIntegration[]);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleReply(data: {
    body: string;
    subject?: string;
    to: string[];
    cc?: string[];
  }) {
    if (!activeThread) {
      return;
    }

    const newMessage = await api.addInboxMessage(activeThread.id, {
      messageType: "status_update",
      senderType: "user",
      senderName: "You",
      subject: data.subject,
      body: data.body,
      to: data.to,
      cc: data.cc,
    });

    setMessagesByThreadId((current) => ({
      ...current,
      [activeThread.id]: [...(current[activeThread.id] ?? []), newMessage],
    }));

    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              lastMessageAt: newMessage.createdAt,
              updatedAt: newMessage.createdAt,
              status: thread.status === "open" ? "waiting_user" : thread.status,
            }
          : thread,
      ),
    );
  }

  function handleProviderChange(providerId: string | null) {
    if (!providerId) return;
    setSelectedProviderId(providerId);
    const provider = getEmailProvider(providerId);
    if (provider) {
      setMailAccountForm((f) => ({
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

  async function handleCreateMailAccount() {
    if (
      !mailAccountForm.email.trim() ||
      !mailAccountForm.username.trim() ||
      !mailAccountForm.password.trim() ||
      !mailAccountForm.smtpHost.trim() ||
      !mailAccountForm.imapHost.trim()
    ) {
      return;
    }

    const smtpPort = Number(mailAccountForm.smtpPort);
    const imapPort = Number(mailAccountForm.imapPort);

    if (!Number.isFinite(smtpPort) || !Number.isFinite(imapPort)) {
      return;
    }

    setSubmittingAccount(true);
    try {
      await api.createSmtpImapAccount({
        email: mailAccountForm.email.trim(),
        displayName: mailAccountForm.displayName.trim() || undefined,
        username: mailAccountForm.username.trim(),
        password: mailAccountForm.password,
        smtp: {
          host: mailAccountForm.smtpHost.trim(),
          port: smtpPort,
          secure: mailAccountForm.smtpSecure,
        },
        imap: {
          host: mailAccountForm.imapHost.trim(),
          port: imapPort,
          secure: mailAccountForm.imapSecure,
        },
      });
      setIsConnectDialogOpen(false);
      setSelectedProviderId(EMAIL_PROVIDERS[0].id);
      setMailAccountForm({
        email: "",
        displayName: "",
        username: "",
        password: "",
        smtpHost: EMAIL_PROVIDERS[0].smtp.host,
        smtpPort: String(EMAIL_PROVIDERS[0].smtp.port),
        smtpSecure: EMAIL_PROVIDERS[0].smtp.secure,
        imapHost: EMAIL_PROVIDERS[0].imap.host,
        imapPort: String(EMAIL_PROVIDERS[0].imap.port),
        imapSecure: EMAIL_PROVIDERS[0].imap.secure,
      });

      void loadThreads();
      void loadIntegrations();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmittingAccount(false);
    }
  }

  async function handleSendMail() {
    const toList = composeForm.to
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const ccList = composeForm.cc
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (toList.length === 0 || !composeForm.subject.trim()) return;

    const accountId = composeForm.accountId || mailAccounts[0]?.id;
    if (!accountId) {
      setSendMailError(no_mail_account_for_send());
      return;
    }

    setSendingMail(true);
    setSendMailError(null);
    setSendMailSent(false);

    try {
      await api.sendMail({
        provider: "smtp-imap",
        accountId,
        to: toList,
        cc: ccList.length > 0 ? ccList : undefined,
        subject: composeForm.subject.trim(),
        body: composeForm.body,
      });

      setSendMailSent(true);
      setComposeForm({ to: "", cc: "", subject: "", body: "", accountId: "" });
      setTimeout(() => {
        setSendMailSent(false);
        setIsComposeDialogOpen(false);
      }, 1500);
    } catch (error) {
      setSendMailError(
        error instanceof Error ? error.message : mail_send_failed(),
      );
    } finally {
      setSendingMail(false);
    }
  }

  const handleCollapseSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setShowExpandedContent(false);
    collapseTimerRef.current = window.setTimeout(() => {
      setSidebarCollapsed(true);
      collapseTimerRef.current = null;
    }, 180);
  }, []);

  const handleExpandSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setSidebarCollapsed(false);
  }, []);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const sidebarEl = sidebarRef.current;
      if (!sidebarEl) return;
      const sidebarLeft = sidebarEl.getBoundingClientRect().left;

      setIsResizingSidebar(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      sidebarEl.style.transition = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = Math.min(
          Math.max(moveEvent.clientX - sidebarLeft, 200),
          420,
        );
        setSidebarWidth(nextWidth);
      };

      const handlePointerUp = () => {
        setIsResizingSidebar(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        sidebarEl.style.transition = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={sidebarRef}
          className={cn(
            "relative hidden min-h-0 shrink-0 flex-col overflow-visible border-r bg-card transition-[width] duration-300 ease-out lg:flex",
            sidebarCollapsed
              ? "w-0 border-r-transparent"
              : "w-[var(--mail-sidebar-width)]",
            sidebarCollapsed
              ? ""
              : isResizingSidebar
                ? "border-r-transparent"
                : "border-border",
          )}
          style={
            sidebarCollapsed
              ? undefined
              : ({
                  "--mail-sidebar-width": `${Math.min(sidebarWidth, 420)}px`,
                } as CSSProperties)
          }
        >
          <div
            className={cn(
              "border-b border-border p-2 transition-[opacity,filter] duration-300 ease-out",
              showExpandedContent
                ? "opacity-100 blur-0"
                : "pointer-events-none opacity-0 blur-[6px]",
            )}
            aria-hidden={!showExpandedContent}
          >
            <div className="flex h-10 items-center justify-between rounded-md px-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="text-sm font-semibold text-foreground">
                  {mail()}
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                  {filteredThreads.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={(props) => (
                      <Button
                        {...props}
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="active:-translate-y-0"
                        onClick={() => setIsComposeDialogOpen(true)}
                      >
                        <HugeiconsIcon
                          icon={MailEdit02Icon}
                          className="size-4"
                        />
                      </Button>
                    )}
                  />
                  <TooltipContent side="bottom">
                    {compose_mail()}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={(props) => (
                      <Button
                        {...props}
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="active:-translate-y-0"
                        onClick={handleCollapseSidebar}
                      >
                        <HugeiconsIcon
                          icon={ArrowLeft01Icon}
                          className="size-4"
                        />
                      </Button>
                    )}
                  />
                  <TooltipContent side="bottom">
                    {collapse_sidebar()}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "min-h-0 flex flex-1 flex-col transition-[opacity,filter] duration-300 ease-out",
              showExpandedContent
                ? "opacity-100 blur-0"
                : "pointer-events-none opacity-0 blur-[6px]",
            )}
            aria-hidden={!showExpandedContent}
          >
            <div className="min-h-0 flex-1">
              <InboxList
                threads={filteredThreads}
                activeInboxId={activeThread?.id ?? null}
                projectNameById={projectNameById}
                onSelectItem={setActiveInboxId}
                accounts={mailAccounts}
                activeAccountId={activeAccountId}
                onAccountChange={setActiveAccountIdFilter}
              />
            </div>
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={resize_mail_sidebar()}
            onPointerDown={handleResizeStart}
            className={cn(
              "group absolute right-[-8px] top-0 z-20 h-full w-4 cursor-col-resize",
              !showExpandedContent && "hidden",
              isResizingSidebar &&
                "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute top-1/2 left-1/2 flex h-12 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-[background-color,border-color,box-shadow] duration-150 ease-out group-hover:bg-muted group-hover:shadow-md",
                isResizingSidebar && "border-border bg-muted shadow-md",
              )}
            >
              <div
                className={cn(
                  "h-8 w-px rounded-full bg-border transition-[background-color] duration-150 ease-out group-hover:bg-foreground/35",
                  isResizingSidebar && "opacity-0",
                )}
              />
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {isMobile && mobileView === "list" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredThreads.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-6">
                  <EmptyState
                    variant="subtle"
                    size="lg"
                    className="hover:bg-transparent dark:hover:bg-transparent w-full max-w-lg"
                    title={connect_mailbox()}
                    description={connect_mailbox_desc()}
                    icons={[
                      <HugeiconsIcon
                        key="m1"
                        icon={MailEdit02Icon}
                        className="size-6"
                      />,
                      <HugeiconsIcon
                        key="m2"
                        icon={SquareArrowDataTransferHorizontalIcon}
                        className="size-6"
                      />,
                      <HugeiconsIcon
                        key="m3"
                        icon={Add01Icon}
                        className="size-6"
                      />,
                    ]}
                    action={{
                      label: connect_mailbox(),
                      icon: (
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                      ),
                      onClick: () => setIsConnectDialogOpen(true),
                    }}
                  />
                </div>
              ) : (
                <InboxList
                  threads={filteredThreads}
                  activeInboxId={activeThread?.id ?? null}
                  projectNameById={projectNameById}
                  onSelectItem={(id) => {
                    setActiveInboxId(id);
                    setMobileView("detail");
                  }}
                  accounts={mailAccounts}
                  activeAccountId={activeAccountId}
                  onAccountChange={setActiveAccountIdFilter}
                />
              )}
            </div>
          ) : isMobile && mobileView === "detail" && activeThread ? (
            <>
              <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveInboxId(null);
                    setMobileView("list");
                  }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                  {back()}
                </button>
              </div>
              <InboxDetail
                thread={activeThread}
                messages={activeMessages}
                projects={projects}
                onOpenGoal={
                  activeThread.primaryGoalId
                    ? () => {
                        void navigate({ to: "/dashboard/creation" });
                      }
                    : undefined
                }
                onReply={handleReply}
              />
            </>
          ) : (
            <>
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger
                    render={(props) => (
                      <Button
                        {...props}
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:!translate-y-[-50%]"
                        onClick={handleExpandSidebar}
                      >
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          className="size-4"
                        />
                      </Button>
                    )}
                  />
                  <TooltipContent side="right">
                    {expand_sidebar()}
                  </TooltipContent>
                </Tooltip>
              ) : null}

              {activeThread ? (
                <InboxDetail
                  thread={activeThread}
                  messages={activeMessages}
                  projects={projects}
                  onOpenGoal={
                    activeThread.primaryGoalId
                      ? () => {
                          void navigate({ to: "/dashboard/creation" });
                        }
                      : undefined
                  }
                  onReply={handleReply}
                />
              ) : filteredThreads.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-6">
                  <EmptyState
                    variant="subtle"
                    size="lg"
                    className="hover:bg-transparent dark:hover:bg-transparent w-full max-w-lg"
                    title={connect_mailbox()}
                    description={connect_mailbox_desc()}
                    icons={[
                      <HugeiconsIcon
                        key="m1"
                        icon={MailEdit02Icon}
                        className="size-6"
                      />,
                      <HugeiconsIcon
                        key="m2"
                        icon={SquareArrowDataTransferHorizontalIcon}
                        className="size-6"
                      />,
                      <HugeiconsIcon
                        key="m3"
                        icon={Add01Icon}
                        className="size-6"
                      />,
                    ]}
                    action={{
                      label: connect_mailbox(),
                      icon: (
                        <HugeiconsIcon icon={Add01Icon} className="size-4" />
                      ),
                      onClick: () => setIsConnectDialogOpen(true),
                    }}
                  />
                </div>
              ) : (
                <InboxNoSelection />
              )}
            </>
          )}
        </div>
      </div>

      <AppDialog
        open={isAccountsDialogOpen}
        onOpenChange={setIsAccountsDialogOpen}
        title={mail_accounts()}
        description={mail_accounts_desc()}
        size="lg"
        footer={
          <Button type="button" onClick={() => setIsAccountsDialogOpen(false)}>
            {cancel()}
          </Button>
        }
      >
        <div className="space-y-3">
          {mailAccounts.length > 0 ? (
            mailAccounts.map((account) => (
              <div
                key={account.id}
                className="rounded-xl border border-border/70 bg-background/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {account.label}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {account.email || account.username}
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                    {account.source}
                  </span>
                </div>
                {account.scopes && account.scopes.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {account.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground"
                      >
                        {scope.replace("https://www.googleapis.com/auth/", "")}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
              {no_mail_accounts()}
            </div>
          )}
        </div>
      </AppDialog>

      <AppDialog
        open={isComposeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSendMailError(null);
            setSendMailSent(false);
          }
          setIsComposeDialogOpen(open);
        }}
        title={compose_mail()}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsComposeDialogOpen(false)}
            >
              {cancel()}
            </Button>
            <Button
              type="button"
              disabled={
                sendingMail ||
                !composeForm.to.trim() ||
                !composeForm.subject.trim() ||
                (!composeForm.accountId && mailAccounts.length === 0)
              }
              onClick={() => void handleSendMail()}
            >
              {sendingMail ? sending() : send()}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* From selector */}
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">{mail_from()}</span>
            <select
              value={composeForm.accountId || mailAccounts[0]?.id || ""}
              onChange={(e) =>
                setComposeForm((f) => ({ ...f, accountId: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
            >
              {mailAccounts.length === 0 ? (
                <option value="">{no_mail_account_for_send()}</option>
              ) : (
                mailAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label} ({account.email || account.username})
                  </option>
                ))
              )}
            </select>
          </label>

          {/* To */}
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">{mail_to()}</span>
            <input
              type="text"
              value={composeForm.to}
              onChange={(e) =>
                setComposeForm((f) => ({ ...f, to: e.target.value }))
              }
              placeholder={recipient_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
            />
          </label>

          {/* Cc */}
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">{mail_cc()}</span>
            <input
              type="text"
              value={composeForm.cc}
              onChange={(e) =>
                setComposeForm((f) => ({ ...f, cc: e.target.value }))
              }
              placeholder={recipient_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
            />
          </label>

          {/* Subject */}
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">{mail_subject()}</span>
            <input
              type="text"
              value={composeForm.subject}
              onChange={(e) =>
                setComposeForm((f) => ({ ...f, subject: e.target.value }))
              }
              placeholder={subject_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
            />
          </label>

          {/* Body */}
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">{body_placeholder()}</span>
            <textarea
              value={composeForm.body}
              onChange={(e) =>
                setComposeForm((f) => ({ ...f, body: e.target.value }))
              }
              placeholder={body_placeholder()}
              rows={8}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
            />
          </label>

          {/* Status messages */}
          {sendMailError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {sendMailError}
            </p>
          )}
          {sendMailSent && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              {mail_sent_success()}
            </p>
          )}
        </div>
      </AppDialog>

      <AppDialog
        open={isConnectDialogOpen}
        onOpenChange={(open) => {
          setIsConnectDialogOpen(open);
          if (open) {
            const defaultProvider = EMAIL_PROVIDERS[0];
            setSelectedProviderId(defaultProvider.id);
            setMailAccountForm({
              email: "",
              displayName: "",
              username: "",
              password: "",
              smtpHost: defaultProvider.smtp.host,
              smtpPort: String(defaultProvider.smtp.port),
              smtpSecure: defaultProvider.smtp.secure,
              imapHost: defaultProvider.imap.host,
              imapPort: String(defaultProvider.imap.port),
              imapSecure: defaultProvider.imap.secure,
            });
          }
        }}
        title={connect_mailbox()}
        description={connect_mailbox_desc()}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConnectDialogOpen(false)}
            >
              {cancel()}
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateMailAccount()}
              disabled={submittingAccount}
            >
              {submittingAccount ? loading_label() : connect_mail_account()}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Provider selector */}
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-foreground">
              {email_provider()}
            </span>
            <Select
              value={selectedProviderId}
              onValueChange={handleProviderChange}
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
          </label>

          {/* Help text */}
          {selectedProviderId &&
          getEmailProvider(selectedProviderId)?.helpText ? (
            <p className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
              {getEmailProvider(selectedProviderId)!.helpText}
            </p>
          ) : null}

          <p className="text-xs leading-5 text-muted-foreground">
            {email_provider_help()}
          </p>

          <div className="space-y-4">
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">{email()}</span>
              <input
                value={mailAccountForm.email}
                onChange={(event) =>
                  setMailAccountForm((current) => ({
                    ...current,
                    email: event.target.value,
                    username: current.username || event.target.value,
                  }))
                }
                placeholder={email_placeholder()}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">{display_name()}</span>
              <input
                value={mailAccountForm.displayName}
                onChange={(event) =>
                  setMailAccountForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                placeholder={display_name_placeholder()}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">{username()}</span>
              <input
                value={mailAccountForm.username}
                onChange={(event) =>
                  setMailAccountForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                placeholder={username_placeholder()}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">{password()}</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={mailAccountForm.password}
                  onChange={(event) =>
                    setMailAccountForm((current) => ({
                      ...current,
                      password: event.target.value,
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

            <div className="border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                {smtp_configuration()}
              </p>
              <div className="space-y-3">
                <label className="grid gap-1.5 text-sm">
                  <span className="text-muted-foreground">{host()}</span>
                  <input
                    value={mailAccountForm.smtpHost}
                    onChange={(event) =>
                      setMailAccountForm((current) => ({
                        ...current,
                        smtpHost: event.target.value,
                      }))
                    }
                    placeholder={smtp_host_placeholder()}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-muted-foreground">{port()}</span>
                    <input
                      value={mailAccountForm.smtpPort}
                      onChange={(event) =>
                        setMailAccountForm((current) => ({
                          ...current,
                          smtpPort: event.target.value,
                        }))
                      }
                      placeholder={smtp_port_placeholder()}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm pt-5">
                    <input
                      type="checkbox"
                      checked={mailAccountForm.smtpSecure}
                      onChange={(event) =>
                        setMailAccountForm((current) => ({
                          ...current,
                          smtpSecure: event.target.checked,
                        }))
                      }
                      className="rounded border-border"
                    />
                    <span className="text-muted-foreground">
                      {use_tls_ssl()}
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
                  <span className="text-muted-foreground">{host()}</span>
                  <input
                    value={mailAccountForm.imapHost}
                    onChange={(event) =>
                      setMailAccountForm((current) => ({
                        ...current,
                        imapHost: event.target.value,
                      }))
                    }
                    placeholder={imap_host_placeholder()}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-muted-foreground">{port()}</span>
                    <input
                      value={mailAccountForm.imapPort}
                      onChange={(event) =>
                        setMailAccountForm((current) => ({
                          ...current,
                          imapPort: event.target.value,
                        }))
                      }
                      placeholder={imap_port_placeholder()}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:outline-dashed focus:outline-[0.5px] focus:outline-blue-500 focus:outline-offset-2"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm pt-5">
                    <input
                      type="checkbox"
                      checked={mailAccountForm.imapSecure}
                      onChange={(event) =>
                        setMailAccountForm((current) => ({
                          ...current,
                          imapSecure: event.target.checked,
                        }))
                      }
                      className="rounded border-border"
                    />
                    <span className="text-muted-foreground">
                      {use_tls_ssl()}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppDialog>
    </div>
  );
}
