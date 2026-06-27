import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudySession {
  _id?: string;
  startTime: string;
  endTime: string;
  actualMinutes: number;
  topicsCovered: string[];
  description: string;
}

export interface IDailyLog extends Document {
  date: string; // YYYY-MM-DD
  planId?: mongoose.Types.ObjectId | string;
  completedRoutineTaskIds: string[];
  scheduledMinutes: number;
  actualMinutes: number;
  startTime?: string;
  endTime?: string;
  sessions?: IStudySession[];
  notes?: string;
  reflection?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudySessionSchema = new Schema<IStudySession>({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  actualMinutes: { type: Number, required: true },
  topicsCovered: [{ type: String }],
  description: { type: String, default: "" },
});

const DailyLogSchema = new Schema<IDailyLog>(
  {
    date: { type: String, required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    completedRoutineTaskIds: [{ type: String }],
    scheduledMinutes: { type: Number, default: 0 },
    actualMinutes: { type: Number, default: 0 },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    sessions: [StudySessionSchema],
    notes: { type: String, default: "" },
    reflection: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound index to ensure one log per date per plan (or global date log)
DailyLogSchema.index({ date: 1, planId: 1 }, { unique: true });

const DailyLog: Model<IDailyLog> =
  mongoose.models.DailyLog || mongoose.model<IDailyLog>("DailyLog", DailyLogSchema);

export default DailyLog;
