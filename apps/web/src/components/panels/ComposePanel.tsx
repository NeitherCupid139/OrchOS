import { useState, useCallback, useEffect } from "react";
import {
  Cancel01Icon,
  ArrowExpand01Icon,
  ArrowShrink01Icon,
  MailEdit02Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { RecipientChips } from "@/components/ui/recipient-chips";
import { RichTextEditor, htmlToPlainText } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import {
  compose_mail,
  mail_from,
  mail_to,
  mail_cc,
  mail_bcc,
  mail_subject,
  send,
  sending,
  mail_sent_success,
  no_mail_account_for_send,
  recipient_placeholder,
  subject_placeholder,
  body_placeholder,
  cancel,
} from "@/paraglide/messages";

type PanelState = "closed" | "normal" | "minimized" | "maximized";

interface MailAccount {
  id: string;
  label: string;
  email?: string;
  username?: string;
  source?: string;
}

interface ComposePanelProps {
  open: boolean;
  onClose: () => void;
  accounts: MailAccount[];
  onSend: (data: {
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
    bodyHtml: string;
    accountId: string;
  }) => Promise<void>;
  sendingMail: boolean;
  sendMailError: string | null;
  sendMailSent: boolean;
}

export function ComposePanel({
  open,
  onClose,
  accounts,
  onSend,
  sendingMail,
  sendMailError,
  sendMailSent,
}: ComposePanelProps) {
  // Store the user's desired panel state; derives from open prop
  const [userPanelState, setUserPanelState] = useState<PanelState>("normal");
  const panelState: PanelState = !open ? "closed" : userPanelState;

  const [showBcc, setShowBcc] = useState(false);
  const [form, setForm] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    bodyHtml: "",
    accountId: "" as string,
  });

  // Reset form after successful send
  useEffect(() => {
    if (sendMailSent) {
      const timer = setTimeout(() => {
        setForm({ to: "", cc: "", bcc: "", subject: "", bodyHtml: "", accountId: "" });
        setShowBcc(false);
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [sendMailSent, onClose]);

  const handleClose = useCallback(() => {
    // If form has content, we could show a confirmation here
    setUserPanelState("closed");
    onClose();
  }, [onClose]);

  const handleMinimize = useCallback(() => {
    setUserPanelState("minimized");
  }, []);

  const handleMaximizeToggle = useCallback(() => {
    setUserPanelState((prev) => (prev === "maximized" ? "normal" : "maximized"));
  }, []);

  const handleSend = useCallback(async () => {
    const toList = form.to
      .split(",")
      .flatMap((e) => { const v = e.trim(); return v ? [v] : []; });
    if (toList.length === 0 || !form.subject.trim()) return;

    const accountId = form.accountId || accounts[0]?.id;
    if (!accountId) return;

    await onSend({
      to: form.to,
      cc: form.cc,
      bcc: form.bcc,
      subject: form.subject,
      body: htmlToPlainText(form.bodyHtml || ""),
      bodyHtml: form.bodyHtml,
      accountId,
    });
  }, [form, accounts, onSend]);

  return (
    <AnimatePresence>
      {panelState !== "closed" && (
        <>
          {/* Minimized bar at bottom-right */}
          {panelState === "minimized" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed right-4 bottom-0 z-30 flex w-72 items-center gap-2 rounded-t-xl border border-border/60 border-b-0 bg-card px-4 py-2.5 shadow-lg cursor-pointer"
              onClick={() => setUserPanelState("normal")}
            >
              <HugeiconsIcon icon={MailEdit02Icon} className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate text-[13px] font-medium text-foreground">
                {form.subject || compose_mail()}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
              </button>
            </motion.div>
          )}

          {/* Main compose panel */}
          {panelState !== "minimized" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={cn(
                "fixed right-4 bottom-4 z-30 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl",
                panelState === "maximized"
                  ? "left-4 top-4"
                  : "w-[560px] max-h-[min(85vh,720px)]",
              )}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                <span className="flex-1 text-[13px] font-semibold text-foreground">
                  {compose_mail()}
                </span>
                <button
                  type="button"
                  onClick={handleMinimize}
                  aria-label="Minimize"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 10.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleMaximizeToggle}
                  title={panelState === "maximized" ? "Restore" : "Maximize"}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {panelState === "maximized" ? (
                    <HugeiconsIcon icon={ArrowShrink01Icon} className="size-3.5" />
                  ) : (
                    <HugeiconsIcon icon={ArrowExpand01Icon} className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  title="Close"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </button>
              </div>

              {/* Form body */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {/* From selector */}
                <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2">
                  <span className="w-10 shrink-0 text-right text-[13px] text-muted-foreground">
                    {mail_from()}
                  </span>
                  <select
                    value={form.accountId || accounts[0]?.id || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accountId: e.target.value }))
                    }
                    className="flex-1 bg-transparent text-[13px] text-foreground outline-none"
                  >
                    {accounts.length === 0 ? (
                      <option value="">{no_mail_account_for_send()}</option>
                    ) : (
                      accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.label} ({account.email || account.username})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* To */}
                <div className="flex items-start gap-3 border-b border-border/40 px-4 py-2">
                  <span className="w-10 shrink-0 pt-1.5 text-right text-[13px] text-muted-foreground">
                    {mail_to()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <RecipientChips
                      value={form.to}
                      onChange={(val) => setForm((f) => ({ ...f, to: val }))}
                      placeholder={recipient_placeholder()}
                    />
                    <div className="mt-1 flex items-center gap-3">
                      {!showBcc && (
                        <button
                          type="button"
                          onClick={() => setShowBcc(true)}
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {mail_cc()} / {mail_bcc()}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cc */}
                {form.cc || showBcc ? (
                  <div className="flex items-start gap-3 border-b border-border/40 px-4 py-2">
                    <span className="w-10 shrink-0 pt-1.5 text-right text-[13px] text-muted-foreground">
                      {mail_cc()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <RecipientChips
                        value={form.cc}
                        onChange={(val) => setForm((f) => ({ ...f, cc: val }))}
                        placeholder={recipient_placeholder()}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Bcc */}
                {showBcc && (
                  <div className="flex items-start gap-3 border-b border-border/40 px-4 py-2">
                    <span className="w-10 shrink-0 pt-1.5 text-right text-[13px] text-muted-foreground">
                      {mail_bcc()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <RecipientChips
                        value={form.bcc}
                        onChange={(val) => setForm((f) => ({ ...f, bcc: val }))}
                        placeholder={recipient_placeholder()}
                      />
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2">
                  <span className="w-10 shrink-0 text-right text-[13px] text-muted-foreground">
                    {mail_subject()}
                  </span>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, subject: e.target.value }))
                    }
                    placeholder={subject_placeholder()}
                    className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </div>

                {/* Body - Rich text editor */}
                <div className="px-3 py-3">
                  <RichTextEditor
                    value={form.bodyHtml}
                    onChange={(html) =>
                      setForm((f) => ({ ...f, bodyHtml: html }))
                    }
                    placeholder={body_placeholder()}
                    minHeight="200px"
                  />
                </div>

                {/* Status messages */}
                {sendMailError && (
                  <div className="mx-4 mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                    {sendMailError}
                  </div>
                )}
                {sendMailSent && (
                  <div className="mx-4 mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    {mail_sent_success()}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-muted-foreground"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                  <span className="ml-1">{cancel()}</span>
                </Button>
                <Button
                  type="button"
                  disabled={
                    sendingMail ||
                    !form.to.trim() ||
                    !form.subject.trim() ||
                    (!form.accountId && accounts.length === 0)
                  }
                  onClick={() => void handleSend()}
                  size="sm"
                >
                  {sendingMail ? sending() : send()}
                </Button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
