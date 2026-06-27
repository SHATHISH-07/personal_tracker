import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubtopicChecklist {
  _id?: string;
  title: string;
  completed: boolean;
}

export interface ITopic {
  _id?: string;
  name: string;
  description?: string;
  subtopics?: string[];
  checklist?: ISubtopicChecklist[];
  monthNumber?: number;
  periodNumber?: number; // 1 for Week 1 or Month 1
  completed: boolean;
}

export interface IResource {
  _id?: string;
  title: string;
  url: string;
  type: "video" | "doc" | "book";
  notes?: string;
}

export interface IRoutineTask {
  _id?: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  title: string;
  scheduledMinutes: number;
  isOffDay: boolean;
  startTime?: string;
  endTime?: string;
  assignedTopics?: string[];
}

export interface IPlan extends Document {
  title: string;
  planType?: "weekly" | "monthly";
  description?: string;
  durationMonths: number;
  startDate: Date;
  endDate?: Date;
  status: "active" | "completed" | "paused";
  colorAccent: string;
  topics: ITopic[];
  resources: IResource[];
  routineTasks: IRoutineTask[];
  createdAt: Date;
  updatedAt: Date;
}

const SubtopicChecklistSchema = new Schema<ISubtopicChecklist>({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const TopicSchema = new Schema<ITopic>({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  subtopics: [{ type: String }],
  checklist: [SubtopicChecklistSchema],
  monthNumber: { type: Number, default: 1 },
  periodNumber: { type: Number, default: 1 },
  completed: { type: Boolean, default: false },
});

const ResourceSchema = new Schema<IResource>({
  title: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ["video", "doc", "book"], default: "doc" },
  notes: { type: String, default: "" },
});

const RoutineTaskSchema = new Schema<IRoutineTask>({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  title: { type: String, default: "Study Session" },
  scheduledMinutes: { type: Number, default: 60 },
  isOffDay: { type: Boolean, default: false },
  startTime: { type: String, default: "09:00" },
  endTime: { type: String, default: "10:00" },
  assignedTopics: [{ type: String }],
});

const PlanSchema = new Schema<IPlan>(
  {
    title: { type: String, required: true },
    planType: { type: String, enum: ["weekly", "monthly"], default: "monthly" },
    description: { type: String, default: "" },
    durationMonths: { type: Number, default: 1 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    status: { type: String, enum: ["active", "completed", "paused"], default: "active" },
    colorAccent: { type: String, default: "emerald" },
    topics: [TopicSchema],
    resources: [ResourceSchema],
    routineTasks: [RoutineTaskSchema],
  },
  { timestamps: true }
);

// Prevent mongoose model recompilation error in development while allowing schema updates
if (mongoose.models && mongoose.models.Plan) {
  delete mongoose.models.Plan;
}
const Plan: Model<IPlan> = mongoose.model<IPlan>("Plan", PlanSchema);

export default Plan;
