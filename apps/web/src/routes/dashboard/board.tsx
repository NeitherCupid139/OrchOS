import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BoardView } from "@/components/panels/BoardView";
import { api } from "@/lib/api";
import type { PlannerReminder } from "@/lib/api.types";
import { useUIStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard/board")({ component: BoardPage });

function BoardPage() {
  const boardFilter = useUIStore((s) => s.boardFilter);
  const [reminders, setReminders] = useState<PlannerReminder[]>([]);
  const [busyReminderId, setBusyReminderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void api.getPlannerStore().then((store) => {
      if (!cancelled) {
        setReminders(store.reminders);
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggleReminderComplete(reminderId: string, completed: boolean) {
    setBusyReminderId(reminderId);
    try {
      const store = await api.updatePlannerReminder({ id: reminderId, completed });
      setReminders(store.reminders);
    } finally {
      setBusyReminderId(null);
    }
  }

  async function handleDeleteReminder(reminderId: string) {
    setBusyReminderId(reminderId);
    try {
      const store = await api.deletePlannerReminder(reminderId);
      setReminders(store.reminders);
    } finally {
      setBusyReminderId(null);
    }
  }

  return (
    <BoardView
      boardFilter={boardFilter}
      reminders={reminders}
      busyReminderId={busyReminderId}
      onToggleReminderComplete={(reminder) => void handleToggleReminderComplete(reminder.id, !reminder.completed)}
      onDeleteReminder={(reminder) => void handleDeleteReminder(reminder.id)}
    />
  );
}
