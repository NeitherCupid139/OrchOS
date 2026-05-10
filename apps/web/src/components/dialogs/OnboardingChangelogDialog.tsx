import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { FramerCarousel } from "@/components/ui/framer-carousel";
import { m } from "@/paraglide/messages";
import {
  Bookmark01Icon,
  Calendar03Icon,
  Mail01Icon,
  Chat01Icon,
  File02Icon,
} from "@hugeicons/core-free-icons";

const ONBOARDING_SECTIONS = [
  {
    id: "creation",
    icon: Chat01Icon,
    title: "Creation",
    desc: "Your AI command center — chat, search, and create with agents all in one place.",
  },
  {
    id: "mail",
    icon: Mail01Icon,
    title: "Mail",
    desc: "Unified inbox for all your email accounts. Read, reply, and manage with ease.",
  },
  {
    id: "calendar",
    icon: Calendar03Icon,
    title: "Calendar",
    desc: "Keep track of your schedule with a full-featured calendar and event management.",
  },
  {
    id: "bookmarks",
    icon: Bookmark01Icon,
    title: "Bookmarks",
    desc: "Pin your most-used bookmarks for quick access from the Creation view.",
  },
  {
    id: "board",
    icon: File02Icon,
    title: "Board",
    desc: "Kanban-style task management with subtasks, priorities, tags, and due dates.",
  },
];

interface OnboardingChangelogDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingChangelogDialog({ open, onClose }: OnboardingChangelogDialogProps) {
  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={m.welcome_to_orchos()}
      size="lg"
      className="max-w-2xl"
      footer={
        <Button size="sm" type="button" variant="outline" onClick={onClose}>
          {m.dismiss()}
        </Button>
      }
    >
      <FramerCarousel items={ONBOARDING_SECTIONS} />
    </AppDialog>
  );
}
