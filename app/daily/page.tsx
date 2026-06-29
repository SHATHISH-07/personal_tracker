"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TopicItem {
  name: string;
  monthNumber?: number;
  completed: boolean;
}

interface PlanItem {
  _id: string;
  title: string;
  status: string;
  topics?: TopicItem[];
}

interface StudySessionItem {
  _id?: string;
  startTime: string;
  endTime: string;
  actualMinutes: number;
  topicsCovered: string[];
  description: string;
}

interface DailyLogItem {
  _id?: string;
  actualMinutes: number;
  sessions?: StudySessionItem[];
}

const calculateMinutes = (start: string, end: string) => {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  let diff = eH * 60 + eM - (sH * 60 + sM);
  if (diff < 0) diff += 24 * 60;
  return diff;
};

export default function DailyRecordPage() {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [activePlans, setActivePlans] = useState<PlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [dailyLog, setDailyLog] = useState<DailyLogItem>({
    actualMinutes: 0,
    sessions: [],
  });

  // Daily Task Recorder Form State
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [selectedTopicsCovered, setSelectedTopicsCovered] = useState<string[]>(
    [],
  );
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Load all roadmaps
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/plans");
        const data = await res.json();
        if (data.success) {
          const allPlans = data.data || [];
          setActivePlans(allPlans);
          if (allPlans.length > 0 && !selectedPlanId) {
            setSelectedPlanId(allPlans[0]._id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadPlans();
  }, [selectedPlanId]);

  const fetchLogData = useCallback(async () => {
    if (!selectedPlanId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setEditingIndex(null);
    try {
      const logRes = await fetch(
        `/api/logs?date=${selectedDate}&planId=${selectedPlanId}`,
      );
      const logData = await logRes.json();

      if (logData.success && logData.data.length > 0) {
        setDailyLog(logData.data[0]);
      } else {
        setDailyLog({
          actualMinutes: 0,
          sessions: [],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedPlanId]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchLogData();
    });
  }, [fetchLogData]);

  const currentPlan = activePlans.find((p) => p._id === selectedPlanId);

  const toggleTopic = (topicName: string) => {
    setSelectedTopicsCovered((prev) =>
      prev.includes(topicName)
        ? prev.filter((t) => t !== topicName)
        : [...prev, topicName],
    );
  };

  const handleEditSession = (indexToEdit: number) => {
    if (!dailyLog.sessions) return;
    const sess = dailyLog.sessions[indexToEdit];
    setStartTime(sess.startTime || "09:00");
    setEndTime(sess.endTime || "10:30");
    setSelectedTopicsCovered(sess.topicsCovered || []);
    setDescription(sess.description || "");
    setEditingIndex(indexToEdit);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setStartTime("09:00");
    setEndTime("10:30");
    setSelectedTopicsCovered([]);
    setDescription("");
  };

  const handleDeleteSession = async (indexToDelete: number) => {
    if (!dailyLog.sessions || !selectedPlanId) return;
    if (
      !window.confirm("Are you sure you want to delete this recorded session?")
    )
      return;

    const updatedSessions = dailyLog.sessions.filter(
      (_, idx) => idx !== indexToDelete,
    );

    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          planId: selectedPlanId,
          sessions: updatedSessions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDailyLog(data.data);
        if (editingIndex === indexToDelete) cancelEdit();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !description.trim()) return;
    setSubmitting(true);

    const mins = calculateMinutes(startTime, endTime);
    const newSession: StudySessionItem = {
      startTime,
      endTime,
      actualMinutes: mins,
      topicsCovered: selectedTopicsCovered,
      description,
    };

    const currentSessions = dailyLog.sessions ? [...dailyLog.sessions] : [];
    if (editingIndex !== null && currentSessions[editingIndex]) {
      currentSessions[editingIndex] = newSession;
    } else {
      currentSessions.push(newSession);
    }

    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          planId: selectedPlanId,
          sessions: currentSessions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDailyLog(data.data);
        cancelEdit();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const durationMins = calculateMinutes(startTime, endTime);
  const durationHours = (durationMins / 60).toFixed(2);

  // Calculate total worked hours in that day based on recorded sessions
  const totalMinutesWorked =
    dailyLog.sessions && dailyLog.sessions.length > 0
      ? dailyLog.sessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0)
      : dailyLog.actualMinutes || 0;
  const totalHoursWorked = (totalMinutesWorked / 60).toFixed(2);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-12 font-sans">
      <div className="w-full max-w-none space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        {/* Top Header Bar */}
        <div className="bg-white border border-[#e4e4e7] p-4 sm:p-6 rounded-xl shadow-2xs flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1e1e1e] tracking-tight">
              Daily Plan Records
            </h1>
          </div>

          <div className="pt-4 border-t border-[#e4e4e7] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Roadmap Plan Dropdown */}
            <div className="bg-[#f4f4f5] px-4 py-3 rounded-xl border border-[#e4e4e7] flex flex-col justify-center min-h-[64px]">
              <span className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider mb-1">
                Select Roadmap Plan
              </span>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full bg-transparent font-extrabold text-sm text-black border-none focus:outline-none cursor-pointer p-0 truncate"
              >
                {activePlans.length === 0 ? (
                  <option value="">No Roadmaps Found</option>
                ) : (
                  activePlans.map((p) => (
                    <option
                      key={p._id}
                      value={p._id}
                      className="bg-white text-black font-semibold"
                    >
                      {p.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Date Selector */}
            <div className="bg-[#f4f4f5] px-4 py-3 rounded-xl border border-[#e4e4e7] flex flex-col justify-center min-h-[64px]">
              <span className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider mb-1">
                Log Date
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-transparent text-black text-sm font-extrabold focus:outline-none cursor-pointer p-0"
              />
            </div>

            {/* Total Hours Worked Banner */}
            <div className="bg-[#f4f4f5] px-4 py-3 rounded-xl border border-[#e4e4e7] flex flex-col justify-center min-h-[64px] sm:col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider mb-1">
                Total Hours Recorded
              </span>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-base font-black text-black">
                  {totalHoursWorked} hrs
                </span>
                <span className="text-xs font-semibold text-[#71717a]">
                  ({totalMinutesWorked}m)
                </span>
              </div>
            </div>
          </div>
        </div>

        {activePlans.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center border border-dashed border-[#d4d4d8] bg-white shadow-2xs rounded-2xl w-full">
            <h3 className="text-lg font-bold text-black mb-2">
              No Active Roadmap Available
            </h3>
            <p className="text-sm text-[#71717a] max-w-md mx-auto">
              Please create an active weekly or monthly upskill roadmap first
              before logging daily tasks against it.
            </p>
          </Card>
        ) : (
          <div className="space-y-8 w-full">
            {/* Daily Task Recorder Card */}
            <Card className="p-5 sm:p-8 bg-white border-[#e4e4e7] shadow-md rounded-2xl space-y-6 w-full">
              <div className="border-b border-[#e4e4e7] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-black">
                    {editingIndex !== null
                      ? `Edit Recorded Entry #${editingIndex + 1}`
                      : "Daily Task Recorder"}
                  </h2>
                  <p className="text-xs text-[#71717a] mt-0.5">
                    {editingIndex !== null
                      ? "Update your start/end time, topics, and description below."
                      : "Enter start time, end time, covered topics, and task details below."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {editingIndex !== null && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 rounded-lg bg-[#f4f4f5] hover:bg-[#e4e4e7] text-black font-bold text-xs cursor-pointer border border-[#e4e4e7]"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <Badge className="bg-[#f4f4f5] text-black border border-[#e4e4e7] font-mono text-xs px-3 py-1.5 font-bold truncate max-w-[200px] sm:max-w-xs">
                    Plan: {currentPlan?.title}
                  </Badge>
                </div>
              </div>

              <form onSubmit={handleRecordTask} className="space-y-6">
                {/* Time Bar: Start & End Time */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#52525b] uppercase tracking-wider">
                    Time Bar (Start & End Time)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 bg-[#f4f4f5] p-4 sm:p-6 rounded-xl border border-[#e4e4e7] sm:items-end">
                    <div>
                      <label className="block text-xs font-bold text-[#52525b] mb-1.5">
                        Start Time
                      </label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                        className="bg-white border-[#e4e4e7] font-mono font-bold text-base h-12 text-black w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#52525b] mb-1.5">
                        End Time
                      </label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                        className="bg-white border-[#e4e4e7] font-mono font-bold text-base h-12 text-black w-full"
                      />
                    </div>
                    <div>
                      <div className="bg-white border border-[#e4e4e7] px-4 sm:px-6 py-3 rounded-xl font-mono font-bold text-sm text-black text-center flex items-center justify-center gap-2 h-12 shadow-2xs w-full">
                        <span className="text-xs text-[#52525b] uppercase tracking-wider font-sans">
                          Duration:
                        </span>
                        <span className="text-base font-black text-black">
                          {durationMins}m ({durationHours}h)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topics Covered (Multi-Select) */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[#52525b] uppercase tracking-wider">
                    Topics Covered (Click to Select Multiple for this Record)
                  </label>
                  {!currentPlan?.topics || currentPlan.topics.length === 0 ? (
                    <p className="text-xs text-[#71717a] italic p-4 bg-[#f4f4f5] rounded-xl border border-[#e4e4e7]">
                      No topics configured in{" "}
                      {currentPlan?.title || "this plan"}.
                    </p>
                  ) : currentPlan.topics.filter((t) => !t.completed).length ===
                    0 ? (
                    <p className="text-xs text-[#71717a] italic p-4 bg-[#f4f4f5] rounded-xl border border-[#e4e4e7]">
                      All topics in this plan are completed! 🎉
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 sm:gap-2.5 p-3 sm:p-4 bg-[#f4f4f5] rounded-xl border border-[#e4e4e7]">
                      {currentPlan.topics
                        .filter((t) => !t.completed)
                        .map((t, idx) => {
                          const isSelected = selectedTopicsCovered.includes(
                            t.name,
                          );
                          return (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => toggleTopic(t.name)}
                              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-bold transition-all border cursor-pointer select-none flex items-center gap-2 sm:gap-2.5 ${
                                isSelected
                                  ? "bg-[#272727] text-white border-black shadow-md scale-[1.02]"
                                  : "bg-white text-[#52525b] border-[#e4e4e7] hover:border-black hover:text-black shadow-2xs"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isSelected ? "bg-white" : "bg-[#d4d4d8]"
                                }`}
                              />
                              <span className="text-left">{t.name}</span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* BIG Description Box */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#52525b] uppercase tracking-wider">
                    Detailed Description Box
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter thorough notes, tasks completed, code written, or chapters read during this session..."
                    rows={6}
                    required
                    className="bg-[#fafafa] border-[#e4e4e7] focus:bg-white text-black text-sm sm:text-base p-4 sm:p-5 rounded-xl leading-relaxed resize-y font-normal transition-all shadow-2xs w-full"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !description.trim()}
                  className="w-full py-3.5 sm:py-4 rounded-xl bg-[#272727] hover:bg-[#27272a] text-white font-extrabold text-sm shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>
                    {submitting
                      ? "Saving..."
                      : editingIndex !== null
                        ? "Update Recorded Entry"
                        : "Record Task Progress"}
                  </span>
                </button>
              </form>
            </Card>

            {/* Recorded Sessions List Today */}
            <div className="space-y-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 sm:px-2 gap-3">
                <h3 className="text-lg sm:text-xl font-black text-black tracking-tight">
                  Recorded Entries for {selectedDate}
                </h3>
                <Badge className="bg-white border-[#e4e4e7] text-black font-bold text-[10px] sm:text-xs px-3 py-1.5 shadow-2xs w-fit">
                  Total Hours Worked: {totalHoursWorked} hrs (
                  {totalMinutesWorked} mins)
                </Badge>
              </div>

              {loading ? (
                <div className="py-8 text-center font-bold text-[#71717a]">
                  Loading records...
                </div>
              ) : !dailyLog.sessions || dailyLog.sessions.length === 0 ? (
                <Card className="p-6 sm:p-8 text-center border border-dashed border-[#d4d4d8] bg-white shadow-2xs rounded-2xl w-full">
                  <p className="text-sm font-bold text-black mb-1">
                    No tasks recorded today
                  </p>
                  <p className="text-xs text-[#71717a]">
                    Use the form above to log your first session for{" "}
                    {selectedDate}.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4 w-full">
                  {dailyLog.sessions.map((sess, idx) => (
                    <Card
                      key={idx}
                      className="p-4 sm:p-6 bg-white border-[#e4e4e7] shadow-sm rounded-xl space-y-4 w-full"
                    >
                      {/* Top Time & Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f4f4f5] pb-3">
                        <div className="flex items-center gap-3 font-mono font-bold text-xs text-black">
                          <span className="px-3 py-1.5 bg-[#272727] text-white rounded-lg">
                            {sess.startTime} - {sess.endTime}
                          </span>
                          <span className="text-black font-extrabold text-sm">
                            +{sess.actualMinutes}m (
                            {((sess.actualMinutes || 0) / 60).toFixed(2)}h)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleEditSession(idx)}
                            className="px-3 py-1 bg-[#f4f4f5] hover:bg-[#e4e4e7] border border-[#e4e4e7] text-black text-xs font-bold rounded-lg cursor-pointer transition-all"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(idx)}
                            className="px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold rounded-lg cursor-pointer transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Prominent Topics Covered Row */}
                      <div className="bg-[#f4f4f5] p-3 sm:p-3.5 rounded-xl border border-[#e4e4e7]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#52525b] block mb-2">
                          Topics Covered in this Session:
                        </span>
                        {sess.topicsCovered && sess.topicsCovered.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {sess.topicsCovered.map((tName, tI) => (
                              <span
                                key={tI}
                                className="px-2.5 sm:px-3 py-1 bg-[#272727] text-white rounded-lg text-[10px] sm:text-xs font-bold shadow-2xs"
                              >
                                {tName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[#71717a] italic">
                            No specific topics selected
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#52525b] block mb-1.5">
                          Session Notes & Description:
                        </span>
                        <p className="text-xs sm:text-sm text-[#27272a] whitespace-pre-wrap leading-relaxed bg-[#fafafa] p-3 sm:p-4 rounded-xl border border-[#f4f4f5]">
                          {sess.description}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
