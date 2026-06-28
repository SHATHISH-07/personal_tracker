import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Expense from "@/models/Expense";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    await connectToDatabase();

    const filter: Record<string, string> = {};
    if (date) filter.date = date;

    // Fetch expenses and sort by most recent first
    const expenses = await Expense.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: expenses });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { date, category, description, amount } = body;

    if (!date || !category || !description || amount === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newExpense = await Expense.create({
      date,
      category,
      description,
      amount: Number(amount),
    });

    return NextResponse.json({ success: true, data: newExpense }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
