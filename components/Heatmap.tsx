"use client";

import React, { useState, useMemo } from "react";
import { Info, ChevronLeft, ChevronRight } from "lucide-react";

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
  title = "Learning Intensity Grid",
}: HeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  
  // For monthly view navigation
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const getLevelColor = (level?: number) => {
    switch (level || 0) {
      case 1: return "bg-[#9be9a8] border-[#85e89d]";
      case 2: return "bg-[#40c463] border-[#34d058]";
      case 3: return "bg-[#30a14e] border-[#28a745]";
      case 4: return "bg-[#216e39] border-[#1b6231]";
      default: return "bg-[#ebedf0] border-[#e4e4e7] hover:border-[#a1a1aa]";
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

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  // Data processing based on view mode
  const displayedData = useMemo(() => {
    if (viewMode === "yearly") {
      const weeks: HeatmapDay[][] = [];
      let currentWeek: HeatmapDay[] = [];
      data.forEach((day, index) => {
        currentWeek.push(day);
        if (currentWeek.length === 7 || index === data.length - 1) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      });
      return { type: "yearly", weeks };
    } else {
      // Monthly View: Traditional Calendar Grid
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      
      const daysInMonth = lastDayOfMonth.getDate();
      const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
      
      const monthGrid: (HeatmapDay | null)[][] = [];
      let currentWeek: (HeatmapDay | null)[] = Array(startingDayOfWeek).fill(null);
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        // Correct timezone offset issue by formatting locally
        const ds = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        
        const dayData = data.find(item => item.date === ds) || { date: ds, count: 0, level: 0 };
        currentWeek.push(dayData);
        
        if (currentWeek.length === 7) {
          monthGrid.push(currentWeek);
          currentWeek = [];
        }
      }
      
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        monthGrid.push(currentWeek);
      }
      
      return { type: "monthly", weeks: monthGrid };
    }
  }, [data, viewMode, currentMonthDate]);

  return (
    <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-black tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[#71717a]">
            {viewMode === "monthly" ? "Monthly" : "Annual"} contribution grid representing scheduled vs actual hours logged
          </p>
        </div>

        <div className="flex items-center gap-4">
          {viewMode === "monthly" && (
            <div className="flex items-center gap-2 mr-2">
              <button onClick={handlePrevMonth} className="p-1 rounded bg-[#f4f4f5] hover:bg-[#e4e4e7]">
                <ChevronLeft className="w-4 h-4 text-[#71717a]" />
              </button>
              <span className="text-sm font-bold w-32 text-center text-black">
                {currentMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button onClick={handleNextMonth} className="p-1 rounded bg-[#f4f4f5] hover:bg-[#e4e4e7]">
                <ChevronRight className="w-4 h-4 text-[#71717a]" />
              </button>
            </div>
          )}
          
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "monthly" | "yearly")}
            className="text-xs font-bold bg-[#f4f4f5] border border-[#e4e4e7] text-black rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="monthly">Monthly View</option>
            <option value="yearly">Yearly View</option>
          </select>
        </div>
      </div>

      {/* Grid container */}
      <div className="overflow-x-auto pb-2">
        {viewMode === "yearly" ? (
          <div className="inline-flex gap-1 min-w-max">
            {displayedData.weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1">
                {week.map((day, dIdx) => (
                  <div
                    key={day?.date || `${wIdx}-${dIdx}`}
                    onMouseEnter={() => day && setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`w-3.5 h-3.5 rounded-[3px] border transition-all cursor-pointer ${getLevelColor(
                      day?.level,
                    )}`}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full max-w-md mx-auto">
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-bold text-[#a1a1aa] uppercase">
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div className="flex flex-col gap-2">
              {displayedData.weeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-cols-7 gap-2">
                  {week.map((day, dIdx) => (
                    <div key={dIdx} className="aspect-square w-full">
                      {day ? (
                        <div
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`w-full h-full rounded-md border flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${getLevelColor(day.level)} ${day.level ? "text-white shadow-sm" : "text-[#71717a]"}`}
                        >
                          {parseInt(day.date.split('-')[2], 10)}
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-md bg-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Legend */}
      <div className="mt-6 pt-4 border-t border-[#f4f4f5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="min-h-[24px]">
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
        </div>

        <div className="flex items-center gap-2 text-xs text-[#71717a]">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-2xs bg-[#ebedf0] border border-[#e4e4e7]" />
            <span className="w-3 h-3 rounded-2xs bg-[#9be9a8] border border-[#85e89d]" />
            <span className="w-3 h-3 rounded-2xs bg-[#40c463] border border-[#34d058]" />
            <span className="w-3 h-3 rounded-2xs bg-[#30a14e] border border-[#28a745]" />
            <span className="w-3 h-3 rounded-2xs bg-[#216e39] border border-[#1b6231]" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
