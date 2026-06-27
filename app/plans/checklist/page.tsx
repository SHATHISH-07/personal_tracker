"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  BookOpen,
} from "lucide-react";

interface ChecklistItem {
  _id?: string;
  title: string;
  completed: boolean;
}

interface TopicItem {
  _id?: string;
  name: string;
  description?: string;
  subtopics?: string[];
  checklist?: ChecklistItem[];
  monthNumber?: number;
  periodNumber?: number;
  completed: boolean;
}

interface PlanItem {
  _id: string;
  title: string;
  planType: "weekly" | "monthly";
  status: string;
  colorAccent: string;
  topics: TopicItem[];
}

export default function TopicsChecklistPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");

  // Load roadmaps
  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans");
        const data = await res.json();
        if (data.success) {
          const loadedPlans = data.data || [];
          setPlans(loadedPlans);
          if (loadedPlans.length > 0) {
            setSelectedPlanId(loadedPlans[0]._id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const selectedPlan = plans.find((p) => p._id === selectedPlanId);
  const topics = selectedPlan?.topics || [];
  const currentTopic = topics[selectedTopicIndex] || null;


  // Normalize checklist items (migrate legacy subtopics strings if checklist is empty)
  const getNormalizedChecklist = (topic: TopicItem): ChecklistItem[] => {
    if (topic.checklist && topic.checklist.length > 0) {
      return topic.checklist;
    }
    if (topic.subtopics && topic.subtopics.length > 0) {
      return topic.subtopics.map((st) => ({ title: st, completed: false }));
    }
    return [];
  };

  const updateTopicInPlan = async (updatedTopic: TopicItem) => {
    if (!selectedPlan) return;
    setSaving(true);

    const updatedTopics = [...selectedPlan.topics];
    updatedTopics[selectedTopicIndex] = updatedTopic;

    // Check if all checklist items are completed to auto-complete topic
    const items = getNormalizedChecklist(updatedTopic);
    if (items.length > 0) {
      updatedTopic.completed = items.every((i) => i.completed);
    }

    // Optimistically update local state immediately for instant feedback
    setPlans((prev) =>
      prev.map((p) =>
        p._id === selectedPlan._id ? { ...p, topics: updatedTopics } : p
      )
    );

    try {
      const res = await fetch(`/api/plans/${selectedPlan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: updatedTopics }),
      });
      const data = await res.json();
      if (data.success) {
        setPlans((prev) =>
          prev.map((p) => (p._id === selectedPlan._id ? data.data : p))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim() || !currentTopic) return;

    const currentItems = getNormalizedChecklist(currentTopic);
    const newItems = [...currentItems, { title: newItemTitle.trim(), completed: false }];

    // Sync back to subtopics strings as well
    const updatedSubtopics = newItems.map((i) => i.title);

    setNewItemTitle("");
    await updateTopicInPlan({
      ...currentTopic,
      checklist: newItems,
      subtopics: updatedSubtopics,
    });
  };

  const handleToggleItem = async (index: number) => {
    if (!currentTopic) return;
    const currentItems = getNormalizedChecklist(currentTopic);
    const newItems = currentItems.map((item, idx) =>
      idx === index ? { ...item, completed: !item.completed } : item
    );
    const updatedSubtopics = newItems.map((i) => i.title);

    await updateTopicInPlan({
      ...currentTopic,
      checklist: newItems,
      subtopics: updatedSubtopics,
    });
  };

  const handleDeleteItem = async (index: number) => {
    if (!currentTopic) return;
    const currentItems = getNormalizedChecklist(currentTopic);
    const newItems = currentItems.filter((_, idx) => idx !== index);
    const updatedSubtopics = newItems.map((i) => i.title);

    await updateTopicInPlan({
      ...currentTopic,
      checklist: newItems,
      subtopics: updatedSubtopics,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] p-8 flex items-center justify-center font-sans">
        <p className="text-sm font-bold text-[#71717a] animate-pulse">
          Loading Topics Checklist...
        </p>
      </div>
    );
  }

  const checklistItems = currentTopic ? getNormalizedChecklist(currentTopic) : [];
  const completedCount = checklistItems.filter((i) => i.completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 space-y-4 pb-12 font-sans">
      <div className="w-full max-w-none space-y-8 animate-in fade-in duration-300">
        {/* Page Header */}
        <div className="bg-white border border-[#e4e4e7] px-6 py-4 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-[#1e1e1e]" />
              <h1 className="text-2xl font-black text-[#1e1e1e] tracking-tight">
                Topics Checklist
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
              {saving && (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 font-bold animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 mr-1 inline" /> Saving...
                </Badge>
              )}

              {/* Roadmap Plan Dropdown */}
              <select
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  setSelectedTopicIndex(0);
                }}
                className="bg-[#f4f4f5] border border-[#e4e4e7] rounded-xl px-4 py-3 text-sm font-bold text-black focus:outline-none focus:border-black cursor-pointer max-w-[220px] truncate"
              >
                {plans.length === 0 ? (
                  <option value="">No Roadmaps</option>
                ) : (
                  plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title} ({p.planType === "weekly" ? "Weekly" : "Monthly"})
                    </option>
                  ))
                )}
              </select>

              {/* Topic Dropdown */}
              <select
                value={selectedTopicIndex}
                onChange={(e) => setSelectedTopicIndex(Number(e.target.value))}
                disabled={topics.length === 0}
                className="bg-[#f4f4f5] border border-[#e4e4e7] rounded-xl px-4 py-3 text-sm font-bold text-black focus:outline-none focus:border-black cursor-pointer max-w-[240px] truncate disabled:opacity-50"
              >
                {topics.length === 0 ? (
                  <option value="0">No Topics</option>
                ) : (
                  topics.map((t, idx) => (
                    <option key={idx} value={idx}>
                      {t.name} (Period {t.periodNumber || t.monthNumber || 1}) {t.completed ? "✓ Done" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {!selectedPlan || !currentTopic ? (
          <Card className="p-16 text-center border border-dashed border-[#d4d4d8] bg-white shadow-2xs rounded-2xl">
            <BookOpen className="w-12 h-12 text-[#a1a1aa] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-black mb-2">
              No Topic Selected
            </h3>
            <p className="text-sm text-[#71717a] max-w-md mx-auto mb-6">
              Create a roadmap plan first or select an active topic from the dropdown above to manage subtopics and checklists.
            </p>
            <button
              onClick={() => router.push("/plans/create")}
              className="px-6 py-3 rounded-xl bg-black text-white font-extrabold text-sm hover:bg-[#27272a] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create New Plan
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Topic Details & Progress Overview */}
            <div className="space-y-6 lg:col-span-1">
              <Card className="p-6 border border-[#e4e4e7] bg-white rounded-2xl shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-[#f4f4f5] text-black border border-[#e4e4e7] px-3 py-1 font-bold text-xs">
                    {selectedPlan.planType === "weekly" ? "Week" : "Month"} {currentTopic.periodNumber || currentTopic.monthNumber || 1}
                  </Badge>
                  {currentTopic.completed ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 font-extrabold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Topic Completed
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 font-extrabold text-xs">
                      In Progress
                    </Badge>
                  )}
                </div>

                <h2 className="text-2xl font-black text-black leading-tight">
                  {currentTopic.name}
                </h2>

                <div className="bg-[#f4f4f5] p-4 rounded-xl border border-[#e4e4e7]">
                  <span className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider block mb-1">
                    Topic Description & Objectives
                  </span>
                  <p className="text-sm text-[#3f3f46] leading-relaxed whitespace-pre-wrap">
                    {currentTopic.description || "No specific description provided for this topic."}
                  </p>
                </div>

                {/* Progress Bar Banner */}
                <div className="pt-4 border-t border-[#e4e4e7] space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span className="text-[#52525b]">Checklist Completion</span>
                    <span className="text-black font-mono">
                      {completedCount} / {totalCount} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#f4f4f5] h-3 rounded-full overflow-hidden border border-[#e4e4e7]">
                    <div
                      className={`h-full transition-all duration-500 ${
                        progressPercent === 100 ? "bg-emerald-600" : "bg-black"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Subtopics Checklist Management */}
            <div className="space-y-6 lg:col-span-2">
              <Card className="p-6 md:p-8 border border-[#e4e4e7] bg-white rounded-2xl shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e4e4e7]">
                  <div>
                    <h3 className="text-lg font-black text-black">
                      Subtopics & Checklist Items
                    </h3>
                    <p className="text-xs text-[#71717a] mt-0.5">
                      Break down &quot;{currentTopic.name}&quot; into actionable milestones. Check them off as you complete them.
                    </p>
                  </div>
                  <Badge className="bg-[#f4f4f5] text-black border border-[#e4e4e7] px-3 py-1 font-bold text-xs self-start sm:self-auto font-mono">
                    {totalCount - completedCount} Remaining
                  </Badge>
                </div>

                {/* Add Item Form */}
                <form onSubmit={handleAddItem} className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="e.g., Read documentation chapter 3, Complete practice lab..."
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    className="flex-1 bg-[#f4f4f5] border-[#e4e4e7] focus:border-black font-bold text-sm px-4 py-6 rounded-xl"
                  />
                  <button
                    type="submit"
                    disabled={!newItemTitle.trim()}
                    className="px-6 py-3 rounded-xl bg-black hover:bg-[#27272a] disabled:opacity-40 text-white font-extrabold text-sm flex items-center gap-2 shrink-0 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </form>

                {/* Checklist List */}
                {checklistItems.length === 0 ? (
                  <div className="p-12 text-center bg-[#f4f4f5] border border-dashed border-[#d4d4d8] rounded-2xl">
                    <CheckSquare className="w-8 h-8 text-[#a1a1aa] mx-auto mb-2" />
                    <p className="text-sm font-bold text-black">No subtopics or checklists added yet</p>
                    <p className="text-xs text-[#71717a] mt-1">Use the input box above to add your first checklist milestone.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {checklistItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleToggleItem(idx)}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${
                          item.completed
                            ? "bg-emerald-50/60 border-emerald-200 text-[#3f3f46]"
                            : "bg-white border-[#e4e4e7] hover:border-black shadow-2xs hover:shadow-sm text-black"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleItem(idx);
                            }}
                            className="shrink-0 focus:outline-none"
                          >
                            {item.completed ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Circle className="w-6 h-6 text-[#a1a1aa] group-hover:text-black transition-colors" />
                            )}
                          </button>
                          <span
                            className={`font-bold text-sm leading-snug wrap-break-word ${
                              item.completed ? "line-through text-[#71717a]" : "text-black"
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                              item.completed
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7]"
                            }`}
                          >
                            {item.completed ? "Done" : "Remaining"}
                          </Badge>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(idx);
                            }}
                            title="Delete Item"
                            className="p-2 text-[#a1a1aa] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
