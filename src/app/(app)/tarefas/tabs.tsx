"use client";

import { useState } from "react";
import { CalendarClock, LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "agenda" | "kanban" | "nova";

export function TarefasTabs({
  agenda,
  kanban,
  nova,
}: {
  agenda: React.ReactNode;
  kanban: React.ReactNode;
  nova: React.ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("kanban");
  const tabs: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: "agenda", label: "Agenda", icon: <CalendarClock size={15} /> },
    { key: "kanban", label: "Kanban", icon: <LayoutGrid size={15} /> },
    { key: "nova", label: "Nova tarefa", icon: <Plus size={15} /> },
  ];
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMode(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === t.key
                ? "bg-blue-600 text-white"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className={mode === "agenda" ? "" : "hidden"}>{agenda}</div>
      <div className={mode === "kanban" ? "" : "hidden"}>{kanban}</div>
      <div className={mode === "nova" ? "" : "hidden"}>{nova}</div>
    </div>
  );
}
