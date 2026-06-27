"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import PomodoroTimer from "@/components/PomodoroTimer";
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar as CalendarIcon,
  CalendarCheck2,
} from "lucide-react";

interface RoutineTask {
  dayOfWeek: number;
  title: string;
  scheduledMinutes: number;
  isOffDay: boolean;
  startTime?: string;
  endTime?: string;
  assignedTopics?: string[];
}

interface PlanItem {
  _id: string;
  title: string;
  status: string;
  routineTasks?: RoutineTask[];
}

interface DailyLogItem {
  completedRoutineTaskIds: string[];
  actualMinutes: number;
  startTime?: string;
  endTime?: string;
  notes: string;
  reflection?: string;
}

interface ScheduledTaskItem extends RoutineTask {
  taskId: string;
  planTitle: string;
  planId: string;
}

const calculateMinutes = (start: string, end: string) => {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  let diff = eH * 60 + eM - (sH * 60 + sM);
  if (diff < 0) diff += 24 * 60;
  return diff;
};

export default function DailyRoutinePage() {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(true);
  const [activePlans, setActivePlans] = useState<PlanItem[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLogItem>({
    completedRoutineTaskIds: [],
    actualMinutes: 0,
    startTime: "",
    endTime: "",
    notes: "",
    reflection: "",
  });
  const [savingNotes, setSavingNotes] = useState(false);
  const [manualAddMins, setManualAddMins] = useState("30");
  const [logStartTime, setLogStartTime] = useState("09:00");
  const [logEndTime, setLogEndTime] = useState("10:00");

  const dayOfWeek = new Date(selectedDate + "T00:00:00").getDay();

  const fetchRoutineData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, logRes] = await Promise.all([
        fetch("/api/plans"),
        fetch(`/api/logs?date=${selectedDate}`),
      ]);

      const plansData = await plansRes.json();
      const logData = await logRes.json();

      if (plansData.success) {
        setActivePlans(
          plansData.data.filter((p: PlanItem) => p.status === "active"),
        );
      }

      if (logData.success && logData.data.length > 0) {
        const log = logData.data[0];
        setDailyLog(log);
        if (log.startTime) setLogStartTime(log.startTime);
        if (log.endTime) setLogEndTime(log.endTime);
      } else {
        setDailyLog({
          completedRoutineTaskIds: [],
          actualMinutes: 0,
          startTime: "",
          endTime: "",
          notes: "",
          reflection: "",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchRoutineData();
    });
  }, [fetchRoutineData]);

  const scheduledTasks: ScheduledTaskItem[] = [];
  let totalScheduledMins = 0;

  activePlans.forEach((plan) => {
    const task = plan.routineTasks?.find((t) => t.dayOfWeek === dayOfWeek);
    if (task && !task.isOffDay) {
      scheduledTasks.push({
        ...task,
        taskId: `${plan._id}_${task.dayOfWeek}`,
        planTitle: plan.title,
        planId: plan._id,
      });
      totalScheduledMins += task.scheduledMinutes || 0;
    }
  });

  const handleToggleTask = async (taskId: string, mins: number) => {
    const completed = dailyLog.completedRoutineTaskIds || [];
    const isDone = completed.includes(taskId);
    const updatedCompleted = isDone
      ? completed.filter((id: string) => id !== taskId)
      : [...completed, taskId];

    const timeDelta = isDone ? -mins : mins;
    const updatedActual = Math.max(
      (dailyLog.actualMinutes || 0) + timeDelta,
      0,
    );

    const updatedLog = {
      ...dailyLog,
      completedRoutineTaskIds: updatedCompleted,
      actualMinutes: updatedActual,
    };
    setDailyLog(updatedLog);

    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        completedRoutineTaskIds: updatedCompleted,
        actualMinutes: updatedActual,
        scheduledMinutes: totalScheduledMins,
      }),
    });
  };

  const handleTimerComplete = async (loggedMins: number) => {
    const updatedActual = (dailyLog.actualMinutes || 0) + loggedMins;
    setDailyLog({ ...dailyLog, actualMinutes: updatedActual });

    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        actualMinutes: updatedActual,
        scheduledMinutes: totalScheduledMins,
      }),
    });
  };


  const handleLogTimeWindow = async () => {
    const mins = calculateMinutes(logStartTime, logEndTime);
    if (mins <= 0) return;

    const updatedActual = (dailyLog.actualMinutes || 0) + mins;
    setDailyLog({ ...dailyLog, actualMinutes: updatedActual, startTime: logStartTime, endTime: logEndTime });

    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        actualMinutes: updatedActual,
        scheduledMinutes: totalScheduledMins,
        startTime: logStartTime,
        endTime: logEndTime,
      }),
    });
  };

  const handleSaveNotesReflection = async () => {
    setSavingNotes(true);
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          notes: dailyLog.notes,
          reflection: dailyLog.reflection,
        }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNotes(false);
    }
  };

  const daysNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const isSunday = dayOfWeek === 0;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 space-y-4 pb-12 font-sans animate-in fade-in duration-300">
      {/* Header & Date Selector */}
      <div className="bg-white border border-[#e4e4e7] px-6 py-4 rounded-xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <CalendarCheck2 className="w-6 h-6 text-[#1e1e1e]" />
            <h1 className="text-2xl font-black text-[#1e1e1e] tracking-tight">
              Daily Routine Tracker
            </h1>
          </div>
          <p className="text-[#71717a] text-sm mt-1">
            Check off scheduled tasks, run your focus timer, and log hours.
          </p>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2 bg-[#f4f4f5] px-3 py-2 rounded-md border border-[#e4e4e7]">
          <CalendarIcon className="w-4 h-4 text-black" />
          <span className="text-xs font-semibold text-[#52525b]">
            {daysNames[dayOfWeek]}:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-black text-sm font-bold focus:outline-none cursor-pointer pr-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Routine Tasks & Manual Entry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scheduled Routine Tasks List */}
          <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-black tracking-tight">
                  Scheduled Tasks for {daysNames[dayOfWeek]}
                </h3>
                <p className="text-xs text-[#71717a] mt-0.5">
                  Click any task to check it off and log study time.
                </p>
              </div>
              <Badge
                variant="outline"
                className="bg-[#f4f4f5] border-[#e4e4e7] text-black font-semibold"
              >
                {scheduledTasks.length} Scheduled
              </Badge>
            </div>

            {loading ? (
              <div className="py-12 text-center text-[#71717a]">
                Loading tasks...
              </div>
            ) : scheduledTasks.length === 0 ? (
              <div className="py-12 text-center bg-[#f4f4f5] rounded-md border border-[#e4e4e7]">
                <p className="text-sm text-black font-semibold">
                  No Routine Tasks Scheduled for Today
                </p>
                <p className="text-xs text-[#71717a] mt-1">
                  This is marked as an Off Day on your roadmap routines.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {scheduledTasks.map((task) => {
                  const isDone =
                    dailyLog.completedRoutineTaskIds?.includes(task.taskId);

                  return (
                    <div
                      key={task.taskId}
                      onClick={() =>
                        handleToggleTask(task.taskId, task.scheduledMinutes)
                      }
                      className={`p-4 rounded-md border transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                        isDone
                          ? "bg-[#f4f4f5] border-[#e4e4e7] text-[#71717a]"
                          : "bg-white border-[#e4e4e7] hover:border-[#a1a1aa] text-black shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-[#a1a1aa] shrink-0" />
                        )}
                        <div>
                          <Badge
                            variant="outline"
                            className="text-[10px] mb-1 bg-[#f4f4f5] border-[#e4e4e7] text-black"
                          >
                            {task.planTitle}
                          </Badge>
                          <h4
                            className={`text-sm font-bold ${
                              isDone ? "line-through text-[#71717a]" : "text-black"
                            }`}
                          >
                            {task.title}
                          </h4>
                          {task.assignedTopics && task.assignedTopics.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {task.assignedTopics.map((tName, tIdx) => (
                                <span key={tIdx} className="px-1.5 py-0.5 bg-[#f4f4f5] border border-[#e4e4e7] rounded text-[10px] font-mono text-[#52525b]">
                                  📚 {tName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs bg-[#f4f4f5] px-2.5 py-1 rounded border border-[#e4e4e7] text-black">
                        {task.startTime && task.endTime && (
                          <span className="text-[#71717a] font-normal">
                            {task.startTime} - {task.endTime} •
                          </span>
                        )}
                        <span>{task.scheduledMinutes}m</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Record Study Window Card */}
          <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs">
            <h3 className="text-base font-bold text-black mb-1">
              Log Actual Study Window
            </h3>
            <p className="text-xs text-[#71717a] mb-4">
              Record the exact start and end times you studied for {selectedDate}.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-[#f4f4f5] px-3 py-2 rounded-md border border-[#e4e4e7]">
                <span className="text-xs text-[#52525b] font-semibold">Start:</span>
                <input
                  type="time"
                  value={logStartTime}
                  onChange={(e) => setLogStartTime(e.target.value)}
                  className="bg-transparent text-black font-mono font-bold text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 bg-[#f4f4f5] px-3 py-2 rounded-md border border-[#e4e4e7]">
                <span className="text-xs text-[#52525b] font-semibold">End:</span>
                <input
                  type="time"
                  value={logEndTime}
                  onChange={(e) => setLogEndTime(e.target.value)}
                  className="bg-transparent text-black font-mono font-bold text-xs focus:outline-none"
                />
              </div>

              <div className="bg-[#f4f4f5] px-3 py-2 rounded-md border border-[#e4e4e7] font-mono font-bold text-xs text-black">
                {calculateMinutes(logStartTime, logEndTime)}m logged
              </div>

              <button
                type="button"
                onClick={handleLogTimeWindow}
                className="px-4 py-2 rounded-md bg-black hover:bg-[#27272a] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer ml-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Study Window</span>
              </button>
            </div>
          </Card>

          {/* Notes & Weekly Reflection */}
          <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-black">
                Study Notes & Reflection
              </h3>
              {isSunday && (
                <Badge
                  variant="outline"
                  className="bg-[#f4f4f5] border-[#e4e4e7] text-black font-semibold"
                >
                  Weekly Review Day
                </Badge>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-black mb-1.5">
                What did you learn today?
              </label>
              <Textarea
                value={dailyLog.notes || ""}
                onChange={(e) =>
                  setDailyLog({ ...dailyLog, notes: e.target.value })
                }
                placeholder="Write down key takeaways..."
                className="bg-white border-[#e4e4e7] text-black"
              />
            </div>

            {isSunday && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-black mb-1.5">
                  Sunday Reflection: How did this week go?
                </label>
                <Textarea
                  value={dailyLog.reflection || ""}
                  onChange={(e) =>
                    setDailyLog({ ...dailyLog, reflection: e.target.value })
                  }
                  placeholder="Review your accomplishments..."
                  className="bg-white border-[#e4e4e7] text-black"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={savingNotes}
                onClick={handleSaveNotesReflection}
                className="px-4 py-2 rounded-md bg-black hover:bg-[#27272a] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Pomodoro Timer & Summary */}
        <div className="space-y-6">
          {/* Daily Time Summary Banner */}
          <Card className="p-6 bg-white border border-[#e4e4e7] text-center shadow-2xs">
            <p className="text-xs font-semibold text-[#71717a] mb-1">
              Logged for {selectedDate}
            </p>
            <div className="text-4xl font-extrabold text-black tracking-tight font-mono my-2">
              {Math.round(((dailyLog.actualMinutes || 0) / 60) * 10) / 10}{" "}
              <span className="text-sm font-normal text-[#71717a]">hrs</span>
            </div>
            <p className="text-xs text-[#71717a]">
              ({dailyLog.actualMinutes || 0} mins logged vs {totalScheduledMins}{" "}
              mins scheduled)
            </p>
          </Card>

          {/* Pomodoro Timer */}
          <PomodoroTimer
            onSessionComplete={handleTimerComplete}
            defaultMinutes={25}
          />
        </div>
      </div>
    </div>
  );
}
