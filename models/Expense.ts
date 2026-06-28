import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpense extends Document {
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    date: { type: String, required: true, index: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;
