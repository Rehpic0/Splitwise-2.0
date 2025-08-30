import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISettlement {
  from: Types.ObjectId;
  to: Types.ObjectId;
  amount: number;
  approved: boolean;
  createdAt: Date;
}

export interface IExpense extends Document {
  group: Types.ObjectId | null;
  description: string;
  amount: number;
  payer: Types.ObjectId;           // Who paid
  involved: Types.ObjectId[];      // Users involved in split
  split: Record<string, number>;   // { userId: amountOwed }
  createdAt: Date;
  approved: boolean;
  rejected: boolean;
  settlements: ISettlement[];
}

const ExpenseSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", default: null },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  payer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  involved: [{ type: Schema.Types.ObjectId, ref: "User" }],
  split: { type: Object, required: true }, // e.g. { "USERID1": 50, "USERID2": 50 }
  createdAt: { type: Date, default: Date.now },
  approved: { type: Boolean, default: false },
  rejected: { type: Boolean, default: false },
  settlements: [
    {
      from: { type: Schema.Types.ObjectId, ref: "User" },
      to: { type: Schema.Types.ObjectId, ref: "User" },
      amount: { type: Number },
      approved: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

export default mongoose.model<IExpense>("Expense", ExpenseSchema);
