import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Plan from "@/models/Plan";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const plan = await Plan.findById(id);
    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: plan });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const body = await request.json();

    const updatedPlan = await Plan.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updatedPlan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updatedPlan });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const deletedPlan = await Plan.findByIdAndDelete(id);
    if (!deletedPlan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Plan deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
