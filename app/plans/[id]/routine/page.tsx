"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";

const daysOfWeekNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface TopicItem {
  _id?: string;
  name: string;
  description?: string;
  subtopics?: string[];
}

interface RoutineTaskItem {
  dayOfWeek: number;
  title: string;
  scheduledMinutes: number;
  isOffDay: boolean;
  startTime?: string;
  endTime?: string;
  assignedTopics?: string[];
}

interface PlanDetailItem {
  _id: string;
  title: string;
  topics?: TopicItem[];
  routineTasks?: RoutineTaskItem[];
}

export default function RoutineSetupPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params?.id as string;

  const [plan, setPlan] = useState<PlanDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routineTasks, setRoutineTasks] = useState<RoutineTaskItem[]>([]);

  useEffect(() => {
    if (!planId) return;
    fetch(`/api/plans/${planId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setPlan(data.data);
          if (data.data.routineTasks && data.data.routineTasks.length === 7) {
            const sorted = [...data.data.routineTasks]
              .sort((a, b) => {
                const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
                const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
                return dayA - dayB;
              })
              .map((t) => ({
                ...t,
                startTime: t.startTime || "09:00",
                endTime: t.endTime || "10:00",
                assignedTopics: t.assignedTopics || [],
              }));
            setRoutineTasks(sorted);
          } else {
            const defaultMonSun = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
              dayOfWeek: d,
              title: `${daysOfWeekNames[d]} Study`,
              scheduledMinutes: d === 0 ? 0 : 60,
              isOffDay: d === 0,
              startTime: "09:00",
              endTime: d === 0 ? "09:00" : "10:00",
              assignedTopics: [],
            }));
            setRoutineTasks(defaultMonSun);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [planId]);

  const calculateMinutes = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    let diff = eH * 60 + eM - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  const handleTaskChange = (
    index: number,
    field: keyof RoutineTaskItem,
    value: string | number | boolean | string[],
  ) => {
    const updated = [...routineTasks];
    const item = { ...updated[index], [field]: value };
    if (field === "startTime" || field === "endTime") {
      const s = field === "startTime" ? (value as string) : item.startTime || "09:00";
      const e = field === "endTime" ? (value as string) : item.endTime || "10:00";
      item.scheduledMinutes = calculateMinutes(s, e);
    }
    updated[index] = item;
    setRoutineTasks(updated);
  };

  const handleToggleAssignedTopic = (taskIndex: number, topicName: string) => {
    setRoutineTasks((prev) =>
      prev.map((t, i) => {
        if (i !== taskIndex) return t;
        const currentTopics = t.assignedTopics || [];
        const exists = currentTopics.includes(topicName);
        const nextTopics = exists
          ? currentTopics.filter((name) => name !== topicName)
          : [...currentTopics, topicName];
        return { ...t, assignedTopics: nextTopics };
      })
    );
  };

  const applyPreset = (
    preset: "weekdays2h" | "weekendWarrior" | "balanced1h",
  ) => {
    const updated = routineTasks.map((t) => {
      const d = t.dayOfWeek;
      if (preset === "weekdays2h") {
        const isWeekend = d === 0 || d === 6;
        return {
          ...t,
          scheduledMinutes: isWeekend ? 0 : 120,
          isOffDay: isWeekend,
          title: isWeekend ? "Rest Day" : "Intensive Study (2 hrs)",
          startTime: "09:00",
          endTime: isWeekend ? "09:00" : "11:00",
        };
      } else if (preset === "weekendWarrior") {
        const isWeekend = d === 0 || d === 6;
        return {
          ...t,
          scheduledMinutes: isWeekend ? 180 : 30,
          isOffDay: false,
          title: isWeekend
            ? "Weekend Deep Dive (3 hrs)"
            : "Quick Review (30m)",
          startTime: "09:00",
          endTime: isWeekend ? "12:00" : "09:30",
        };
      } else {
        return {
          ...t,
          scheduledMinutes: 60,
          isOffDay: false,
          title: "Balanced Study (1 hr)",
          startTime: "09:00",
          endTime: "10:00",
        };
      }
    });
    setRoutineTasks(updated);
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routineTasks }),
      });

      if (res.ok) {
        router.push("/routine");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#71717a] text-sm font-medium">Loading routine configuration...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12 text-[#71717a]">
        Roadmap plan not found.
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 space-y-4 pb-12 font-sans animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white border border-[#e4e4e7] px-6 py-4 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Badge
              variant="outline"
              className="bg-[#f4f4f5] border-[#e4e4e7] text-black font-semibold shrink-0"
            >
              Step 2: Configure Routine
            </Badge>
            <h1 className="text-2xl font-black text-[#1e1e1e] tracking-tight">
              Configure 7-Day Routine: <span className="underline">{plan.title}</span>
            </h1>
          </div>
          <p className="text-[#71717a] text-sm mt-1">
            Set scheduled study target hours for Monday through Sunday.
          </p>
        </div>
      </div>

      {/* 1-Click Presets */}
      <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs">
        <h3 className="text-base font-bold text-black mb-1">
          Quick Presets
        </h3>
        <p className="text-xs text-[#71717a] mb-4">
          Click any preset template to populate your schedule instantly:
        </p>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => applyPreset("weekdays2h")}
            className="px-4 py-2 rounded-md bg-[#f4f4f5] hover:bg-[#e4e4e7] text-black border border-[#e4e4e7] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            Weekdays Intensive (2 hrs/day)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("weekendWarrior")}
            className="px-4 py-2 rounded-md bg-[#f4f4f5] hover:bg-[#e4e4e7] text-black border border-[#e4e4e7] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            Weekend Warrior (3 hrs Sat/Sun)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("balanced1h")}
            className="px-4 py-2 rounded-md bg-[#f4f4f5] hover:bg-[#e4e4e7] text-black border border-[#e4e4e7] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            Balanced Daily (1 hr/day)
          </button>
        </div>
      </Card>

      {/* Routine Form */}
      <form onSubmit={handleSaveRoutine} className="space-y-4">
        <div className="space-y-2.5">
          {routineTasks.map((task, idx) => {
            const dayName = daysOfWeekNames[task.dayOfWeek];

            return (
              <Card
                key={task.dayOfWeek}
                className={`p-4 transition-all border ${
                  task.isOffDay
                    ? "opacity-60 bg-[#f4f4f5] border-[#e4e4e7]"
                    : "bg-white border-[#e4e4e7] shadow-2xs"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-40 shrink-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        task.isOffDay ? "bg-[#a1a1aa]" : "bg-black"
                      }`}
                    />
                    <span className="font-bold text-black text-sm">
                      {dayName}
                    </span>
                  </div>

                  <div className="flex-1">
                    <Input
                      type="text"
                      disabled={task.isOffDay}
                      value={task.title}
                      onChange={(e) =>
                        handleTaskChange(idx, "title", e.target.value)
                      }
                      placeholder="Session Description"
                      className="bg-white border-[#e4e4e7] text-black"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#71717a] font-medium hidden sm:inline">From:</span>
                      <Input
                        type="time"
                        disabled={task.isOffDay}
                        value={task.startTime || "09:00"}
                        onChange={(e) =>
                          handleTaskChange(idx, "startTime", e.target.value)
                        }
                        className="w-28 px-2 text-center font-mono text-xs font-bold bg-white border-[#e4e4e7] text-black"
                      />
                      <span className="text-xs text-[#71717a] font-medium">To:</span>
                      <Input
                        type="time"
                        disabled={task.isOffDay}
                        value={task.endTime || "10:00"}
                        onChange={(e) =>
                          handleTaskChange(idx, "endTime", e.target.value)
                        }
                        className="w-28 px-2 text-center font-mono text-xs font-bold bg-white border-[#e4e4e7] text-black"
                      />
                    </div>

                    <div className="bg-[#f4f4f5] px-2.5 py-1.5 rounded border border-[#e4e4e7] font-mono text-xs font-bold text-black min-w-[50px] text-center">
                      {task.isOffDay ? "0m" : `${task.scheduledMinutes}m`}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-black font-medium min-w-[70px]">
                      <input
                        type="checkbox"
                        checked={task.isOffDay}
                        onChange={(e) => {
                          const off = e.target.checked;
                          handleTaskChange(idx, "isOffDay", off);
                          if (off) {
                            handleTaskChange(idx, "scheduledMinutes", 0);
                          } else {
                            const mins = calculateMinutes(task.startTime || "09:00", task.endTime || "10:00");
                            handleTaskChange(idx, "scheduledMinutes", mins);
                          }
                        }}
                        className="rounded border-[#a1a1aa] text-black focus:ring-black w-4 h-4"
                      />
                      <span>Off Day</span>
                    </label>
                  </div>
                </div>

                {!task.isOffDay && plan?.topics && plan.topics.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#f4f4f5] flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#71717a] mr-1">Assign Topics for {dayName}:</span>
                    {plan.topics.map((topicItem, tIdx) => {
                      const isAssigned = (task.assignedTopics || []).includes(topicItem.name);
                      return (
                        <button
                          key={tIdx}
                          type="button"
                          onClick={() => handleToggleAssignedTopic(idx, topicItem.name)}
                          className={`px-2.5 py-1 rounded text-xs font-medium border transition-all cursor-pointer ${
                            isAssigned
                              ? "bg-black text-white border-black shadow-2xs"
                              : "bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7] hover:bg-[#e4e4e7]"
                          }`}
                        >
                          {isAssigned ? "✓ " : "+ "}{topicItem.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => router.push("/plans")}
            className="px-5 py-2 rounded-md bg-[#f4f4f5] hover:bg-[#e4e4e7] text-black text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-md bg-black hover:bg-[#27272a] text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {saving ? "Saving..." : "Save Routine & Go to Tracker"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
