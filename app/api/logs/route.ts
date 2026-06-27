import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import DailyLog from "@/models/DailyLog";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const planId = searchParams.get("planId");

    await connectToDatabase();

    const filter: Record<string, string> = {};
    if (date) filter.date = date;
    if (planId) filter.planId = planId;

    const logs = await DailyLog.find(filter).sort({ date: -1 });
    return NextResponse.json({ success: true, data: logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { date, planId, session, sessions, completedRoutineTaskIds, scheduledMinutes, actualMinutes, startTime, endTime, notes, reflection } = body;

    if (!date) {
      return NextResponse.json({ success: false, error: "Date is required" }, { status: 400 });
    }

    // Enforce lock on past days
    const todayStr = new Date().toISOString().split("T")[0];
    if (date < todayStr) {
      return NextResponse.json({ success: false, error: "Cannot update records for past days once the day has ended." }, { status: 403 });
    }

    const query: Record<string, string> = { date };
    if (planId) query.planId = planId;

    // Find existing log to merge or update
    const existingLog = await DailyLog.findOne(query);

    if (existingLog) {
      if (session) {
        existingLog.sessions = existingLog.sessions || [];
        existingLog.sessions.push(session);
        existingLog.actualMinutes = existingLog.sessions.reduce((acc: number, s: { actualMinutes?: number }) => acc + (s.actualMinutes || 0), 0);
      } else if (sessions !== undefined) {
        existingLog.sessions = sessions;
        existingLog.actualMinutes = sessions.reduce((acc: number, s: { actualMinutes?: number }) => acc + (s.actualMinutes || 0), 0);
      } else if (actualMinutes !== undefined) {
        existingLog.actualMinutes = actualMinutes;
      }

      if (completedRoutineTaskIds !== undefined) existingLog.completedRoutineTaskIds = completedRoutineTaskIds;
      if (scheduledMinutes !== undefined) existingLog.scheduledMinutes = scheduledMinutes;
      if (startTime !== undefined) existingLog.startTime = startTime;
      if (endTime !== undefined) existingLog.endTime = endTime;
      if (notes !== undefined) existingLog.notes = notes;
      if (reflection !== undefined) existingLog.reflection = reflection;

      await existingLog.save();
      return NextResponse.json({ success: true, data: existingLog });
    } else {
      const initialSessions = session ? [session] : (sessions || []);
      const totalActual = initialSessions.length > 0
        ? initialSessions.reduce((acc: number, s: { actualMinutes?: number }) => acc + (s.actualMinutes || 0), 0)
        : (actualMinutes || 0);

      const newLog = await DailyLog.create({
        date,
        planId,
        completedRoutineTaskIds: completedRoutineTaskIds || [],
        scheduledMinutes: scheduledMinutes || 0,
        actualMinutes: totalActual,
        startTime: startTime || "",
        endTime: endTime || "",
        sessions: initialSessions,
        notes: notes || "",
        reflection: reflection || "",
      });
      return NextResponse.json({ success: true, data: newLog }, { status: 201 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
