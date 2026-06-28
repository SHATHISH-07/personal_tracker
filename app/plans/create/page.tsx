"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Plus, Trash2, Goal, Layers, CheckCircle2 } from "lucide-react";

interface TopicItem {
  name: string;
  description?: string;
  subtopics?: string[];
  monthNumber?: number;
  periodNumber?: number;
  completed: boolean;
}

export default function CreatePlanPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [planType, setPlanType] = useState<"weekly" | "monthly">("monthly");
  const [durationMonths, setDurationMonths] = useState("1");
  const [description, setDescription] = useState("");

  const [topicNameInput, setTopicNameInput] = useState("");
  const [topicDescInput, setTopicDescInput] = useState("");
  const [topicPeriodInput, setTopicPeriodInput] = useState("1");
  const [topicsList, setTopicsList] = useState<TopicItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handlePlanTypeChange = (newType: "weekly" | "monthly") => {
    setPlanType(newType);
    setDurationMonths("1");
    setTopicPeriodInput("1");
  };

  const handleAddTopicTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (("key" in e && e.key === "Enter") || e.type === "click") {
      e.preventDefault();
      if (topicNameInput.trim()) {
        const pNum = parseInt(topicPeriodInput, 10) || 1;
        const newTopic: TopicItem = {
          name: topicNameInput.trim(),
          description: topicDescInput.trim(),
          subtopics: [],
          monthNumber: pNum,
          periodNumber: pNum,
          completed: false,
        };
        setTopicsList([...topicsList, newTopic]);
        setTopicNameInput("");
        setTopicDescInput("");
      }
    }
  };

  const handleRemoveTopicTag = (index: number) => {
    setTopicsList(topicsList.filter((_, i) => i !== index));
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          planType,
          durationMonths: parseInt(durationMonths, 10) || 1,
          description,
          topics: topicsList,
          status: "active",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/plans");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const periodLabel = planType === "weekly" ? "Week" : "Month";

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 space-y-4 pb-12 font-sans">
      <div className="w-full max-w-none space-y-8 animate-in fade-in duration-300">
        {/* Top Header Bar */}
        <div className="bg-white border border-[#e4e4e7] px-6 py-4 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-black text-[#1e1e1e] tracking-tight">
                Create Upskill Plan
              </h1>
              <p className="text-sm text-[#71717a] mt-1">
                Design your intensive weekly or monthly learning curriculum with
                detailed goals.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreatePlan} className="space-y-8">
          {/* Main Plan Overview Card */}
          <Card className="p-8 bg-white border-[#e4e4e7] shadow-2xs space-y-6 rounded-2xl">
            <div className="border-b border-[#e4e4e7] pb-4">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Goal className="w-5 h-5 text-black" />
                <span>1. Upskill Plan Overview</span>
              </h2>
            </div>

            {/* Plan Type Selector Row */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-black">
                Roadmap Schedule Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handlePlanTypeChange("monthly")}
                  className={`py-3.5 px-5 rounded-xl font-extrabold text-sm border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    planType === "monthly"
                      ? "bg-[#272727] text-white border-black shadow-md scale-[1.01]"
                      : "bg-[#f4f4f5] text-black border-[#e4e4e7] hover:bg-[#e4e4e7]"
                  }`}
                >
                  <span>Monthly Plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePlanTypeChange("weekly")}
                  className={`py-3.5 px-5 rounded-xl font-extrabold text-sm border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    planType === "weekly"
                      ? "bg-[#272727] text-white border-black shadow-md scale-[1.01]"
                      : "bg-[#f4f4f5] text-black border-[#e4e4e7] hover:bg-[#e4e4e7]"
                  }`}
                >
                  <span>Weekly Plan</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-bold text-black">
                  Plan Title <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder={
                    planType === "weekly"
                      ? "e.g. 4-Week Rust Bootcamp"
                      : "e.g. Full Stack & AI Mastery 2026"
                  }
                  className="bg-white border-[#e4e4e7] text-black text-base py-3 px-4 rounded-lg h-12 font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-black">
                  Total Duration ({planType === "weekly" ? "Weeks" : "Months"})
                </label>
                <Select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  className="bg-white border-[#e4e4e7] text-black text-base h-12 rounded-lg font-medium"
                >
                  {planType === "weekly" ? (
                    <>
                      <option value="1">1 Week Period</option>
                      <option value="2">2 Weeks Period</option>
                      <option value="4">4 Weeks Intensive</option>
                      <option value="8">8 Weeks Bootcamp</option>
                      <option value="12">12 Weeks Semester</option>
                    </>
                  ) : (
                    <>
                      <option value="1">1 Month Period</option>
                      <option value="2">2 Months Period</option>
                      <option value="3">3 Months Period</option>
                      <option value="6">6 Months Intensive</option>
                      <option value="12">12 Months Year-Long</option>
                    </>
                  )}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-black flex items-center justify-between">
                <span>Detailed Description & Learning Objectives</span>
                <span className="text-xs font-normal text-[#71717a]">
                  Spacious box for extensive planning
                </span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Detail what exact skills you will master, specific project deliverables, or milestones you aim to achieve during this ${planType} roadmap...`}
                rows={8}
                className="bg-[#fafafa] border-[#e4e4e7] focus:bg-white text-black text-base p-4 rounded-xl leading-relaxed resize-y font-normal transition-all"
              />
            </div>
          </Card>

          {/* Curriculum & Topics Section */}
          <Card className="p-8 bg-white border-[#e4e4e7] shadow-2xs space-y-6 rounded-2xl">
            <div className="border-b border-[#e4e4e7] pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-black flex items-center gap-2">
                  <Layers className="w-5 h-5 text-black" />
                  <span>2. Curriculum & Topics</span>
                </h2>
              </div>
              <span className="bg-[#f4f4f5] border border-[#e4e4e7] px-3 py-1 rounded-full text-xs font-bold text-black">
                {topicsList.length} Topics Added
              </span>
            </div>

            {/* Add Topic Input Box */}
            <div className="bg-[#f4f4f5] p-6 rounded-xl border border-[#e4e4e7] space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#52525b]">
                Add New Curriculum Topic
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#52525b] mb-1.5">
                    Target {periodLabel}
                  </label>
                  <Select
                    value={topicPeriodInput}
                    onChange={(e) => setTopicPeriodInput(e.target.value)}
                    className="w-full bg-white border-[#e4e4e7] text-black text-sm h-10 font-bold"
                  >
                    {Array.from(
                      { length: parseInt(durationMonths, 10) || 12 },
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
                    Topic / Module Name
                  </label>
                  <Input
                    type="text"
                    value={topicNameInput}
                    onChange={(e) => setTopicNameInput(e.target.value)}
                    placeholder="e.g. Advanced State Machines & Distributed Systems"
                    className="bg-white border-[#e4e4e7] text-black text-sm h-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#52525b] mb-1.5">
                  Topic Detailed Scope / Description
                </label>
                <Textarea
                  value={topicDescInput}
                  onChange={(e) => setTopicDescInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddTopicTag(e);
                    }
                  }}
                  placeholder="Explain what specifically will be covered or built in this topic..."
                  rows={3}
                  className="bg-white border-[#e4e4e7] text-black text-sm p-3 rounded-lg resize-y"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddTopicTag}
                  className="px-6 py-2.5 rounded-lg bg-[#272727] hover:bg-[#27272a] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all h-10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Topic to Curriculum</span>
                </button>
              </div>
            </div>

            {/* List of added topics */}
            <div className="space-y-3">
              {topicsList.length === 0 ? (
                <div className="py-12 text-center bg-[#fafafa] rounded-xl border border-dashed border-[#e4e4e7] text-[#71717a]">
                  <p className="text-sm font-semibold">
                    No topics added to the curriculum yet.
                  </p>
                  <p className="text-xs mt-1">
                    Use the box above to add your modules{" "}
                    {planType === "weekly" ? "week by week" : "month by month"}.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {topicsList.map((item, idx) => {
                    const displayPeriod =
                      item.periodNumber || item.monthNumber || 1;
                    return (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#fafafa] border border-[#e4e4e7] text-black transition-all hover:border-[#a1a1aa]"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-black text-white rounded-md text-[11px] font-black tracking-wide uppercase">
                              {periodLabel} {displayPeriod}
                            </span>
                            <h4 className="font-bold text-base text-black">
                              {item.name}
                            </h4>
                          </div>
                          {item.description && (
                            <p className="text-sm text-[#52525b] mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopicTag(idx)}
                          className="p-2 text-[#a1a1aa] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Remove topic"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Submit Action Bar */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.push("/plans")}
              className="px-6 py-3 rounded-xl bg-white border border-[#e4e4e7] hover:bg-[#e4e4e7] text-black font-bold text-sm transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-8 py-3 rounded-xl bg-[#272727] hover:bg-[#27272a] text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{submitting ? "Creating Plan..." : "Save Plan ➔"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
