import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BoardTask, BoardTaskColumnId, BoardTaskPriority } from "@/lib/types";

function createBoardTaskId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `board-task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface CreateBoardTaskInput {
  title: string;
  description?: string;
  projectId?: string;
  dueDate?: string;
  priority: BoardTaskPriority;
  tags: string[];
  subtasks: string[];
  column?: BoardTaskColumnId;
}

interface UpdateBoardTaskInput {
  title?: string;
  description?: string;
  projectId?: string;
  dueDate?: string;
  priority?: BoardTaskPriority;
  tags?: string[];
  subtasks?: string[];
  column?: BoardTaskColumnId;
}

interface BoardState {
  tasks: BoardTask[];
}

interface BoardActions {
  createTask: (input: CreateBoardTaskInput) => BoardTask;
  updateTask: (id: string, input: UpdateBoardTaskInput) => void;
  deleteTask: (id: string) => void;
}

export const useBoardStore = create<BoardState & BoardActions>()(
  persist(
    (set) => ({
      tasks: [],
      createTask: (input) => {
        const now = new Date().toISOString();
        const task: BoardTask = {
          id: createBoardTaskId(),
          title: input.title.trim(),
          description: input.description?.trim() || undefined,
          projectId: input.projectId,
          dueDate: input.dueDate,
          priority: input.priority,
          tags: input.tags,
          subtasks: input.subtasks,
          column: input.column ?? "planning",
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          tasks: [task, ...state.tasks],
        }));

        return task;
      },
      updateTask: (id, input) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  ...input,
                  title: input.title !== undefined ? input.title.trim() : task.title,
                  description:
                    input.description !== undefined
                      ? input.description.trim() || undefined
                      : task.description,
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        }));
      },
      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }));
      },
    }),
    {
      name: "orchos-board",
      version: 1,
    },
  ),
);
