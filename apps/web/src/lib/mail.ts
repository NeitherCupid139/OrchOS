import type { InboxThread } from "@/lib/api";
import type { MailFolderFilter } from "@/components/layout/MailFolderTabs";

export function matchesMailFolder(thread: InboxThread, filter: MailFolderFilter) {
  switch (filter) {
    case "inbox":
      return !thread.archived && thread.status !== "completed";
    case "drafts":
      // Draft support pending backend implementation
      return false;
    case "sent":
      // Sent folder support pending backend implementation
      return false;
    case "spam":
      // Spam folder support pending backend implementation
      return false;
    case "trash":
      // Trash folder support pending backend implementation
      return false;
    case "archived":
      return thread.archived;
    default:
      return !thread.archived;
  }
}
