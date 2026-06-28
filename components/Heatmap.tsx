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
  monthLabels: string[];
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
      "w-3.5 h-3.5 rounded-[3px] border transition-all",
      day
        ? getLevelColor(day.level) + " cursor-pointer hover:scale-110"
        : "opacity-0 pointer-events-none",
      day?.date === todayKey ? "ring-2 ring-[#2563eb] ring-offset-1" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const getMonthlyDayClass = (day: HeatmapDay) =>
    [
      "w-full h-full rounded-md border flex items-center justify-center text-xs font-bold transition-all cursor-pointer",
      getLevelColor(day.level),
      day.level ? "text-white shadow-sm" : "text-[#71717a]",
      day.date === todayKey ? "ring-2 ring-[#2563eb] ring-offset-2" : "",
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
    return mins >= 60 ? hrs + " hrs (" + mins + "m)" : mins + " mins";
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

      const monthLabels = weeks.map((week) => {
        const monthStart = week.find((day) => {
          if (!day) return false;
          return parseDate(day.date).getDate() === 1;
        });
        return monthStart
          ? SHORT_MONTH_NAMES[parseDate(monthStart.date).getMonth()]
          : "";
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
    <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-black tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[#71717a]">
            {viewMode === "monthly"
              ? MONTH_NAMES[selectedMonth] + " " + selectedYear
              : selectedYear}{" "}
            learning intensity from logged study minutes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) =>
              setViewMode(e.target.value as "monthly" | "yearly")
            }
            className="h-9 text-xs font-bold bg-[#f4f4f5] border border-[#e4e4e7] text-black rounded-lg px-3 focus:outline-none"
          >
            <option value="monthly">Monthly View</option>
            <option value="yearly">Yearly View</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-9 text-xs font-bold bg-[#f4f4f5] border border-[#e4e4e7] text-black rounded-lg px-3 focus:outline-none"
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
              className="h-9 text-xs font-bold bg-[#f4f4f5] border border-[#e4e4e7] text-black rounded-lg px-3 focus:outline-none"
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

      <div className="w-full overflow-x-auto pb-2">
        {viewMode === "yearly" ? (
          <div className="mx-auto w-max">
            <div
              className="ml-9 grid gap-1 mb-2"
              style={{
                gridTemplateColumns:
                  "repeat(" + displayedData.weeks.length + ", 0.875rem)",
              }}
            >
              {displayedData.monthLabels.map((label, index) => (
                <span
                  key={label + "-" + index}
                  className="text-[10px] font-bold text-[#71717a] h-4"
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-2 justify-center">
              <div className="grid grid-rows-7 gap-1 w-7 text-[10px] font-bold text-[#a1a1aa]">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="h-3.5 leading-[14px]">
                    {label === "Mon" || label === "Wed" || label === "Fri"
                      ? label
                      : ""}
                  </div>
                ))}
              </div>
              <div className="inline-flex gap-1">
                {displayedData.weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-rows-7 gap-1">
                    {week.map((day, dayIndex) => (
                      <div
                        key={day?.date || weekIndex + "-" + dayIndex}
                        onMouseEnter={() => day && setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={getYearlyDayClass(day)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md mx-auto">
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-bold text-[#a1a1aa] uppercase">
              {WEEKDAY_LABELS.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {displayedData.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-2">
                  {week.map((day, dayIndex) => (
                    <div key={dayIndex} className="aspect-square w-full">
                      {day ? (
                        <div
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={getMonthlyDayClass(day)}
                        >
                          {parseInt(day.date.split("-")[2], 10)}
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

      <div className="mt-6 pt-4 border-t border-[#f4f4f5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="min-h-[24px]">
          {hoveredDay && (
            <div className="flex items-center gap-2 text-black animate-in fade-in duration-150">
              <span className="font-semibold">
                {formatDate(hoveredDay.date)}:
              </span>
              <span className="font-bold">
                {formatHours(hoveredDay.count)} logged
              </span>
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
