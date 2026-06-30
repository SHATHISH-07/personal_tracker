"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckSquare,
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
  const [expandedTopicIndex, setExpandedTopicIndex] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItemTitles, setNewItemTitles] = useState<Record<number, string>>(
    {},
  );

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

  const getNormalizedChecklist = (topic: TopicItem): ChecklistItem[] => {
    if (topic.checklist && topic.checklist.length > 0) return topic.checklist;
    if (topic.subtopics && topic.subtopics.length > 0) {
      return topic.subtopics.map((st) => ({ title: st, completed: false }));
    }
    return [];
  };

  const updateTopicInPlan = async (
    topicIndex: number,
    updatedTopic: TopicItem,
  ) => {
    if (!selectedPlan) return;
    setSaving(true);

    const items = getNormalizedChecklist(updatedTopic);
    if (items.length > 0) {
      updatedTopic.completed = items.every((i) => i.completed);
    }

    const updatedTopics = [...selectedPlan.topics];
    updatedTopics[topicIndex] = updatedTopic;

    setPlans((prev) =>
      prev.map((p) =>
        p._id === selectedPlan._id ? { ...p, topics: updatedTopics } : p,
      ),
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
          prev.map((p) => (p._id === selectedPlan._id ? data.data : p)),
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTopic = async (topicIndex: number) => {
    if (!selectedPlan) return;
    const topic = selectedPlan.topics[topicIndex];
    const currentItems = getNormalizedChecklist(topic);
    if (currentItems.length > 0) return;

    await updateTopicInPlan(topicIndex, {
      ...topic,
      completed: !topic.completed,
    });
  };

  const handleAddItem = async (e: React.FormEvent, topicIndex: number) => {
    e.preventDefault();
    const title = newItemTitles[topicIndex] || "";
    if (!title.trim() || !selectedPlan) return;

    const topic = selectedPlan.topics[topicIndex];
    const currentItems = getNormalizedChecklist(topic);
    const newItems = [
      ...currentItems,
      { title: title.trim(), completed: false },
    ];
    const updatedSubtopics = newItems.map((i) => i.title);

    setNewItemTitles((prev) => ({ ...prev, [topicIndex]: "" }));
    await updateTopicInPlan(topicIndex, {
      ...topic,
      checklist: newItems,
      subtopics: updatedSubtopics,
    });
  };

  const handleToggleItem = async (topicIndex: number, itemIndex: number) => {
    if (!selectedPlan) return;
    const topic = selectedPlan.topics[topicIndex];
    const currentItems = getNormalizedChecklist(topic);
    const newItems = currentItems.map((item, idx) =>
      idx === itemIndex ? { ...item, completed: !item.completed } : item,
    );
    const updatedSubtopics = newItems.map((i) => i.title);

    await updateTopicInPlan(topicIndex, {
      ...topic,
      checklist: newItems,
      subtopics: updatedSubtopics,
    });
  };

  const handleDeleteItem = async (topicIndex: number, itemIndex: number) => {
    if (!selectedPlan) return;
    const topic = selectedPlan.topics[topicIndex];
    const currentItems = getNormalizedChecklist(topic);
    const newItems = currentItems.filter((_, idx) => idx !== itemIndex);
    const updatedSubtopics = newItems.map((i) => i.title);

    await updateTopicInPlan(topicIndex, {
      ...topic,
      checklist: newItems,
      subtopics: updatedSubtopics,
    });
  };

  if (loading) {
    return <LoadingSpinner message="Loading Topics Checklist..." />;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-12 font-sans">
      <div className="w-full max-w-none space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        {/* Page Header */}
        <div className="bg-white border border-[#e4e4e7] px-4 sm:px-6 py-4 rounded-xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-[#1e1e1e] tracking-tight">
              Topics Checklist
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {saving && (
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 font-bold animate-pulse justify-center">
                Saving...
              </Badge>
            )}

            {/* Roadmap Plan Dropdown */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-[#f4f4f5] px-3 py-2 sm:py-1.5 rounded-xl border border-[#e4e4e7] w-full sm:w-auto">
              <span className="text-xs font-extrabold text-black shrink-0">
                Plan:
              </span>
              <select
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  setExpandedTopicIndex(null);
                }}
                className="bg-transparent text-sm font-bold text-black focus:outline-none cursor-pointer w-full sm:max-w-[250px] truncate"
              >
                {plans.length === 0 ? (
                  <option value="">No Roadmaps</option>
                ) : (
                  plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {!selectedPlan ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center w-full animate-in fade-in zoom-in-95 duration-300">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-[#a1a1aa] mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-bold text-black mb-2">
              No Roadmap Selected
            </h3>
            <p className="text-sm text-[#71717a] max-w-md mx-auto mb-6">
              Create a roadmap plan first or select an active plan from the
              dropdown above to manage subtopics and checklists.
            </p>
            <button
              onClick={() => router.push("/plans/create")}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-black text-white font-extrabold text-sm hover:bg-[#27272a] transition-all cursor-pointer inline-flex justify-center items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create New Plan
            </button>
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center w-full animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-base font-bold text-black mb-1">
              No Topics Created Yet
            </h3>
            <p className="text-[#71717a] text-sm max-w-md mx-auto mb-6">
              This roadmap has no topics. Go to the roadmap overview to add
              curriculum milestones.
            </p>
            <button
              onClick={() => router.push(`/plans/${selectedPlan._id}`)}
              className="w-full sm:w-auto px-4 py-2 rounded-md bg-black text-white font-semibold text-xs inline-flex justify-center items-center gap-2 shadow-xs hover:bg-[#27272a] cursor-pointer"
            >
              Go to Roadmap
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {topics.map((topic, topicIdx) => {
              const checklistItems = getNormalizedChecklist(topic);
              const completedCount = checklistItems.filter(
                (i) => i.completed,
              ).length;
              const totalCount = checklistItems.length;
              const hasChecklistItems = totalCount > 0;
              const progressPercent = hasChecklistItems
                ? Math.round((completedCount / totalCount) * 100)
                : topic.completed
                  ? 100
                  : 0;
              const isExpanded = expandedTopicIndex === topicIdx;

              return (
                <Card
                  key={topicIdx}
                  className={`overflow-hidden border transition-all ${
                    isExpanded
                      ? "border-black shadow-md rounded-2xl"
                      : "border-[#e4e4e7] shadow-2xs hover:border-[#a1a1aa] rounded-sm"
                  } bg-white`}
                >
                  {/* Topic Header (Clickable to Expand) */}
                  <div
                    onClick={() =>
                      setExpandedTopicIndex(isExpanded ? null : topicIdx)
                    }
                    className="p-4 sm:p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none group"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTopic(topicIdx);
                        }}
                        disabled={hasChecklistItems || saving}
                        title={
                          hasChecklistItems
                            ? "Complete the checklist items to finish this topic"
                            : topic.completed
                              ? "Mark topic as in progress"
                              : "Mark topic as completed"
                        }
                        className={`mt-1 shrink-0 rounded-full transition-colors ${
                          hasChecklistItems
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:scale-105"
                        }`}
                      >
                        {topic.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-6 h-6 text-[#a1a1aa] hover:text-black" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5">
                          <Badge className="bg-[#f4f4f5] text-black border border-[#e4e4e7] px-2 py-0.5 font-bold text-[0.625rem] uppercase tracking-wider">
                            {selectedPlan.planType === "weekly"
                              ? "Week"
                              : "Month"}{" "}
                            {topic.periodNumber || topic.monthNumber || 1}
                          </Badge>
                          {topic.completed ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-extrabold text-[0.625rem] flex items-center gap-1 uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 font-extrabold text-[0.625rem] uppercase tracking-wider">
                              In Progress
                            </Badge>
                          )}
                        </div>
                        <h2
                          className={`text-lg sm:text-xl font-black leading-tight wrap-break-words group-hover:underline ${
                            topic.completed
                              ? "text-[#71717a] line-through"
                              : "text-black"
                          }`}
                        >
                          {topic.name}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto md:shrink-0 mt-2 md:mt-0 pt-3 md:pt-0 border-t border-[#e4e4e7] md:border-none">
                      <div className="text-left md:text-right flex-1 md:flex-initial">
                        <span className="text-xs font-black text-black block">
                          {hasChecklistItems
                            ? `${completedCount} / ${totalCount} Subtopics`
                            : topic.completed
                              ? "Topic Completed"
                              : "Topic Pending"}
                        </span>
                        <span className="text-[0.625rem] font-bold text-[#71717a]">
                          {progressPercent}% Mastery
                        </span>
                      </div>
                      <div
                        className={`p-2 rounded-full transition-colors shrink-0 ${
                          isExpanded
                            ? "bg-[#272727] text-white"
                            : "bg-[#f4f4f5] text-black group-hover:bg-[#e4e4e7]"
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar (Always visible at bottom of header) */}
                  <div className="w-full bg-[#f4f4f5] h-1.5">
                    <div
                      className={`h-full transition-all duration-500 ${
                        progressPercent === 100
                          ? "bg-emerald-600"
                          : "bg-[#272727]"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Expanded Checklist Section */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 md:p-6 bg-[#fafafa] border-t border-[#e4e4e7] animate-in slide-in-from-top-2 duration-200">
                      {topic.description && (
                        <p className="text-sm text-[#3f3f46] leading-relaxed whitespace-pre-wrap mb-6 bg-white p-4 rounded-xl border border-[#e4e4e7]">
                          {topic.description}
                        </p>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-black text-black uppercase tracking-wider">
                            Checklist Items
                          </h3>
                          <Badge className="bg-white text-black border border-[#e4e4e7] px-2 py-0.5 font-bold text-xs font-mono">
                            {hasChecklistItems
                              ? `${totalCount - completedCount} Remaining`
                              : topic.completed
                                ? "Done"
                                : "Pending"}
                          </Badge>
                        </div>

                        {/* Add Item Form */}
                        <form
                          onSubmit={(e) => handleAddItem(e, topicIdx)}
                          className="flex flex-col sm:flex-row gap-2 sm:gap-3"
                        >
                          <Input
                            type="text"
                            placeholder="e.g., Read chapter 3, Complete lab..."
                            value={newItemTitles[topicIdx] || ""}
                            onChange={(e) =>
                              setNewItemTitles((prev) => ({
                                ...prev,
                                [topicIdx]: e.target.value,
                              }))
                            }
                            className="w-full sm:flex-1 bg-white border-[#e4e4e7] focus:border-black font-bold text-sm h-12 rounded-xl"
                          />
                          <button
                            type="submit"
                            disabled={!(newItemTitles[topicIdx] || "").trim()}
                            className="w-full sm:w-auto px-6 h-12 rounded-xl bg-[#272727] hover:bg-[#27272a] disabled:opacity-40 text-white font-extrabold text-sm flex items-center justify-center gap-2 shrink-0 shadow-sm transition-all cursor-pointer"
                          >
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </form>

                        {/* Checklist Items */}
                        {checklistItems.length === 0 ? (
                          <div className="p-6 sm:p-8 text-center border border-dashed border-[#d4d4d8] rounded-xl bg-white">
                            <CheckSquare className="w-6 h-6 text-[#a1a1aa] mx-auto mb-2" />
                            <p className="text-sm font-bold text-black">
                              No checklist items added
                            </p>
                            <p className="text-xs text-[#71717a] mt-1">
                              Use the topic checkbox above, or add smaller
                              actionable steps.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 pt-2">
                            {checklistItems.map((item, itemIdx) => (
                              <div
                                key={itemIdx}
                                onClick={() =>
                                  handleToggleItem(topicIdx, itemIdx)
                                }
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 rounded-xl border transition-all cursor-pointer group ${
                                  item.completed
                                    ? "bg-emerald-50/60 border-emerald-200 text-[#3f3f46]"
                                    : "bg-white border-[#e4e4e7] hover:border-black shadow-2xs hover:shadow-sm text-black"
                                }`}
                              >
                                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0 pr-0 sm:pr-4">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleItem(topicIdx, itemIdx);
                                    }}
                                    className="shrink-0 focus:outline-none mt-0.5 sm:mt-0"
                                  >
                                    {item.completed ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-[#a1a1aa] group-hover:text-black transition-colors" />
                                    )}
                                  </button>
                                  <span
                                    className={`font-bold text-sm leading-snug wrap-break-words ${
                                      item.completed
                                        ? "line-through text-[#71717a]"
                                        : "text-black"
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                </div>

                                <div className="flex items-center justify-end gap-3 shrink-0 ml-8 sm:ml-0">
                                  <Badge
                                    className={`text-[0.625rem] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                                      item.completed
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                        : "bg-[#f4f4f5] text-[#52525b] border-[#e4e4e7]"
                                    }`}
                                  >
                                    {item.completed ? "Done" : "Pending"}
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(topicIdx, itemIdx);
                                    }}
                                    title="Delete Item"
                                    className="p-2 sm:p-1.5 text-[#a1a1aa] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
