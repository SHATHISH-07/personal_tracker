"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Plus,
  ArrowRight,
  CheckSquare,
  Square,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface TopicItem {
  _id?: string;
  name: string;
  description?: string;
  subtopics?: string[];
  monthNumber?: number;
  periodNumber?: number;
  completed: boolean;
}

interface ResourceItem {
  title: string;
  url: string;
  type: "video" | "doc" | "book";
  notes?: string;
}

interface PlanItem {
  _id: string;
  title: string;
  planType?: "weekly" | "monthly";
  durationMonths: number;
  description: string;
  status: string;
  topics?: TopicItem[];
  resources?: ResourceItem[];
}

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all");
  const [detailModalPlanId, setDetailModalPlanId] = useState<string | null>(
    null,
  );
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [selectedPlanForResource, setSelectedPlanForResource] =
    useState<PlanItem | null>(null);

  const currentDetailPlan =
    plans.find((p) => p._id === detailModalPlanId) || null;
  const detailCompletedTopics =
    currentDetailPlan?.topics?.filter((t: TopicItem) => t.completed)?.length ||
    0;
  const detailTotalTopics = currentDetailPlan?.topics?.length || 0;
  const detailProgressPct =
    detailTotalTopics > 0
      ? (detailCompletedTopics / detailTotalTopics) * 100
      : 0;

  const [resTitle, setResTitle] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [resType, setResType] = useState<"video" | "doc" | "book">("doc");
  const [resNotes, setResNotes] = useState("");

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchPlans();
    });
  }, []);

  const handleTogglePlanStatus = async (plan: PlanItem) => {
    const completedTopics =
      plan.topics?.filter((t: TopicItem) => t.completed)?.length || 0;
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
      setPlans(
        plans.map((p) =>
          p._id === plan._id ? { ...p, status: newStatus } : p,
        ),
      );

      await fetch(`/api/plans/${plan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      fetchPlans();
    }
  };

  const handleToggleTopic = async (planId: string, topicIndex: number) => {
    const plan = plans.find((p) => p._id === planId);
    if (!plan) return;

    const updatedTopics = [...(plan.topics || [])];
    if (!updatedTopics[topicIndex]) return;
    updatedTopics[topicIndex].completed = !updatedTopics[topicIndex].completed;

    const allCompleted =
      updatedTopics.length > 0 && updatedTopics.every((t) => t.completed);
    const newStatus =
      !allCompleted && plan.status === "completed"
        ? "active"
        : allCompleted
          ? "completed"
          : plan.status;

    try {
      setPlans(
        plans.map((p) =>
          p._id === planId
            ? { ...p, topics: updatedTopics, status: newStatus }
            : p,
        ),
      );

      await fetch(`/api/plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: updatedTopics, status: newStatus }),
      });
    } catch {
      fetchPlans();
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this roadmap plan?")) return;
    try {
      await fetch(`/api/plans/${planId}`, { method: "DELETE" });
      fetchPlans();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForResource || !resTitle || !resUrl) return;

    const updatedResources = [
      ...(selectedPlanForResource.resources || []),
      { title: resTitle, url: resUrl, type: resType, notes: resNotes },
    ];

    try {
      const res = await fetch(`/api/plans/${selectedPlanForResource._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resources: updatedResources }),
      });

      if (res.ok) {
        setIsResourceModalOpen(false);
        setResTitle("");
        setResUrl("");
        setResNotes("");
        fetchPlans();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#71717a] text-sm font-medium">
          Loading roadmaps...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 space-y-4 pb-12 font-sans">
      <div className="w-full max-w-none space-y-8 animate-in fade-in duration-300">
        {/* Top Header Bar */}
        <div className="bg-white border border-[#e4e4e7] px-6 py-4 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#1e1e1e] tracking-tight">
                Upskill Plans
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
              {plans.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPlanFilter}
                    onChange={(e) => setSelectedPlanFilter(e.target.value)}
                    className="bg-[#f4f4f5] border border-[#e4e4e7] rounded-xl px-4 py-3 text-sm font-bold text-black focus:outline-none focus:border-black cursor-pointer"
                  >
                    <option value="all">All Roadmaps ({plans.length})</option>
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title} (
                        {p.planType === "weekly" ? "Weekly" : "Monthly"})
                      </option>
                    ))}
                  </select>
                  {selectedPlanFilter !== "all" && (
                    <button
                      onClick={() => setSelectedPlanFilter("all")}
                      className="text-xs font-bold text-[#71717a] hover:text-black underline cursor-pointer px-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => router.push("/plans/checklist")}
                className="px-5 py-3 rounded-xl bg-[#f4f4f5] border border-[#e4e4e7] hover:bg-black hover:text-white text-black font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Manage Topics Checklist ➔</span>
              </button>

              <button
                onClick={() => router.push("/plans/create")}
                className="px-6 py-3 rounded-xl bg-black hover:bg-[#27272a] text-white font-extrabold text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Plan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans List - One per row */}
        {plans.length === 0 ? (
          <Card className="p-12 text-center border border-dashed border-[#d4d4d8] bg-white shadow-2xs">
            <h3 className="text-base font-bold text-black mb-1">
              No Roadmaps Created Yet
            </h3>
            <p className="text-[#71717a] text-sm max-w-md mx-auto mb-6">
              Create your first weekly or monthly roadmap to organize learning
              topics and generate a custom routine.
            </p>
            <button
              onClick={() => router.push("/plans/create")}
              className="px-4 py-2 rounded-md bg-black text-white font-semibold text-xs inline-flex items-center gap-2 shadow-xs hover:bg-[#27272a]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start Planning</span>
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {(selectedPlanFilter === "all"
              ? plans
              : plans.filter((p) => p._id === selectedPlanFilter)
            ).map((plan) => {
              const completedTopics =
                plan.topics?.filter((t: TopicItem) => t.completed)?.length || 0;
              const totalTopics = plan.topics?.length || 0;
              const progressPct =
                totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

              return (
                <Card
                  key={plan._id}
                  onClick={() => setDetailModalPlanId(plan._id)}
                  className="p-6 bg-white border-[#e4e4e7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:shadow-md hover:border-black transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-xl font-extrabold text-black tracking-tight group-hover:underline">
                          {plan.title}
                        </h3>
                        <Badge className="bg-[#f4f4f5] text-black border border-[#e4e4e7] text-[10px] font-bold uppercase">
                          {plan.planType === "weekly" ? "Weekly" : "Monthly"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#71717a] mt-1">
                        <span>
                          Duration: {plan.durationMonths}{" "}
                          {plan.planType === "weekly"
                            ? plan.durationMonths === 1
                              ? "Week"
                              : "Weeks"
                            : plan.durationMonths === 1
                              ? "Month"
                              : "Months"}
                        </span>
                        <span>&bull;</span>
                        <span className="inline-flex items-center gap-1.5">
                          Status:{" "}
                          <span
                            className={`font-extrabold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider border shadow-2xs ${
                              plan.status === "completed"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-blue-100 text-blue-800 border-blue-300 animate-pulse"
                            }`}
                          >
                            {plan.status}
                          </span>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Checklist:{" "}
                          {totalTopics > 0
                            ? `${Math.round(progressPct)}% (${completedTopics}/${totalTopics})`
                            : "0% (0/0)"}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-[#52525b] mt-2 line-clamp-1 italic">
                          &quot;{plan.description}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(plan._id);
                      }}
                      title="Delete Roadmap"
                      className="p-2 rounded-lg text-[#a1a1aa] hover:text-black hover:bg-[#f4f4f5] transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-black bg-[#f4f4f5] px-4 py-2.5 rounded-xl border border-[#e4e4e7] group-hover:bg-black group-hover:text-white transition-colors">
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Resource Hub Modal */}
        <Dialog
          isOpen={isResourceModalOpen}
          onClose={() => setIsResourceModalOpen(false)}
          title={`Study Resources: ${selectedPlanForResource?.title || ""}`}
          description="Attach documentation, tutorials, and notes."
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedPlanForResource?.resources?.length === 0 ? (
                <p className="text-xs text-[#71717a] italic text-center py-4 bg-[#f4f4f5] rounded-md">
                  No study links attached yet.
                </p>
              ) : (
                selectedPlanForResource?.resources?.map(
                  (res: ResourceItem, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-md bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-between gap-3"
                    >
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-white border-[#e4e4e7] text-black font-semibold"
                          >
                            {res.type}
                          </Badge>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-black hover:underline flex items-center gap-1 truncate"
                          >
                            <span>{res.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                        {res.notes && (
                          <p className="text-xs text-[#71717a] mt-1 truncate">
                            {res.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>

            <form
              onSubmit={handleAddResource}
              className="space-y-3 pt-3 border-t border-[#e4e4e7]"
            >
              <h4 className="text-xs font-bold text-black">
                Attach Resource Link
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    value={resTitle}
                    onChange={(e) => setResTitle(e.target.value)}
                    placeholder="Title (e.g. Official Docs)"
                    required
                    className="bg-white border-[#e4e4e7] text-black"
                  />
                </div>
                <Select
                  value={resType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setResType(e.target.value as "video" | "doc" | "book")
                  }
                  className="bg-white border-[#e4e4e7] text-black"
                >
                  <option value="doc">Doc / Article</option>
                  <option value="video">Video Tutorial</option>
                  <option value="book">Book / Course</option>
                </Select>
              </div>
              <Input
                type="url"
                value={resUrl}
                onChange={(e) => setResUrl(e.target.value)}
                placeholder="https://..."
                required
                className="bg-white border-[#e4e4e7] text-black"
              />
              <Input
                value={resNotes}
                onChange={(e) => setResNotes(e.target.value)}
                placeholder="Quick takeaway note (optional)"
                className="bg-white border-[#e4e4e7] text-black"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-md bg-black text-white hover:bg-[#27272a] font-semibold text-xs transition-colors cursor-pointer"
              >
                Attach Link
              </button>
            </form>
          </div>
        </Dialog>

        {/* Plan Detail Modal */}
        <Dialog
          isOpen={!!currentDetailPlan}
          onClose={() => setDetailModalPlanId(null)}
          title={`Roadmap Details: ${currentDetailPlan?.title || ""}`}
          description="Track milestones, complete checklists, and manage resources."
          className="max-w-3xl sm:max-w-4xl p-8"
        >
          {currentDetailPlan && (
            <div className="space-y-6 pt-2 max-h-[75vh] overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f4f4f5] p-3 rounded-xl border border-[#e4e4e7]">
                <div className="flex items-center gap-2 text-xs font-bold text-black">
                  <Badge className="bg-white text-black border border-[#e4e4e7] uppercase text-[10px]">
                    {currentDetailPlan.planType === "weekly"
                      ? "Weekly"
                      : "Monthly"}
                  </Badge>
                  <span>
                    {currentDetailPlan.durationMonths}{" "}
                    {currentDetailPlan.planType === "weekly"
                      ? currentDetailPlan.durationMonths === 1
                        ? "Week"
                        : "Weeks"
                      : currentDetailPlan.durationMonths === 1
                        ? "Month"
                        : "Months"}{" "}
                    Duration
                  </span>
                </div>
                <span
                  className={`text-xs font-extrabold uppercase px-3 py-1 rounded-md border shadow-2xs ${
                    currentDetailPlan.status === "completed"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-blue-100 text-blue-800 border-blue-300 animate-pulse"
                  }`}
                >
                  Status: {currentDetailPlan.status}
                </span>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#71717a]">
                  Overview / Description
                </h4>
                <div className="text-sm font-medium text-black bg-[#f4f4f5] p-4 rounded-xl border border-[#e4e4e7] leading-relaxed min-h-[160px] max-h-[280px] overflow-y-auto whitespace-pre-wrap">
                  {currentDetailPlan.description ||
                    "No specific description provided for this roadmap."}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-black">
                  <span>
                    Milestone Checklist ({detailCompletedTopics}/
                    {detailTotalTopics})
                  </span>
                  <span>{Math.round(detailProgressPct)}%</span>
                </div>
                <Progress value={detailProgressPct} />

                <div className="mt-4 space-y-4">
                  {Array.from(
                    new Set(
                      (currentDetailPlan.topics || []).map(
                        (t) => t.periodNumber || t.monthNumber || 1,
                      ),
                    ),
                  )
                    .sort((a, b) => a - b)
                    .map((pNum) => {
                      const periodTopics = (
                        currentDetailPlan.topics || []
                      ).filter(
                        (t) => (t.periodNumber || t.monthNumber || 1) === pNum,
                      );
                      if (periodTopics.length === 0) return null;
                      return (
                        <div key={pNum} className="space-y-2">
                          <h5 className="text-xs font-black text-black bg-[#f4f4f5] px-3 py-1.5 rounded-lg border border-[#e4e4e7] inline-block">
                            {currentDetailPlan.planType === "weekly"
                              ? "Week"
                              : "Month"}{" "}
                            {pNum}
                          </h5>
                          <div className="space-y-1.5">
                            {periodTopics.map((topic: TopicItem) => {
                              const origIdx = (
                                currentDetailPlan.topics || []
                              ).indexOf(topic);
                              return (
                                <div
                                  key={origIdx}
                                  onClick={() =>
                                    handleToggleTopic(
                                      currentDetailPlan._id,
                                      origIdx,
                                    )
                                  }
                                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none text-sm ${
                                    topic.completed
                                      ? "bg-[#f4f4f5] border-[#e4e4e7] text-[#71717a]"
                                      : "bg-white border-[#e4e4e7] text-black hover:border-black shadow-2xs"
                                  }`}
                                >
                                  <div className="mt-0.5">
                                    {topic.completed ? (
                                      <CheckSquare className="w-4 h-4 text-black shrink-0" />
                                    ) : (
                                      <Square className="w-4 h-4 text-[#a1a1aa] shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span
                                      className={`font-bold block ${topic.completed ? "line-through" : ""}`}
                                    >
                                      {topic.name}
                                    </span>
                                    {topic.description && (
                                      <div className="mt-2 text-xs font-normal text-[#27272a] bg-[#f4f4f5] p-3 rounded-lg border border-[#e4e4e7] leading-relaxed whitespace-pre-wrap">
                                        {topic.description}
                                      </div>
                                    )}
                                    {topic.subtopics &&
                                      topic.subtopics.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                          {topic.subtopics.map((sub, sIdx) => (
                                            <span
                                              key={sIdx}
                                              className="px-1.5 py-0.5 bg-[#f4f4f5] border border-[#e4e4e7] rounded text-[10px] text-[#52525b] font-mono"
                                            >
                                              {sub}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#e4e4e7] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedPlanForResource(currentDetailPlan);
                      setIsResourceModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#f4f4f5] hover:bg-[#e4e4e7] text-black text-xs font-bold flex items-center gap-1.5 border border-[#e4e4e7] transition-colors cursor-pointer"
                  >
                    <span>
                      Resources ({currentDetailPlan.resources?.length || 0})
                    </span>
                  </button>

                  <button
                    onClick={() => handleTogglePlanStatus(currentDetailPlan)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      currentDetailPlan.status === "completed"
                        ? "bg-black text-white border-black shadow-xs"
                        : detailCompletedTopics === detailTotalTopics &&
                            detailTotalTopics > 0
                          ? "bg-white text-black border-black hover:bg-black hover:text-white"
                          : "bg-[#f4f4f5] text-[#a1a1aa] border-[#e4e4e7]"
                    }`}
                    title={
                      currentDetailPlan.status !== "completed" &&
                      (detailCompletedTopics < detailTotalTopics ||
                        detailTotalTopics === 0)
                        ? "Complete all topics to mark plan as completed"
                        : "Click to toggle status between Active and Completed"
                    }
                  >
                    <span>
                      {currentDetailPlan.status === "completed"
                        ? "Completed ✓"
                        : "Mark Completed"}
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => setDetailModalPlanId(null)}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-[#27272a] text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Dialog>
      </div>
    </div>
  );
}
