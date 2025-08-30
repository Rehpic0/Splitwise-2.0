import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Example:
 * - groupExpense: group: _id
 * - direct: group: null
 * - payer: A
 * - involved: [A, B], split: { A: 30, B: 70 }
 */
export interface IExpense extends Document {
  group: Types.ObjectId | null;
  description: string;
  amount: number;
  payer: Types.ObjectId;           // Who paid
  involved: Types.ObjectId[];      // Users involved in split
  split: Record<string, number>;   // { userId: amountOwed }
  createdAt: Date;
  approved: boolean;
}

const ExpenseSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", default: null },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  payer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  involved: [{ type: Schema.Types.ObjectId, ref: "User" }],
  split: { type: Object, required: true }, // e.g. { "USERID1": 50, "USERID2": 50 }
  createdAt: { type: Date, default: Date.now },
  approved: { type: Boolean, default: false } // Only true once ALL approve (DAS)
});

export default mongoose.model<IExpense>("Expense", ExpenseSchema);