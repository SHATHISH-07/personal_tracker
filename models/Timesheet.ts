import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITimesheet extends Document {
  date: string; // YYYY-MM-DD
  projectTitle: string;
  description: string;
  hours?: number;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimesheetSchema = new Schema<ITimesheet>(
  {
    date: { type: String, required: true, index: true },
    projectTitle: { type: String, required: true },
    description: { type: String, required: true },
    hours: { type: Number, default: 0 },
    category: { type: String, default: "Work" },
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.Timesheet) {
  delete mongoose.models.Timesheet;
}

const Timesheet: Model<ITimesheet> = mongoose.model<ITimesheet>("Timesheet", TimesheetSchema);

export default Timesheet;
