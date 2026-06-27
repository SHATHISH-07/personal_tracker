import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Plan from "@/models/Plan";

export async function GET() {
  try {
    await connectToDatabase();
    const plans = await Plan.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: plans });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Default 7-day routine tasks if not provided
    const defaultRoutines = [
      { dayOfWeek: 1, title: "Monday Deep Dive", scheduledMinutes: 60, isOffDay: false },
      { dayOfWeek: 2, title: "Tuesday Practice", scheduledMinutes: 60, isOffDay: false },
      { dayOfWeek: 3, title: "Wednesday Review", scheduledMinutes: 60, isOffDay: false },
      { dayOfWeek: 4, title: "Thursday Project Work", scheduledMinutes: 60, isOffDay: false },
      { dayOfWeek: 5, title: "Friday Wrap-up", scheduledMinutes: 60, isOffDay: false },
      { dayOfWeek: 6, title: "Saturday Intensive", scheduledMinutes: 120, isOffDay: false },
      { dayOfWeek: 0, title: "Sunday Rest & Reflect", scheduledMinutes: 0, isOffDay: true },
    ];

    const planData = {
      ...body,
      routineTasks: body.routineTasks && body.routineTasks.length > 0 ? body.routineTasks : defaultRoutines,
    };

    const newPlan = await Plan.create(planData);
    return NextResponse.json({ success: true, data: newPlan }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
