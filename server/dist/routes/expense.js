"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Expense_1 = __importDefault(require("../models/Expense"));
const Group_1 = __importDefault(require("../models/Group"));
const ApprovalRequest_1 = __importDefault(require("../models/ApprovalRequest"));
const auth_1 = require("../middleware/auth");
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
// List expenses for group (or non-group expenses if group is null)
router.get("/", auth_1.requireAuth, async (req, res) => {
    const { groupId } = req.query;
    let expenses;
    if (groupId === "null") {
        // non-group (direct) expenses
        expenses = await Expense_1.default.find({
            group: null,
            involved: req.userId,
        }).sort({ createdAt: -1 });
    }
    else {
        expenses = await Expense_1.default.find({
            group: groupId,
            involved: req.userId,
        }).sort({ createdAt: -1 });
    }
    res.json({ expenses });
});
// Add an expense (pending DAS approval)
router.post("/", auth_1.requireAuth, async (req, res) => {
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
    const expense = await Expense_1.default.create({
        group,
        description,
        amount,
        payer,
        involved,
        split,
        approved: false,
    });
    if (group)
        await Group_1.default.findByIdAndUpdate(group, { $addToSet: { expenses: expense._id } });
    // --- Core DAS pattern ---
    // All involved[] except req.userId must approve
    const receivers = involved.filter((id) => id !== req.userId);
    await ApprovalRequest_1.default.create({
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
router.post("/approve/:requestId", auth_1.requireAuth, async (req, res) => {
    const { requestId } = req.params;
    const { accept } = req.body;
    const request = await ApprovalRequest_1.default.findById(requestId);
    if (!request)
        return res.status(404).json({ error: "Not found" });
    // If user is not a receiver, forbidden
    if (!request.receivers.map(id => id.toString()).includes(req.userId))
        return res.status(403).json({ error: "Not your request" });
    if (request.approvedBy?.includes(req.userId))
        return res.status(400).json({ error: "Already approved" });
    if (accept) {
        request.approvedBy.push(req.userId);
        // If all receivers have approved, mark expense as approved
        if (request.approvedBy.length === request.receivers.length) {
            const expense = await Expense_1.default.findById(request.expense);
            if (expense)
                expense.approved = true;
            await expense?.save();
            await request.deleteOne();
            return res.json({ success: true, message: "Expense fully approved" });
        }
        await request.save();
        return res.json({ success: true, message: "Approved, waiting for others" });
    }
    else {
        request.rejected = true;
        await request.save();
        const expense = await Expense_1.default.findById(request.expense);
        if (expense)
            expense.rejected = true;
        await expense?.save();
        // if (expense) await expense.deleteOne();
        await request.deleteOne();
        return res.json({ success: true, message: "Rejected expense" });
    }
});
// Get all pending approvals for this user
router.get("/pending", auth_1.requireAuth, async (req, res) => {
    const requests = await ApprovalRequest_1.default.find({
        receivers: req.userId,
        rejected: false,
    }).populate("expense");
    res.json({ requests });
});
exports.default = router;
// Settle up an expense (creates a SETTLE approval request)
router.post("/:expenseId/settle", auth_1.requireAuth, async (req, res) => {
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
    const sender = req.userId;
    // Verify expense exists and this user owes something
    const expense = await Expense_1.default.findById(expenseId);
    if (!expense)
        return res.status(404).json({ error: "Expense not found" });
    if (!expense.involved.map(id => id.toString()).includes(sender))
        return res.status(403).json({ error: "You are not involved in this expense" });
    // Simple check: sender != receiver
    if (receiver === sender)
        return res.status(400).json({ error: "Cannot settle with yourself" });
    // You might want to check that sender does owe receiver for this expense here (optional)
    // Create SETTLE approval request
    const approval = await ApprovalRequest_1.default.create({
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
router.post("/settle/approve/:requestId", auth_1.requireAuth, async (req, res) => {
    /**
     * Body: { accept: boolean }
     */
    const { requestId } = req.params;
    const { accept } = req.body;
    const userId = new mongoose_1.default.Types.ObjectId(req.userId);
    // Get request; it must be a SETTLE, and user must be receiver
    const request = await ApprovalRequest_1.default.findById(requestId);
    if (!request || request.type !== "SETTLE")
        return res.status(404).json({ error: "Settle request not found" });
    if (!request.receivers.map(id => id.toString()).includes(userId.toString()))
        return res.status(403).json({ error: "Not authorized" });
    if (request.approvedBy.includes(userId))
        return res.status(400).json({ error: "Already responded" });
    if (accept) {
        request.approvedBy.push(userId);
        // We'll just delete the approval request for now!
        await request.deleteOne();
        // You’d ideally now update the Expense/"Settlement" record too
        // -- Add a settlement entry
        const expense = await Expense_1.default.findById(request.expense);
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
    }
    else {
        request.rejected = true;
        await request.save();
        return res.json({ success: true, message: "Settle rejected" });
    }
});
