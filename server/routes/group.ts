import express from "express";
import Group from "../models/Group";
import User from "../models/User";
import { requireAuth, AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

const router = express.Router();

// Create a new group
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { name, memberIds } = req.body; // memberIds: array of user IDs to add (can be empty)
  const userId = req.userId!;

  // Make sure creator is member
  const ids = Array.from(new Set([userId, ...(memberIds || [])]));

  const group = await Group.create({ name, members: ids, expenses: [] });
  // Add group to each member’s `groups` array
  await User.updateMany(
    { _id: { $in: ids } },
    { $addToSet: { groups: group._id } }
  );

  res.json({ group });
});

// Add user to a group ("join")
router.post("/:groupId/join", requireAuth, async (req: AuthRequest, res) => {
  const { groupId } = req.params;
  const userId = req.userId!;
  const group = await Group.findByIdAndUpdate(
    groupId,
    { $addToSet: { members: userId } },
    { new: true }
  );
  if (!group) return res.status(404).json({ error: "Group not found" });
  await User.findByIdAndUpdate(userId, { $addToSet: { groups: group._id } });
  res.json({ group });
});

// Remove from group ("leave")
router.post("/:groupId/leave", requireAuth, async (req: AuthRequest, res) => {
  const { groupId } = req.params;
  const userId = req.userId!;
  const group = await Group.findByIdAndUpdate(
    groupId,
    { $pull: { members: userId } },
    { new: true }
  );
  if (!group) return res.status(404).json({ error: "Group not found" });
  await User.findByIdAndUpdate(userId, { $pull: { groups: group._id } });
  res.json({ group });
});

// Delete group (if creator/admin, for now only if single member)
router.delete("/:groupId", requireAuth, async (req: AuthRequest, res) => {
  const { groupId } = req.params;
  const group = await Group.findById(groupId);
  if (!group) return res.status(404).json({ error: "Group not found" });

  if (group.members.length > 1)
    return res.status(400).json({ error: "Remove all but one member first" });

  await group.deleteOne();
  res.json({ success: true });
});

// Get Group details (with populated members)
router.get("/:groupId", requireAuth, async (req: AuthRequest, res) => {
  const { groupId } = req.params;
  const group = await Group.findById(groupId).populate("members", "name email");
  if (!group) return res.status(404).json({ error: "Group not found" });
  res.json({ group });
});

export default router;