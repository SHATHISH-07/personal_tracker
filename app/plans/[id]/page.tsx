"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  DownloadCloud,
} from "lucide-react";
import { generatePerformanceReport } from "@/lib/generateReport";

interface TopicItem {
  _id?: string;
  name: string;
  description?: string;
  subtopics?: string[];
  monthNumber?: number;
  periodNumber?: number;
  completed: boolean;
}

interface PlanItem {
  _id: string;
  title: string;
  planType?: "weekly" | "monthly";
  durationMonths: number;
  description: string;
  status: "active" | "completed" | "paused";
  topics?: TopicItem[];
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params?.id as string;

  const [plan, setPlan] = useState<PlanItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Plan Info State
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDuration, setEditDuration] = useState("1");
  const [savingInfo, setSavingInfo] = useState(false);

  // Add New Topic State
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [newTopicPeriod, setNewTopicPeriod] = useState("1");
  const [addingTopic, setAddingTopic] = useState(false);

  const fetchPlan = useCallback(async () => {
    if (!planId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/plans/${planId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setPlan(data.data);
        setEditTitle(data.data.title || "");
        setEditDesc(data.data.description || "");
        setEditDuration(String(data.data.durationMonths || 1));
      }
    } catch (e) {
      console.error("Failed to load plan details", e);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchPlan();
    });
  }, [fetchPlan]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !editTitle.trim()) return;
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/plans/${plan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          durationMonths: parseInt(editDuration, 10) || 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPlan(data.data);
        setIsEditingInfo(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleTogglePlanStatus = async () => {
    if (!plan) return;
    const completedTopics =
      plan.topics?.filter((t) => t.completed)?.length || 0;
    const totalTopics = plan.topics?.length || 0;
    const newStatus = plan.status === "completed" ? "active" : "completed";

    if (
      newStatus === "completed" &&
      (completedTopics < totalTopics || totalTopics === 0)
    ) {
      alert(
        "Please check off all plan topics before marking this plan as completed.",
      );
      return;
    }

    try {
      const res = await fetch(`/api/plans/${plan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) setPlan(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlan = async () => {
    if (!plan || !confirm("Are you sure you want to delete this roadmap plan?"))
      return;
    try {
      await fetch(`/api/plans/${plan._id}`, { method: "DELETE" });
      router.push("/plans");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadReport = async () => {
    if (!plan) return;
    try {
      await generatePerformanceReport(plan);
    } catch (e) {
      console.error("Failed to generate PDF", e);
      alert("Failed to generate the report. Please try again.");
    }
  };

  const handleDeleteTopic = async (topicIndex: number) => {
    if (!plan || !confirm("Are you sure you want to remove this topic?"))
      return;
    const updatedTopics = (plan.topics || []).filter(
      (_, idx) => idx !== topicIndex,
    );
    try {
      setPlan({ ...plan, topics: updatedTopics });
      await fetch(`/api/plans/${plan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: updatedTopics }),
      });
    } catch (e) {
      console.error(e);
      fetchPlan();
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !newTopicName.trim()) return;
    setAddingTopic(true);

    const pNum = parseInt(newTopicPeriod, 10) || 1;

    const newTopic: TopicItem = {
      name: newTopicName.trim(),
      description: newTopicDesc.trim(),
      subtopics: [],
      monthNumber: pNum,
      periodNumber: pNum,
      completed: false,
    };

    const updatedTopics = [...(plan.topics || []), newTopic];
    try {
      const res = await fetch(`/api/plans/${plan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: updatedTopics }),
      });
      const data = await res.json();
      if (data.success) {
        setPlan(data.data);
        setNewTopicName("");
        setNewTopicDesc("");
        setNewTopicPeriod("1");
        setIsAddingTopic(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTopic(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading roadmap details..." />;
  }

  if (!plan) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center font-sans space-y-4">
        <AlertCircle className="w-12 h-12 text-[#71717a] mx-auto" />
        <h2 className="text-xl font-bold text-black">Roadmap Not Found</h2>
        <p className="text-sm text-[#71717a]">
          The requested roadmap plan could not be loaded or may have been
          deleted.
        </p>
        <button
          onClick={() => router.push("/plans")}
          className="px-5 py-2.5 rounded-xl bg-[#272727] text-white font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Roadmaps</span>
        </button>
      </div>
    );
  }

  const completedTopics = plan.topics?.filter((t) => t.completed)?.length || 0;
  const totalTopics = plan.topics?.length || 0;
  const progressPct =
    totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
  const periodLabel = plan.planType === "weekly" ? "Week" : "Month";

  const periods = Array.from(
    new Set(
      (plan.topics || []).map((t) => t.periodNumber || t.monthNumber || 1),
    ),
  ).sort((a, b) => a - b);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16 font-sans animate-in fade-in duration-300">
      {/* Top Navigation & Actions Bar */}
      <div className="bg-white border border-[#e4e4e7] p-4 sm:p-6 rounded-xl shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-row items-center gap-4">
          <button
            onClick={() => router.push("/plans")}
            className="p-2.5 rounded-xl bg-[#f4f4f5] border border-[#e4e4e7] hover:bg-[#272727] hover:text-white text-black transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
            title="Back to Roadmaps"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#1e1e1e] tracking-tight truncate">
                {plan.title}
              </h1>
              <Badge className="bg-[#f4f4f5] text-black border border-[#e4e4e7] text-[10px] font-bold uppercase shrink-0">
                {plan.planType === "weekly" ? "Weekly" : "Monthly"}
              </Badge>
              <span
                className={`text-[10px] sm:text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-md border shadow-2xs shrink-0 ${
                  plan.status === "completed"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-blue-100 text-blue-800 border-blue-300 animate-pulse"
                }`}
              >
                {plan.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto mt-2 lg:mt-0">
          <button
            onClick={handleTogglePlanStatus}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all cursor-pointer shadow-2xs w-full sm:w-auto ${
              plan.status === "completed"
                ? "bg-[#272727] text-white border-black hover:bg-[#27272a]"
                : completedTopics === totalTopics && totalTopics > 0
                  ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 animate-bounce"
                  : "bg-[#f4f4f5] text-black border-[#e4e4e7] hover:border-black"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {plan.status === "completed" ? "Completed ✓" : "Mark Completed"}
            </span>
          </button>

          {plan.status === "completed" && (
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer w-full sm:w-auto"
              title="Download Performance Report"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          )}

          <button
            onClick={handleDeletePlan}
            className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center justify-center w-full sm:w-auto"
            title="Delete Roadmap"
          >
            <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
            <span className="sm:hidden text-xs font-extrabold">
              Delete Plan
            </span>
          </button>
        </div>
      </div>

      {/* Roadmap Overview / Edit Info Section */}
      <Card className="p-4 sm:p-6 lg:p-8 bg-white border-[#e4e4e7] shadow-2xs rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4e4e7] pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-black">
              Edit Roadmap
            </h2>
          </div>

          <button
            onClick={() => setIsEditingInfo(!isEditingInfo)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all cursor-pointer shadow-2xs w-full sm:w-auto ${
              isEditingInfo
                ? "bg-[#272727] text-white border-black"
                : "bg-[#f4f4f5] text-black border-[#e4e4e7] hover:border-black"
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{isEditingInfo ? "Close Edit" : "Edit Plan Info"}</span>
          </button>
        </div>

        {isEditingInfo ? (
          <form
            onSubmit={handleSaveInfo}
            className="space-y-4 bg-[#f4f4f5] p-4 sm:p-6 rounded-xl border border-[#e4e4e7]"
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-[#52525b]">
              Edit Roadmap Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-black">
                  Plan Title *
                </label>
                <Input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="bg-white border-[#e4e4e7] text-black font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-black">
                  Duration ({periodLabel}s)
                </label>
                <Select
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  className="bg-white border-[#e4e4e7] text-black font-bold h-10 w-full"
                >
                  <option value="1">1 {periodLabel}</option>
                  <option value="2">2 {periodLabel}s</option>
                  <option value="3">3 {periodLabel}s</option>
                  <option value="4">4 {periodLabel}s</option>
                  <option value="6">6 {periodLabel}s</option>
                  <option value="8">8 {periodLabel}s</option>
                  <option value="12">12 {periodLabel}s</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black">
                Description & Objectives
              </label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={4}
                className="bg-white border-[#e4e4e7] text-black text-sm w-full"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsEditingInfo(false)}
                className="px-4 py-2 rounded-lg bg-white border border-[#e4e4e7] hover:bg-[#e4e4e7] text-black font-bold text-xs cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingInfo || !editTitle.trim()}
                className="px-6 py-2 rounded-lg bg-[#272727] hover:bg-[#27272a] text-white font-bold text-xs cursor-pointer disabled:opacity-50 w-full sm:w-auto"
              >
                {savingInfo ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#71717a] mb-1">
                  Plan Title
                </h3>
                <p className="text-base font-bold text-black wrap-break-words">
                  {plan.title}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#71717a] mb-1">
                  Description & Objectives
                </h3>
                <div className="text-sm font-medium text-[#27272a] leading-relaxed bg-[#fafafa] p-4 rounded-xl border border-[#f4f4f5] whitespace-pre-wrap wrap-break-words">
                  {plan.description ||
                    "No specific description provided for this roadmap."}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#71717a] mb-1">
                Duration
              </h3>
              <p className="text-sm font-bold text-black bg-[#f4f4f5] px-3 py-2 rounded-lg inline-block border border-[#e4e4e7]">
                {plan.durationMonths} {periodLabel}
                {plan.durationMonths === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Milestone Checklist & Topics Section */}
      <Card className="p-4 sm:p-6 lg:p-8 bg-white border-[#e4e4e7] shadow-2xs rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4e4e7] pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black flex items-center gap-2">
              Edit Topics
            </h2>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
            <div className="text-left sm:text-right flex sm:block justify-between items-center">
              <span className="text-xs font-black text-black block">
                {completedTopics} / {totalTopics} Completed
              </span>
              <span className="text-[10px] font-bold text-[#71717a] sm:block">
                {Math.round(progressPct)}% Mastery
              </span>
            </div>
            <button
              onClick={() => setIsAddingTopic(!isAddingTopic)}
              className="px-4 py-2.5 rounded-xl bg-[#272727] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingTopic ? "Close Add Form" : "Add New Topic"}</span>
            </button>
          </div>
        </div>

        <Progress value={progressPct} className="h-2.5" />

        {/* Inline Add Topic Form */}
        {isAddingTopic && (
          <form
            onSubmit={handleAddTopic}
            className="bg-[#f4f4f5] p-4 sm:p-6 rounded-xl border border-[#e4e4e7] space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-black">
                Add Topic to Curriculum
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingTopic(false)}
                className="text-xs font-bold text-[#71717a] hover:text-black cursor-pointer p-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#52525b] mb-1.5">
                  Target {periodLabel}
                </label>
                <Select
                  value={newTopicPeriod}
                  onChange={(e) => setNewTopicPeriod(e.target.value)}
                  className="w-full bg-white border-[#e4e4e7] text-black text-sm h-10 font-bold"
                >
                  {Array.from(
                    { length: plan.durationMonths || 12 },
                    (_, i) => i + 1,
                  ).map((m) => (
                    <option key={m} value={m}>
                      {periodLabel} {m}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-[#52525b] mb-1.5">
                  Topic / Module Name *
                </label>
                <Input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="e.g. Asynchronous Programming & Promises"
                  required
                  className="bg-white border-[#e4e4e7] text-black text-sm h-10 font-bold w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#52525b] mb-1.5">
                Scope & Description (Optional)
              </label>
              <Textarea
                value={newTopicDesc}
                onChange={(e) => setNewTopicDesc(e.target.value)}
                placeholder="Briefly explain what you plan to learn or build..."
                rows={3}
                className="bg-white border-[#e4e4e7] text-black text-sm p-3 rounded-lg w-full"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={addingTopic || !newTopicName.trim()}
                className="px-6 py-2.5 rounded-lg bg-[#272727] hover:bg-[#27272a] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all h-10 disabled:opacity-50 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{addingTopic ? "Adding..." : "Save Topic"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Topics List Grouped by Period */}
        <div className="space-y-6 pt-2">
          {totalTopics === 0 ? (
            <div className="py-12 px-4 text-center bg-[#fafafa] rounded-xl border border-dashed border-[#e4e4e7] text-[#71717a]">
              <p className="text-sm font-semibold text-black mb-1">
                No curriculum topics added yet.
              </p>
              <p className="text-xs mb-4">
                Click &quot;Add New Topic&quot; above to add milestones to your
                roadmap.
              </p>
              <button
                onClick={() => setIsAddingTopic(true)}
                className="px-4 py-2 rounded-lg bg-[#272727] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Topic</span>
              </button>
            </div>
          ) : (
            periods.map((pNum) => {
              const periodTopics = (plan.topics || []).filter(
                (t) => (t.periodNumber || t.monthNumber || 1) === pNum,
              );
              if (periodTopics.length === 0) return null;

              return (
                <div key={pNum} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#272727] text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-2xs">
                      {periodLabel} {pNum}
                    </span>
                    <span className="text-xs font-bold text-[#71717a]">
                      ({periodTopics.filter((t) => t.completed).length}/
                      {periodTopics.length} done)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {periodTopics.map((topic) => {
                      const origIdx = (plan.topics || []).indexOf(topic);
                      return (
                        <div
                          key={origIdx}
                          className={`flex items-start justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all ${
                            topic.completed
                              ? "bg-[#f4f4f5] border-[#e4e4e7] text-[#71717a]"
                              : "bg-white border-[#e4e4e7] text-black hover:border-black shadow-2xs"
                          }`}
                        >
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <span
                                className={`font-extrabold text-sm sm:text-base block wrap-break-words ${
                                  topic.completed
                                    ? "line-through text-[#71717a]"
                                    : "text-black"
                                }`}
                              >
                                {topic.name}
                              </span>
                              {topic.description && (
                                <div className="mt-2 text-xs sm:text-sm font-normal text-[#27272a] bg-[#fafafa] p-3 rounded-lg border border-[#f4f4f5] leading-relaxed whitespace-pre-wrap wrap-break-words">
                                  {topic.description}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTopic(origIdx);
                            }}
                            className="p-2 text-[#a1a1aa] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 self-start"
                            title="Delete topic"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
