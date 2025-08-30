import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGroup extends Document {
  name: string;
  members: Types.ObjectId[]; // User IDs
  expenses: Types.ObjectId[]; // Expense IDs
}

const GroupSchema: Schema = new Schema({
  name: { type: String, required: true },
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  expenses: [{ type: Schema.Types.ObjectId, ref: "Expense" }]
});

export default mongoose.model<IGroup>("Group", GroupSchema);