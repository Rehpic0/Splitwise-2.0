"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Group_1 = __importDefault(require("../models/Group"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
// Create a new group
router.post("/", auth_1.requireAuth, async (req, res) => {
    const { name, memberIds } = req.body; // memberIds: array of user IDs to add (can be empty)
    const userId = req.userId;
    // Make sure creator is member
    const ids = Array.from(new Set([userId, ...(memberIds || [])]));
    const group = await Group_1.default.create({ name, members: ids, expenses: [] });
    // Add group to each member’s `groups` array
    await User_1.default.updateMany({ _id: { $in: ids } }, { $addToSet: { groups: group._id } });
    res.json({ group });
});
// Add user to a group ("join")
router.post("/:groupId/join", auth_1.requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId;
    const group = await Group_1.default.findByIdAndUpdate(groupId, { $addToSet: { members: userId } }, { new: true });
    if (!group)
        return res.status(404).json({ error: "Group not found" });
    await User_1.default.findByIdAndUpdate(userId, { $addToSet: { groups: group._id } });
    res.json({ group });
});
// Remove from group ("leave")
router.post("/:groupId/leave", auth_1.requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId;
    const group = await Group_1.default.findByIdAndUpdate(groupId, { $pull: { members: userId } }, { new: true });
    if (!group)
        return res.status(404).json({ error: "Group not found" });
    await User_1.default.findByIdAndUpdate(userId, { $pull: { groups: group._id } });
    res.json({ group });
});
// Delete group (if creator/admin, for now only if single member)
router.delete("/:groupId", auth_1.requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const group = await Group_1.default.findById(groupId);
    if (!group)
        return res.status(404).json({ error: "Group not found" });
    if (group.members.length > 1)
        return res.status(400).json({ error: "Remove all but one member first" });
    await group.deleteOne();
    res.json({ success: true });
});
// Get Group details (with populated members)
router.get("/:groupId", auth_1.requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const group = await Group_1.default.findById(groupId).populate("members", "name email");
    if (!group)
        return res.status(404).json({ error: "Group not found" });
    res.json({ group });
});
// Invite/add member to group via their email address (auth required, must be group member themselves)
router.post("/:groupId/invite-member", auth_1.requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: "Email required" });
    const group = await Group_1.default.findById(groupId);
    if (!group)
        return res.status(404).json({ error: "Group not found" });
    if (!group.members.includes(new mongoose_1.default.Types.ObjectId(req.userId))) {
        return res.status(403).json({ error: "You are not in this group" });
    }
    // Find user by email
    const userToAdd = await User_1.default.findOne({ email });
    if (!userToAdd)
        return res.status(404).json({ error: "User not found" });
    const userToAddId = userToAdd._id;
    // Add to group, if not already present
    if (!group.members.map(id => id.toString()).includes(userToAddId.toString())) {
        group.members.push(userToAddId);
        await group.save();
        await User_1.default.findByIdAndUpdate(userToAddId, { $addToSet: { groups: group._id } });
    }
    res.json({ success: true, addedUser: { _id: userToAddId, name: userToAdd.name, email: userToAdd.email } });
});
exports.default = router;
