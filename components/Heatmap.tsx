"use client";

import { useCallback, useMemo, useState } from "react";

interface HeatmapDay {
  date: string;
  count: number;
  level?: number;
}

interface HeatmapProps {
  data: HeatmapDay[];
  title?: string;
}

type DisplayedData = {
  type: "monthly" | "yearly";
  weeks: (HeatmapDay | null)[][];
  monthLabels: { label: string; index: number }[];
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const SHORT_MONTH_NAMES = MONTH_NAMES.map((month) => month.slice(0, 3));

const parseDate = (dateStr: string) => new Date(dateStr + "T00:00:00");

const formatDateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const getLevelFromMinutes = (mins: number) => {
  if (mins > 0 && mins < 30) return 1;
  if (mins >= 30 && mins < 60) return 2;
  if (mins >= 60 && mins < 120) return 3;
  if (mins >= 120) return 4;
  return 0;
};

export default function Heatmap({
  data,
  title = "Learning Intensity Grid",
}: HeatmapProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const todayKey = formatDateKey(today);

  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());

  const dataByDate = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    data.forEach((day) => {
      map.set(day.date, {
        ...day,
        level: day.level ?? getLevelFromMinutes(day.count),
      });
    });
    return map;
  }, [data]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([currentYear, selectedYear]);
    for (let year = currentYear - 10; year <= currentYear; year++) {
      years.add(year);
    }
    data.forEach((day) => {
      const year = Number(day.date.slice(0, 4));
      if (!Number.isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, data, selectedYear]);

  const getDay = useCallback(
    (date: Date): HeatmapDay => {
      const dateKey = formatDateKey(date);
      return dataByDate.get(dateKey) || { date: dateKey, count: 0, level: 0 };
    },
    [dataByDate],
  );

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

  const getYearlyDayClass = (day: HeatmapDay | null) =>
    [
      "w-3.5 h-3.5 lg:w-full lg:max-w-[18px] aspect-square rounded-[3px] border transition-all select-none touch-manipulation",
      day
        ? getLevelColor(day.level) + " cursor-pointer sm:hover:scale-110"
        : "opacity-0 pointer-events-none",
      day?.date === todayKey ? "ring-2 ring-blue-600 ring-offset-1" : "",
      hoveredDay?.date === day?.date && day
        ? "scale-110 ring-1 ring-black/30"
        : "",
    ]
      .filter(Boolean)
      .join(" ");

  const getMonthlyDayClass = (day: HeatmapDay) =>
    [
      "w-full h-full aspect-square rounded-md border flex items-center justify-center text-xs lg:text-sm font-black transition-all cursor-pointer select-none touch-manipulation",
      getLevelColor(day.level),
      day.level ? "text-white shadow-xs" : "text-[#71717a]",
      day.date === todayKey ? "ring-2 ring-blue-600 ring-offset-2" : "",
      hoveredDay?.date === day.date ? "scale-105 ring-1 ring-[#1e1e1e]" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return parseDate(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatHours = (mins: number) => {
    if (!mins || mins === 0) return "0 mins";
    const hrs = (mins / 60).toFixed(1);
    return mins >= 60 ? `${hrs} hrs (${mins}m)` : `${mins} mins`;
  };

  const displayedData = useMemo<DisplayedData>(() => {
    if (viewMode === "yearly") {
      const days: (HeatmapDay | null)[] = [];
      const firstDay = new Date(selectedYear, 0, 1);
      const lastDay = new Date(selectedYear, 11, 31);

      for (let i = 0; i < firstDay.getDay(); i++) {
        days.push(null);
      }

      for (
        let d = new Date(firstDay);
        d <= lastDay;
        d.setDate(d.getDate() + 1)
      ) {
        days.push(getDay(d));
      }

      while (days.length % 7 !== 0) {
        days.push(null);
      }

      const weeks: (HeatmapDay | null)[][] = [];
      for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
      }

      // Track exactly at which week index a new month begins
      const monthLabels: { label: string; index: number }[] = [];
      let lastMonthSeen = -1;

      weeks.forEach((week, weekIndex) => {
        const firstValidDay = week.find((day) => day !== null);
        if (firstValidDay) {
          const currentMonth = parseDate(firstValidDay.date).getMonth();
          if (currentMonth !== lastMonthSeen) {
            monthLabels.push({
              label: SHORT_MONTH_NAMES[currentMonth],
              index: weekIndex,
            });
            lastMonthSeen = currentMonth;
          }
        }
      });

      return { type: "yearly", weeks, monthLabels };
    }

    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const monthGrid: (HeatmapDay | null)[][] = [];
    let currentWeek: (HeatmapDay | null)[] =
      Array(startingDayOfWeek).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(getDay(new Date(selectedYear, selectedMonth, day)));

      if (currentWeek.length === 7) {
        monthGrid.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      monthGrid.push(currentWeek);
    }

    return { type: "monthly", weeks: monthGrid, monthLabels: [] };
  }, [getDay, selectedMonth, selectedYear, viewMode]);

  return (
    <div className="w-full bg-white border border-[#e4e4e7] rounded-xl p-4 sm:p-6 lg:p-8 shadow-xs text-[#1e1e1e] antialiased">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base lg:text-lg font-black tracking-tight">
            {title}
          </h3>
          <p className="text-xs lg:text-sm text-[#71717a] mt-0.5">
            {viewMode === "monthly"
              ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
              : selectedYear}{" "}
            learning intensity from logged study minutes
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto">
          <select
            value={viewMode}
            onChange={(e) =>
              setViewMode(e.target.value as "monthly" | "yearly")
            }
            className="h-9 text-xs font-black bg-[#f4f4f5] border border-[#e4e4e7] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
          >
            <option value="monthly">Monthly View</option>
            <option value="yearly">Yearly View</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-9 text-xs font-black bg-[#f4f4f5] border border-[#e4e4e7] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
            title="Select year"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {viewMode === "monthly" && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9 text-xs font-black bg-[#f4f4f5] border border-[#e4e4e7] rounded-lg px-3 col-span-2 sm:col-span-1 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
              title="Select month"
            >
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="w-full overflow-x-auto pb-3 touch-pan-x scrollbar-thin select-none">
        {viewMode === "yearly" ? (
          <div className="w-max lg:w-full px-2">
            {/* Top Month Headings (Dynamic absolute tracking over columns) */}
            <div className="ml-9 relative h-5 mb-1">
              {displayedData.monthLabels.map((item, index) => {
                const percentageOffset =
                  (item.index / displayedData.weeks.length) * 100;
                return (
                  <span
                    key={`${item.label}-${index}`}
                    className="absolute text-[10px] lg:text-xs font-bold text-[#71717a] tracking-tight whitespace-nowrap"
                    style={{ left: `${percentageOffset}%` }}
                  >
                    {item.label}
                  </span>
                );
              })}
            </div>

            {/* Grid Map Layout */}
            <div className="flex gap-2">
              <div className="grid grid-rows-7 gap-1 w-7 text-[10px] lg:text-xs font-bold text-[#a1a1aa] shrink-0">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="h-3.5 lg:h-5 flex items-center text-left"
                  >
                    {label === "Mon" || label === "Wed" || label === "Fri"
                      ? label
                      : ""}
                  </div>
                ))}
              </div>

              <div className="flex-1 inline-flex justify-between gap-1">
                {displayedData.weeks.map((week, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="grid grid-rows-7 gap-1 flex-1 max-w-[18px]"
                  >
                    {week.map((day, dayIndex) => (
                      <div
                        key={day?.date || `${weekIndex}-${dayIndex}`}
                        onMouseEnter={() => day && setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() => day && setHoveredDay(day)}
                        className={getYearlyDayClass(day)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Monthly Calendar Layout */
          <div className="w-full max-w-2xl mx-auto px-0.5">
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] lg:text-xs font-black text-[#a1a1aa] uppercase tracking-wider">
              {WEEKDAY_LABELS.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {displayedData.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-2">
                  {week.map((day, dayIndex) => (
                    <div key={dayIndex} className="w-full">
                      {day ? (
                        <div
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          onClick={() =>
                            setHoveredDay(
                              hoveredDay?.date === day.date ? null : day,
                            )
                          }
                          className={getMonthlyDayClass(day)}
                        >
                          {parseInt(day.date.split("-")[2], 10)}
                        </div>
                      ) : (
                        <div className="w-full aspect-square rounded-md bg-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Display Panel */}
      <div className="mt-5 pt-4 border-t border-[#f4f4f5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs lg:text-sm">
        <div className="min-h-[24px] flex items-center">
          {hoveredDay ? (
            <div className="flex items-center gap-2 text-black animate-in fade-in duration-100">
              <span className="font-semibold">
                {formatDate(hoveredDay.date)}:
              </span>
              <span className="font-black text-blue-600 bg-blue-50/60 px-2 py-0.5 rounded border border-blue-100/60">
                {formatHours(hoveredDay.count)} logged
              </span>
            </div>
          ) : (
            <span className="text-[#a1a1aa] font-medium hidden sm:inline">
              {viewMode === "yearly"
                ? "Hover or tap on a cell for details • Swipe to scroll horizontally"
                : "Tap on a day matrix square for details"}
            </span>
          )}
        </div>

        {/* Legend Scale */}
        <div className="flex items-center gap-2 text-[11px] lg:text-xs font-bold text-[#71717a] self-end sm:self-auto">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[2px] bg-[#ebedf0] border border-[#e4e4e7]" />
            <span className="w-3 h-3 rounded-[2px] bg-[#9be9a8] border border-[#85e89d]" />
            <span className="w-3 h-3 rounded-[2px] bg-[#40c463] border border-[#34d058]" />
            <span className="w-3 h-3 rounded-[2px] bg-[#30a14e] border border-[#28a745]" />
            <span className="w-3 h-3 rounded-[2px] bg-[#216e39] border border-[#1b6231]" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
