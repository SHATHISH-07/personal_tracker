"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ArrowRight,
  CheckSquare,
  Trash2,
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
  status: string;
  topics?: TopicItem[];
}

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all");

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

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this roadmap plan?")) return;
    try {
      await fetch(`/api/plans/${planId}`, { method: "DELETE" });
      fetchPlans();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadReport = async (plan: PlanItem) => {
    try {
      await generatePerformanceReport(plan);
    } catch (e) {
      console.error("Failed to generate PDF", e);
      alert("Failed to generate the report. Please try again.");
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading roadmaps..." />;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-12 font-sans">
      <div className="w-full max-w-none space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        {/* Top Header Bar */}
        <div className="bg-white border border-[#e4e4e7] p-4 sm:px-6 sm:py-4 rounded-xl shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <h1 className="text-xl sm:text-2xl font-black text-[#1e1e1e] tracking-tight">
              Upskill Plans
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {plans.length > 0 && (
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-[#f4f4f5] px-3 py-2.5 sm:py-1.5 rounded-xl border border-[#e4e4e7] w-full sm:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-extrabold text-black shrink-0">
                    Filter:
                  </span>
                  <select
                    value={selectedPlanFilter}
                    onChange={(e) => setSelectedPlanFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-black focus:outline-none cursor-pointer pr-2 w-full sm:w-auto truncate"
                  >
                    <option value="all">All Roadmaps ({plans.length})</option>
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title} (
                        {p.planType === "weekly" ? "Weekly" : "Monthly"})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedPlanFilter !== "all" && (
                  <button
                    onClick={() => setSelectedPlanFilter("all")}
                    className="text-xs font-bold text-[#71717a] hover:text-black underline cursor-pointer px-1 shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => router.push("/plans/checklist")}
              className="px-5 py-3 rounded-xl bg-[#f4f4f5] border border-[#e4e4e7] hover:bg-[#272727] hover:text-white text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs w-full sm:w-auto"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Manage Topics Checklist ➔</span>
            </button>

            <button
              onClick={() => router.push("/plans/create")}
              className="px-6 py-3 rounded-xl bg-[#272727] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Plan</span>
            </button>
          </div>
        </div>

        {/* Plans List */}
        {plans.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center border border-dashed border-[#d4d4d8] bg-white shadow-2xs rounded-2xl">
            <h3 className="text-base font-bold text-black mb-2">
              No Roadmaps Created Yet
            </h3>
            <p className="text-[#71717a] text-sm max-w-md mx-auto mb-6">
              Create your first weekly or monthly roadmap to organize learning
              topics and generate a custom routine.
            </p>
            <button
              onClick={() => router.push("/plans/create")}
              className="px-5 py-2.5 rounded-lg bg-[#272727] text-white font-semibold text-xs inline-flex items-center justify-center gap-2 shadow-xs hover:bg-[#27272a] cursor-pointer w-full sm:w-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start Planning</span>
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
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
                  onClick={() => router.push(`/plans/${plan._id}`)}
                  className="p-4 sm:p-6 bg-white border-[#e4e4e7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:shadow-md hover:border-black transition-all cursor-pointer group rounded-2xl"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight group-hover:underline truncate w-full sm:w-auto">
                          {plan.title}
                        </h3>
                        <Badge className="bg-[#f4f4f5] text-black border border-[#e4e4e7] text-[0.625rem] font-bold uppercase shrink-0">
                          {plan.planType === "weekly" ? "Weekly" : "Monthly"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#71717a] mt-2">
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
                        <span className="hidden sm:inline">&bull;</span>
                        <span className="inline-flex items-center gap-1.5">
                          Status:{" "}
                          <span
                            className={`font-extrabold px-2 py-0.5 rounded-md text-[0.625rem] uppercase tracking-wider border shadow-2xs ${
                              plan.status === "completed"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-blue-100 text-blue-800 border-blue-300 animate-pulse"
                            }`}
                          >
                            {plan.status}
                          </span>
                        </span>
                        <span className="hidden sm:inline">&bull;</span>
                        <span>
                          Checklist:{" "}
                          {totalTopics > 0
                            ? `${Math.round(progressPct)}% (${completedTopics}/${totalTopics})`
                            : "0% (0/0)"}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-[#52525b] mt-3 line-clamp-2 italic leading-relaxed">
                          &quot;{plan.description}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - Distinct Mobile vs Desktop layout */}
                  <div className="flex flex-row items-center justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-[#f4f4f5] sm:border-0 shrink-0">
                    {plan.status === "completed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadReport(plan);
                        }}
                        title="Download Performance Report"
                        className="p-2.5 rounded-xl text-blue-600 border border-transparent hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
                      >
                        <DownloadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(plan._id);
                      }}
                      title="Delete Roadmap"
                      className="p-2.5 rounded-xl text-[#a1a1aa] border border-transparent hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <div className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-bold text-black bg-[#f4f4f5] px-4 py-2.5 rounded-xl border border-[#e4e4e7] group-hover:bg-[#272727] group-hover:text-white transition-colors shadow-2xs">
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
