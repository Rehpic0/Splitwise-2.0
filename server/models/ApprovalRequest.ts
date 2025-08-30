import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Used for both:
 * - Expense confirmation (type: 'EXPENSE')
 * - Settle confirmation (type: 'SETTLE')
 */
export interface IApprovalRequest extends Document {
  type: "EXPENSE" | "SETTLE";
  expense: Types.ObjectId;                  // Linked expense
  sender: Types.ObjectId;
  receivers: Types.ObjectId[];              // Must approve (except sender/creator)
  approvedBy: Types.ObjectId[];             // Who has approved
  rejected: boolean;
  createdAt: Date;
  meta?: {
    amount?: number;                // For EXPENSE
  };                            // Any extra e.g. { amountPaid }
}

const ApprovalRequestSchema: Schema = new Schema({
  type: { type: String, enum: ["EXPENSE", "SETTLE"], required: true },
  expense: { type: Schema.Types.ObjectId, ref: "Expense", required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receivers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  approvedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  rejected: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  meta: { type: Schema.Types.Mixed }
});

export default mongoose.model<IApprovalRequest>("ApprovalRequest", ApprovalRequestSchema);