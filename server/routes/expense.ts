import express from "express";
import Expense from "../models/Expense";
import Group from "../models/Group";
import ApprovalRequest from "../models/ApprovalRequest";
import { requireAuth, AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

const router = express.Router();

// List expenses for group (or non-group expenses if group is null)
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const { groupId } = req.query;
  let expenses;
  if (groupId === "null") {
    // non-group (direct) expenses
    expenses = await Expense.find({
      group: null,
      involved: req.userId,
    }).sort({ createdAt: -1 });
  } else {
    expenses = await Expense.find({
      group: groupId,
      involved: req.userId,
    }).sort({ createdAt: -1 });
  }
  res.json({ expenses });
});

// Add an expense (pending DAS approval)
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  /**
   * Expect: {
   *   group: groupId | null,
   *   description,
   *   amount,
   *   payer,          // userId who paid
   *   involved,       // userIds[] (all people sharing)
   *   split           // { [userId]: amount }
   * }
   * Only the involved[] need to approve (except creator/payer).
   */
  const { group, description, amount, payer, involved, split } = req.body;
  console.log('✅', JSON.stringify({ payer, amount, split }, null, 2));
  if (!involved.includes(payer))
    return res.status(400).json({ error: "Payer must be in involved" });

  const expense = await Expense.create({
    group,
    description,
    amount,
    payer,
    involved,
    split,
    approved: false,
  });
  if (group) await Group.findByIdAndUpdate(group, { $addToSet: { expenses: expense._id } });

  // --- Core DAS pattern ---
  // All involved[] except req.userId must approve
  const receivers = involved.filter((id: string) => id !== req.userId);

  await ApprovalRequest.create({
    type: "EXPENSE",
    expense: expense._id,
    sender: req.userId,
    receivers,
    approvedBy: [],
    rejected: false,
  });

  res.json({ expense });
});

// Approve/Reject an expense creation request
router.post("/approve/:requestId", requireAuth, async (req: AuthRequest, res) => {
  const { requestId } = req.params;
  const { accept } = req.body;

  const request = await ApprovalRequest.findById(requestId);
  if (!request) return res.status(404).json({ error: "Not found" });

  // If user is not a receiver, forbidden
  if (!request.receivers.map(id => id.toString()).includes(req.userId!))
    return res.status(403).json({ error: "Not your request" });

  if (request.approvedBy?.includes(req.userId as any))
    return res.status(400).json({ error: "Already approved" });

  if (accept) {
    request.approvedBy.push(req.userId as any);
    // If all receivers have approved, mark expense as approved
    if (request.approvedBy.length === request.receivers.length) {
      const expense = await Expense.findById(request.expense);
      if (expense) expense.approved = true;
      await expense?.save();
      await request.deleteOne();
      return res.json({ success: true, message: "Expense fully approved" });
    }
    await request.save();
    return res.json({ success: true, message: "Approved, waiting for others" });
  } else {
    request.rejected = true;
    await request.save();

    const expense = await Expense.findById(request.expense);
    if (expense) expense.rejected = true;
    await expense?.save();
    // if (expense) await expense.deleteOne();
    await request.deleteOne();

    return res.json({ success: true, message: "Rejected expense" });
  }
});

// Get all pending approvals for this user
router.get("/pending", requireAuth, async (req: AuthRequest, res) => {
  const requests = await ApprovalRequest.find({
    receivers: req.userId,
    rejected: false,
  }).populate("expense");
  res.json({ requests });
});

export default router;

// Settle up an expense (creates a SETTLE approval request)
router.post("/:expenseId/settle", requireAuth, async (req: AuthRequest, res) => {
  /**
   * Body: {
   *  amount: number,     // amount settled (can be partial)
   *  receiver: userId    // the person being paid back (i.e., the creditor)
   * }
   * Sender: currently logged in user (debtor paying)
   * Receiver must confirm for settlement to complete.
   */
  const { expenseId } = req.params;
  const { amount, receiver } = req.body;
  const sender = req.userId!;

  // Verify expense exists and this user owes something
  const expense = await Expense.findById(expenseId);
  if (!expense) return res.status(404).json({ error: "Expense not found" });

  if (!expense.involved.map(id => id.toString()).includes(sender))
    return res.status(403).json({ error: "You are not involved in this expense" });

  // Simple check: sender != receiver
  if (receiver === sender)
    return res.status(400).json({ error: "Cannot settle with yourself" });

  // You might want to check that sender does owe receiver for this expense here (optional)

  // Create SETTLE approval request
  const approval = await ApprovalRequest.create({
    type: "SETTLE",
    expense: expense._id,
    sender,
    receivers: [receiver],
    approvedBy: [],
    rejected: false,
    meta: { amount }
  });

  res.json({ approval });
});

// Approve or reject a settle request (receiver acts here)
router.post("/settle/approve/:requestId", requireAuth, async (req: AuthRequest, res) => {
  /**
   * Body: { accept: boolean }
   */
  const { requestId } = req.params;
  const { accept } = req.body;
  const userId = new mongoose.Types.ObjectId(req.userId!);

  // Get request; it must be a SETTLE, and user must be receiver
  const request = await ApprovalRequest.findById(requestId);
  if (!request || request.type !== "SETTLE")
    return res.status(404).json({ error: "Settle request not found" });

  if (!request.receivers.map(id => id.toString()).includes(userId.toString()))
    return res.status(403).json({ error: "Not authorized" });

  if (request.approvedBy.includes(userId as any))
    return res.status(400).json({ error: "Already responded" });

  if (accept) {
    request.approvedBy.push(userId as any);

    // We'll just delete the approval request for now!
    await request.deleteOne();

    // You’d ideally now update the Expense/"Settlement" record too
    // -- Add a settlement entry
    const expense = await Expense.findById(request.expense);
    if (expense) {
      expense.settlements = expense.settlements || [];
      expense.settlements.push({
        from: request.sender,
        to: userId,
        amount: request?.meta?.amount ?? 0,
        approved: true,
        createdAt: new Date()
      });
      await expense.save();
    }

    return res.json({ success: true, message: "Settle completed/approved" });
  } else {
    request.rejected = true;
    await request.save();
    return res.json({ success: true, message: "Settle rejected" });
  }
});