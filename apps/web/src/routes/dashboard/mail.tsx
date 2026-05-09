import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  GoogleIcon,
  SquareArrowDataTransferHorizontalIcon,
  EyeIcon,
  ViewOffSlashIcon,
  MailEdit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "@/components/ui/toast";

import { InboxDetail, InboxNoSelection } from "@/components/panels/InboxDetail";
import { InboxList } from "@/components/panels/InboxList";
import { AsciiLoading } from "@/components/ui/ascii-loading";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/interactive-empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  api,
  type InboxMessage,
  type InboxThread,
  type Integration,
} from "@/lib/api";
import { matchesMailFolder } from "@/lib/mail";
import { useDashboard } from "@/lib/dashboard-context";
import { useUIStore } from "@/lib/store";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/dashboard/mail")({
  component: MailPage,
});

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

function MailPage() {
  const navigate = useNavigate();
  const { projects: dashboardProjects } = useDashboard();
  const { activeInboxId, setActiveInboxId, mailFolderFilter } = useUIStore();
  const projects = dashboardProjects ?? [];

  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [messagesByThreadId, setMessagesByThreadId] = useState<
    Record<string, InboxMessage[]>
  >({});
  const [integrations, setIntegrations] = useState<MailIntegration[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isAccountsDialogOpen, setIsAccountsDialogOpen] = useState(false);
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [mailConnectMode, setMailConnectMode] = useState<"gmail" | "smtp-imap">(
    "gmail",
  );
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingAccount, setSubmittingAccount] = useState(false);
  const [activeAccountId, setActiveAccountIdFilter] = useState<string | null>(null);
  const collapseTimerRef = useRef<number | null>(null);
  const [gmailForm, setGmailForm] = useState({
    label: "",
    clientId: "",
    clientSecret: "",
    refreshToken: "",
  });
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

  const gmailIntegration = useMemo(
    () => integrations.find((item) => item.id === "gmail") ?? null,
    [integrations],
  );
  const smtpImapIntegration = useMemo(
    () => integrations.find((item) => item.id === "smtp-imap") ?? null,
    [integrations],
  );
  const mailAccounts = useMemo(
    () => [
      ...(gmailIntegration?.accounts?.map((account) => ({
        ...account,
        source: "Gmail",
      })) ?? []),
      ...(smtpImapIntegration?.accounts?.map((account) => ({
        ...account,
        source: "IMAP/SMTP",
      })) ?? []),
    ],
    [gmailIntegration, smtpImapIntegration],
  );

  const activeMessages = activeThread
    ? (messagesByThreadId[activeThread.id] ?? [])
    : [];

  useEffect(() => {
    void loadThreads();
    void loadIntegrations();
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
    if (!activeThread) {
      return;
    }

    if (messagesByThreadId[activeThread.id]) {
      return;
    }

    void loadMessages(activeThread.id);
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

  async function loadThreads() {
    setLoading(true);
    try {
      const nextThreads = await api.listInboxThreads();
      setThreads(nextThreads);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load mail threads",
        { closeButton: true },
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadIntegrations() {
    try {
      setIntegrations((await api.listIntegrations()) as MailIntegration[]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load mail accounts",
        { closeButton: true },
      );
    }
  }

  async function loadMessages(threadId: string) {
    try {
      const nextMessages = await api.listInboxMessages(threadId);
      setMessagesByThreadId((current) => ({
        ...current,
        [threadId]: nextMessages,
      }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load thread messages",
        { closeButton: true },
      );
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

  async function handleCreateMailAccount() {
    if (
      !mailAccountForm.email.trim() ||
      !mailAccountForm.username.trim() ||
      !mailAccountForm.password.trim() ||
      !mailAccountForm.smtpHost.trim() ||
      !mailAccountForm.imapHost.trim()
    ) {
      toast.error(m.mail_account_details_required());
      return;
    }

    const smtpPort = Number(mailAccountForm.smtpPort);
    const imapPort = Number(mailAccountForm.imapPort);

    if (!Number.isFinite(smtpPort) || !Number.isFinite(imapPort)) {
      toast.error(m.mail_ports_must_be_numbers());
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
      setMailAccountForm({
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
      toast.success(m.mail_account_connected());
      void loadThreads();
      void loadIntegrations();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : m.failed_to_connect_mail_account(),
        { closeButton: true },
      );
    } finally {
      setSubmittingAccount(false);
    }
  }

  async function handleConnectGmail() {
    if (
      !gmailForm.clientId.trim() ||
      !gmailForm.clientSecret.trim() ||
      !gmailForm.refreshToken.trim()
    ) {
      toast.error(m.gmail_credentials_required());
      return;
    }

    setSubmittingAccount(true);
    try {
      await api.connectGoogleIntegration("gmail", {
        label: gmailForm.label.trim() || undefined,
        clientId: gmailForm.clientId.trim(),
        clientSecret: gmailForm.clientSecret.trim(),
        refreshToken: gmailForm.refreshToken.trim(),
      });
      setIsConnectDialogOpen(false);
      setGmailForm({
        label: "",
        clientId: "",
        clientSecret: "",
        refreshToken: "",
      });
      toast.success(m.gmail_connected());
      void loadThreads();
      void loadIntegrations();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : m.failed_to_connect_gmail(),
        { closeButton: true },
      );
    } finally {
      setSubmittingAccount(false);
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
      const sidebarEl = event.currentTarget.parentElement;
      const sidebarLeft = sidebarEl?.getBoundingClientRect().left ?? 0;

      setIsResizingSidebar(true);
      document.body.style.cssText += ";cursor:col-resize;user-select:none;";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = Math.min(
          Math.max(moveEvent.clientX - sidebarLeft, 200),
          420,
        );
        setSidebarWidth(nextWidth);
      };

      const handlePointerUp = () => {
        setIsResizingSidebar(false);
        document.body.style.cssText += ";cursor:;user-select:";
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
          className={cn(
            "relative hidden min-h-0 shrink-0 flex-col overflow-visible border-r bg-card transition-[width] duration-300 ease-out lg:flex",
            sidebarCollapsed
              ? "w-0 border-r-transparent"
              : "w-[var(--mail-sidebar-width)]",
            isResizingSidebar ? "border-r-transparent" : "border-border",
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
                  {m.mail()}
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
                        <HugeiconsIcon icon={MailEdit02Icon} className="size-4" />
                      </Button>
                    )}
                  />
                  <TooltipContent side="bottom">{m.compose_mail()}</TooltipContent>
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
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                      </Button>
                    )}
                  />
                  <TooltipContent side="bottom">{m.collapse_sidebar()}</TooltipContent>
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
            aria-label={m.resize_mail_sidebar()}
            className={cn(
              "group absolute right-[-8px] top-0 z-20 h-full w-4",
              sidebarCollapsed && "hidden",
              isResizingSidebar &&
                "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
            )}
          >
            <div
              onPointerDown={handleResizeStart}
              className={cn(
                "pointer-events-auto absolute top-1/2 left-1/2 flex h-12 w-2 cursor-col-resize -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-[background-color,border-color,box-shadow] duration-150 ease-out group-hover:bg-muted group-hover:shadow-md",
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
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                  </Button>
                )}
              />
              <TooltipContent side="right">{m.expand_sidebar()}</TooltipContent>
            </Tooltip>
          ) : null}

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <AsciiLoading label={m.loading()} />
            </div>
          ) : activeThread ? (
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
                title={m.connect_mailbox()}
                description={m.connect_mailbox_desc()}
                icons={[
                  <HugeiconsIcon key="m1" icon={GoogleIcon} className="size-6" />,
                  <HugeiconsIcon key="m2" icon={SquareArrowDataTransferHorizontalIcon} className="size-6" />,
                  <HugeiconsIcon key="m3" icon={Add01Icon} className="size-6" />,
                ]}
                action={{
                  label: m.connect_mailbox(),
                  icon: <HugeiconsIcon icon={Add01Icon} className="size-4" />,
                  onClick: () => setIsConnectDialogOpen(true),
                }}
              />
            </div>
          ) : (
            <InboxNoSelection />
          )}
        </div>
      </div>

      <AppDialog
        open={isAccountsDialogOpen}
        onOpenChange={setIsAccountsDialogOpen}
        title={m.mail_accounts()}
        description={m.mail_accounts_desc()}
        size="lg"
        footer={
          <Button type="button" onClick={() => setIsAccountsDialogOpen(false)}>
            {m.cancel()}
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
              {m.no_mail_accounts()}
            </div>
          )}
        </div>
      </AppDialog>

      <AppDialog
        open={isComposeDialogOpen}
        onOpenChange={setIsComposeDialogOpen}
        title={m.compose_mail()}
        description={m.compose_mail_pending_desc()}
        size="md"
        footer={
          <Button type="button" onClick={() => setIsComposeDialogOpen(false)}>
            {m.cancel()}
          </Button>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{m.compose_mail_wired_desc()}</p>
          <p>{m.compose_mail_next_steps_intro()}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{m.compose_mail_step_new_thread()}</li>
            <li>{m.compose_mail_step_select_identity()}</li>
            <li>{m.compose_mail_step_external_recipients()}</li>
          </ul>
        </div>
      </AppDialog>

      <AppDialog
        open={isConnectDialogOpen}
        onOpenChange={(open) => {
          setIsConnectDialogOpen(open);
          if (open) {
            setMailConnectMode("gmail");
          }
        }}
        title={m.connect_mailbox()}
        description={m.connect_mailbox_desc()}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConnectDialogOpen(false)}
            >
              {m.cancel()}
            </Button>
            <Button
              type="button"
              onClick={() =>
                void (mailConnectMode === "gmail"
                  ? handleConnectGmail()
                  : handleCreateMailAccount())
              }
              disabled={submittingAccount}
            >
              {submittingAccount
                ? m.loading()
                : mailConnectMode === "gmail"
                  ? m.connect_gmail()
                  : m.connect()}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Tabs
            value={mailConnectMode}
            onValueChange={(value) =>
              setMailConnectMode(value as "gmail" | "smtp-imap")
            }
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="gmail">
                <HugeiconsIcon
                  icon={GoogleIcon}
                  className="size-4 text-sky-500"
                />
                Gmail
              </TabsTrigger>
              <TabsTrigger value="smtp-imap">
                <HugeiconsIcon
                  icon={SquareArrowDataTransferHorizontalIcon}
                  className="size-4 text-violet-500"
                />
                IMAP/SMTP
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <p className="text-xs leading-5 text-muted-foreground">
            {mailConnectMode === "gmail"
              ? m.gmail_connect_help()
              : m.mail_custom_mailbox_help()}
          </p>

          {mailConnectMode === "gmail" ? (
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {m.account_label()}
                </span>
                <input
                  value={gmailForm.label}
                  onChange={(event) =>
                    setGmailForm((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder={m.gmail_account_label_placeholder()}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">{m.client_id()}</span>
                <input
                  value={gmailForm.clientId}
                  onChange={(event) =>
                    setGmailForm((current) => ({
                      ...current,
                      clientId: event.target.value,
                    }))
                  }
                  placeholder={m.google_oauth_client_id_placeholder()}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {m.client_secret()}
                </span>
                <div className="relative">
                  <input
                    type={showClientSecret ? "text" : "password"}
                    value={gmailForm.clientSecret}
                    onChange={(event) =>
                      setGmailForm((current) => ({
                        ...current,
                        clientSecret: event.target.value,
                      }))
                    }
                    placeholder={m.google_oauth_client_secret_placeholder()}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 pr-9 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientSecret((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    <HugeiconsIcon icon={showClientSecret ? ViewOffSlashIcon : EyeIcon} className="size-4" />
                  </button>
                </div>
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {m.refresh_token()}
                </span>
                <textarea
                  value={gmailForm.refreshToken}
                  onChange={(event) =>
                    setGmailForm((current) => ({
                      ...current,
                      refreshToken: event.target.value,
                    }))
                  }
                  placeholder={m.gmail_refresh_token_placeholder()}
                  className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">{m.email()}</span>
                <input
                  value={mailAccountForm.email}
                  onChange={(event) =>
                    setMailAccountForm((current) => ({
                      ...current,
                      email: event.target.value,
                      username: current.username || event.target.value,
                    }))
                  }
                  placeholder={m.email_placeholder()}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">{m.display_name()}</span>
                <input
                  value={mailAccountForm.displayName}
                  onChange={(event) =>
                    setMailAccountForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder={m.display_name_placeholder()}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">{m.username()}</span>
                <input
                  value={mailAccountForm.username}
                  onChange={(event) =>
                    setMailAccountForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder={m.username_placeholder()}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="text-muted-foreground">{m.password()}</span>
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
                    <span className="text-muted-foreground">{m.host()}</span>
                    <input
                      value={mailAccountForm.smtpHost}
                      onChange={(event) =>
                        setMailAccountForm((current) => ({
                          ...current,
                          smtpHost: event.target.value,
                        }))
                      }
                      placeholder={m.smtp_host_placeholder()}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">{m.port()}</span>
                      <input
                        value={mailAccountForm.smtpPort}
                        onChange={(event) =>
                          setMailAccountForm((current) => ({
                            ...current,
                            smtpPort: event.target.value,
                          }))
                        }
                        placeholder={m.smtp_port_placeholder()}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
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
                      <span className="text-muted-foreground">{m.use_tls_ssl()}</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">{m.imap_configuration()}</p>
                <div className="space-y-3">
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-muted-foreground">{m.host()}</span>
                    <input
                      value={mailAccountForm.imapHost}
                      onChange={(event) =>
                        setMailAccountForm((current) => ({
                          ...current,
                          imapHost: event.target.value,
                        }))
                      }
                      placeholder={m.imap_host_placeholder()}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-muted-foreground">{m.port()}</span>
                      <input
                        value={mailAccountForm.imapPort}
                        onChange={(event) =>
                          setMailAccountForm((current) => ({
                            ...current,
                            imapPort: event.target.value,
                          }))
                        }
                        placeholder={m.imap_port_placeholder()}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
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
                      <span className="text-muted-foreground">{m.use_tls_ssl()}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppDialog>
    </div>
  );
}
