import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import DailyLog from "@/models/DailyLog";
import Plan from "@/models/Plan";

export async function GET() {
  try {
    await connectToDatabase();

    const allLogs = await DailyLog.find({});
    const activePlans = await Plan.countDocuments({ status: "active" });

    let totalMinutes = 0;
    const logMap: Record<string, number> = {};

    allLogs.forEach((log) => {
      totalMinutes += log.actualMinutes || 0;
      const d = log.date;
      logMap[d] = (logMap[d] || 0) + (log.actualMinutes || 0);
    });

    const totalHoursLogged = Math.round((totalMinutes / 60) * 10) / 10;

    // Calculate streak
    let streak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    // Check if logged today, if not check starting from yesterday
    const checkDate = new Date(today);
    if (!logMap[todayStr] || logMap[todayStr] === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (logMap[dateStr] && logMap[dateStr] > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Generate 365 days heatmap data
    const heatmapData = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 364);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split("T")[0];
      const mins = logMap[ds] || 0;
      let level = 0;
      if (mins > 0 && mins < 30) level = 1;
      else if (mins >= 30 && mins < 60) level = 2;
      else if (mins >= 60 && mins < 120) level = 3;
      else if (mins >= 120) level = 4;

      heatmapData.push({
        date: ds,
        count: mins,
        level,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalHoursLogged,
        currentStreak: streak,
        activePlansCount: activePlans,
        heatmapData,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
