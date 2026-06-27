"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";

interface HeatmapDay {
  date: string;
  count: number;
  level?: number;
}

interface HeatmapProps {
  data: HeatmapDay[];
  title?: string;
}

export default function Heatmap({
  data,
  title = "365-Day Activity Heatmap",
}: HeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  data.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === data.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getLevelColor = (level?: number) => {
    switch (level || 0) {
      case 1:
        return "bg-[#9be9a8] border-[#85e89d]";
      case 2:
        return "bg-[#40c463] border-[#34d058]";
      case 3:
        return "bg-[#30a14e] border-[#28a745]";
      case 4:
        return "bg-[#216e39] border-[#1b6231]";
      default:
        return "bg-[#ebedf0] border-[#e4e4e7] hover:border-[#a1a1aa]";
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return new Date(dateStr).toLocaleDateString("en-US", options);
  };

  const formatHours = (mins: number) => {
    if (!mins || mins === 0) return "0 mins";
    const hrs = (mins / 60).toFixed(1);
    return mins >= 60 ? `${hrs} hrs (${mins}m)` : `${mins} mins`;
  };

  return (
    <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-black tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[#71717a]">
            Annual contribution grid representing scheduled vs actual hours logged
          </p>
        </div>

        {/* Green Gradient Legend */}
        <div className="flex items-center gap-2 text-xs text-[#71717a]">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-2xs bg-[#ebedf0] border border-[#e4e4e7]"
              title="0 mins"
            />
            <span
              className="w-3 h-3 rounded-2xs bg-[#9be9a8] border border-[#85e89d]"
              title="< 30 mins"
            />
            <span
              className="w-3 h-3 rounded-2xs bg-[#40c463] border border-[#34d058]"
              title="30-60 mins"
            />
            <span
              className="w-3 h-3 rounded-2xs bg-[#30a14e] border border-[#28a745]"
              title="1-2 hours"
            />
            <span
              className="w-3 h-3 rounded-2xs bg-[#216e39] border border-[#1b6231]"
              title="2+ hours"
            />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Grid container */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-1 min-w-max">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((day, dIdx) => (
                <div
                  key={day.date || `${wIdx}-${dIdx}`}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`w-3.5 h-3.5 rounded-[3px] border transition-all cursor-pointer ${getLevelColor(
                    day.level,
                  )}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Info bar */}
      <div className="mt-4 pt-4 border-t border-[#f4f4f5] flex items-center justify-between text-xs min-h-[36px]">
        {hoveredDay ? (
          <div className="flex items-center gap-2 text-black animate-in fade-in duration-150">
            <span className="font-semibold">{formatDate(hoveredDay.date)}:</span>
            <span className="font-bold">{formatHours(hoveredDay.count)} logged</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[#a1a1aa]">
            <Info className="w-3.5 h-3.5" />
            <span>Hover over any square to view exact hours logged</span>
          </div>
        )}

        <div className="text-[#a1a1aa] font-mono text-[11px]">
          {data.length} days recorded
        </div>
      </div>
    </div>
  );
}
