"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Heatmap from "@/components/Heatmap";
import {
  Plus,
  LayoutDashboard,
  Clock,
  Lock,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface HeatmapItem {
  date: string;
  count: number;
  level?: number;
}

interface AnalyticsData {
  totalHoursLogged: number;
  currentStreak: number;
  activePlansCount: number;
  heatmapData: HeatmapItem[];
}

interface TopicItem {
  _id?: string;
  name: string;
  monthNumber?: number;
  completed: boolean;
}

interface PlanItem {
  _id: string;
  title: string;
  planType?: "weekly" | "monthly";
  status: string;
  durationMonths: number;
  description?: string;
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

interface TodayLogItem {
  actualMinutes: number;
  completedRoutineTaskIds: string[];
  sessions?: StudySessionItem[];
  notes?: string;
  reflection?: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalHoursLogged: 0,
    currentStreak: 0,
    activePlansCount: 0,
    heatmapData: [],
  });
  const [activePlans, setActivePlans] = useState<PlanItem[]>([]);
  const [todayLog, setTodayLog] = useState<TodayLogItem | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const isPastDay = selectedDate < todayStr;

  const fetchDashboardData = useCallback(async () => {
    try {
      const [analyticsRes, plansRes, logRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/plans"),
        fetch(`/api/logs?date=${selectedDate}`),
      ]);

      const analyticsJson = await analyticsRes.json();
      if (analyticsJson.success) setAnalytics(analyticsJson.data);

      const plansJson = await plansRes.json();
      if (plansJson.success) {
        const active = plansJson.data.filter(
          (p: PlanItem) => p.status === "active",
        );
        setActivePlans(active);
      }

      const logJson = await logRes.json();
      if (logJson.success && logJson.data) {
        setTodayLog(logJson.data);
      } else {
        setTodayLog(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchDashboardData();
    });
  }, [fetchDashboardData]);





  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#71717a] text-sm font-medium">
          Loading workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 space-y-4 pb-12 font-sans animate-in fade-in duration-300">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#e4e4e7] px-6 py-4 rounded-xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-6 h-6 text-[#1e1e1e]" />
            <h1 className="text-2xl font-black text-[#1e1e1e] tracking-tight">
              Command Center
            </h1>
          </div>
          <p className="text-[#71717a] text-sm mt-1">
            Welcome back. Track your learning progress and record daily study
            sessions.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#f4f4f5] p-2 rounded-lg border border-[#e4e4e7]">
          <Calendar className="w-4 h-4 text-[#71717a] ml-1" />
          <input
            type="date"
            max={todayStr}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-bold text-black focus:outline-none cursor-pointer pr-1"
          />
          {isPastDay && (
            <Badge
              variant="outline"
              className="bg-black text-white border-black text-[10px] flex items-center gap-1"
            >
              <Lock className="w-3 h-3" /> Locked
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#e4e4e7] shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717a]">
              Total Hours Learned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-black tracking-tight">
              {analytics.totalHoursLogged}{" "}
              <span className="text-sm font-normal text-[#71717a]">hrs</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e4e4e7] shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717a]">
              Learning Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-black tracking-tight">
              {analytics.currentStreak}{" "}
              <span className="text-sm font-normal text-[#71717a]">days</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e4e4e7] shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717a]">
              Active Roadmaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-black tracking-tight">
              {analytics.activePlansCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#e4e4e7] shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#71717a]">
              Selected Day Logged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-black tracking-tight">
              {Math.round(((todayLog?.actualMinutes || 0) / 60) * 10) / 10}{" "}
              <span className="text-sm font-normal text-[#71717a]">hrs</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Study Callout Banner */}
      <Card className="p-6 bg-linear-to-r from-black to-[#27272a] text-white shadow-md rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>Ready to log today&apos;s study progress?</span>
          </h3>
          <p className="text-sm text-[#a1a1aa] max-w-xl">
            Head over to the dedicated Daily Record Page to choose your active
            roadmap plan, check off routine tasks, and write comprehensive study
            notes.
          </p>
        </div>
        <Link
          href="/daily"
          className="px-6 py-3 rounded-lg bg-white text-black hover:bg-gray-100 font-bold text-sm shrink-0 transition-all shadow-sm"
        >
          Go to Daily Record Page &rarr;
        </Link>
      </Card>

      {/* Active Roadmaps Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-black tracking-tight">
            Active Roadmaps
          </h3>
          <Link
            href="/plans/create"
            className="text-xs font-semibold text-black hover:underline flex items-center gap-1"
          >
            <span>Create New Plan</span>
            <Plus className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activePlans.length === 0 ? (
          <Card className="p-8 text-center border border-dashed border-[#d4d4d8] bg-white shadow-2xs">
            <p className="text-[#71717a] text-sm mb-4">
              No active weekly or monthly roadmaps configured yet.
            </p>
            <Link
              href="/plans/create"
              className="px-4 py-2 rounded-md bg-black text-white font-semibold text-xs inline-flex items-center gap-2 shadow-xs hover:bg-[#27272a]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Up First Plan</span>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePlans.map((plan) => {
              const completedTopics =
                plan.topics?.filter((t: TopicItem) => t.completed)?.length || 0;
              const totalTopics = plan.topics?.length || 0;
              const progressPct =
                totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

              return (
                <Card
                  key={plan._id}
                  className="p-5 flex flex-col justify-between bg-white border-[#e4e4e7] shadow-2xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-black text-base leading-snug">
                        {plan.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className="bg-[#f4f4f5] border-[#e4e4e7] text-black font-bold uppercase text-[10px]"
                      >
                        {plan.durationMonths}{plan.planType === "weekly" ? "w" : "m"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#71717a] line-clamp-2 mb-4">
                      {plan.description || "No description provided."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-medium text-[#52525b] mb-1.5">
                        <span>Topic Mastery</span>
                        <span>
                          {completedTopics} / {totalTopics}
                        </span>
                      </div>
                      <Progress value={progressPct} />
                    </div>

                    <div className="pt-3 border-t border-[#f4f4f5] flex justify-end">
                      <Link
                        href="/plans"
                        className="text-xs text-black hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>View Roadmap Details</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Heatmap Preview */}
      <Heatmap
        data={analytics.heatmapData}
        title="Annual Learning Intensity Grid"
      />
    </div>
  );
}
