import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Timesheet from "@/models/Timesheet";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const month = searchParams.get("month"); // e.g. YYYY-MM

    await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (date) {
      filter.date = date;
    } else if (month) {
      filter.date = { $regex: `^${month}` };
    }

    const entries = await Timesheet.find(filter).sort({ date: -1, createdAt: -1 });
    return NextResponse.json({ success: true, data: entries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { date, projectTitle, description, hours, category } = body;

    if (!date || !projectTitle || !description) {
      return NextResponse.json(
        { success: false, error: "Date, project title, and description are required" },
        { status: 400 }
      );
    }

    const entry = await Timesheet.create({
      date,
      projectTitle: projectTitle.trim(),
      description: description.trim(),
      hours: Number(hours) || 0,
      category: category || "Work",
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
