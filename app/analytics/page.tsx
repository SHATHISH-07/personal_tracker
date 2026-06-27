"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Heatmap from "@/components/Heatmap";
import { BarChart3, Clock, BookOpen } from "lucide-react";

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

interface StudySessionItem {
  startTime: string;
  endTime: string;
  actualMinutes: number;
  topicsCovered: string[];
  description: string;
}

interface LogEntry {
  _id?: string;
  date: string;
  actualMinutes: number;
  startTime?: string;
  endTime?: string;
  sessions?: StudySessionItem[];
  notes?: string;
  reflection?: string;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalHoursLogged: 0,
    currentStreak: 0,
    activePlansCount: 0,
    heatmapData: [],
  });
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/logs").then((r) => r.json()),
    ])
      .then(([analyticsData, logsData]) => {
        if (analyticsData.success) setAnalytics(analyticsData.data);
        if (logsData.success) {
          const activeLogs = logsData.data.filter(
            (l: LogEntry) => l.actualMinutes > 0 || (l.sessions && l.sessions.length > 0) || l.notes || l.reflection,
          );
          setRecentLogs(activeLogs.slice(0, 30));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#71717a] text-sm font-medium">Loading analytics & history...</p>
      </div>
    );
  }

  // Flatten sessions across logs for detailed study session history
  const flattenedSessions = recentLogs.flatMap((log) => {
    if (log.sessions && log.sessions.length > 0) {
      return log.sessions.map((s) => ({
        date: log.date,
        ...s,
      }));
    } else if (log.actualMinutes > 0 || log.notes) {
      return [
        {
          date: log.date,
          startTime: log.startTime || "-",
          endTime: log.endTime || "-",
          actualMinutes: log.actualMinutes || 0,
          topicsCovered: [],
          description: log.notes || "Legacy study record",
        },
      ];
    }
    return [];
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 space-y-4 pb-12 font-sans animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white border border-[#e4e4e7] px-6 py-4 rounded-xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#1e1e1e]" />
            <h1 className="text-2xl font-black text-[#1e1e1e] tracking-tight">
              Analytics & Session History
            </h1>
          </div>
          <p className="text-[#71717a] text-sm mt-1">
            Comprehensive view of your study consistency, cumulative outcomes, and detailed daily learning logs.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-[#e4e4e7] p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#71717a]">Total Cumulative Hours</span>
          </div>
          <div className="text-3xl font-extrabold text-black tracking-tight">
            {analytics.totalHoursLogged} <span className="text-sm font-normal text-[#71717a]">hours</span>
          </div>
        </Card>

        <Card className="bg-white border-[#e4e4e7] p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#71717a]">Learning Streak</span>
          </div>
          <div className="text-3xl font-extrabold text-black tracking-tight">
            {analytics.currentStreak} <span className="text-sm font-normal text-[#71717a]">days</span>
          </div>
        </Card>

        <Card className="bg-white border-[#e4e4e7] p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#71717a]">Total Study Sessions</span>
          </div>
          <div className="text-3xl font-extrabold text-black tracking-tight">
            {flattenedSessions.length} <span className="text-sm font-normal text-[#71717a]">sessions</span>
          </div>
        </Card>
      </div>

      {/* Heatmap */}
      <Heatmap data={analytics.heatmapData} title="Annual Learning Intensity Grid" />

      {/* Detailed Session History Table */}
      <Card className="p-6 bg-white border-[#e4e4e7] shadow-2xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-black tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-black" /> Detailed Study Session Logs
            </h3>
            <p className="text-xs text-[#71717a]">
              Chronological log of exact time windows, topics studied, and descriptions.
            </p>
          </div>
          <Badge variant="outline" className="bg-[#f4f4f5] border-[#e4e4e7] text-black font-semibold">
            Recent Records
          </Badge>
        </div>

        {flattenedSessions.length === 0 ? (
          <div className="py-12 text-center text-[#71717a] bg-[#f4f4f5] rounded-md border border-[#e4e4e7]">
            No study sessions logged yet. Head over to the dashboard to record your first study window!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e4e4e7] text-xs font-semibold text-[#71717a]">
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">Time Window</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Topics Covered</th>
                  <th className="pb-3 pr-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f4f5]">
                {flattenedSessions.map((sess, i) => (
                  <tr key={i} className="hover:bg-[#f4f4f5] transition-colors">
                    <td className="py-3.5 pl-2 font-mono font-bold text-black whitespace-nowrap">
                      {sess.date}
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <Badge variant="outline" className="bg-white border-[#e4e4e7] font-mono text-xs text-black">
                        <Clock className="w-3 h-3 mr-1 text-[#71717a]" />
                        {sess.startTime} - {sess.endTime}
                      </Badge>
                    </td>
                    <td className="py-3.5 font-bold text-black whitespace-nowrap">
                      {Math.round(((sess.actualMinutes || 0) / 60) * 10) / 10} hrs ({sess.actualMinutes || 0}m)
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {sess.topicsCovered && sess.topicsCovered.length > 0 ? (
                          sess.topicsCovered.map((t, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-[#f4f4f5] border border-[#e4e4e7] rounded text-[10px] font-semibold text-black">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#a1a1aa] italic text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pr-2 text-black max-w-md">
                      {sess.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
