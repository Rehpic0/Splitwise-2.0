import express from "express";
import User from "../models/User";
import Group from "../models/Group";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Get current user profile
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await User.findById(req.userId).select("-passwordHash");
  res.json({ user });
});

// Get user’s groups (with group metadata)
router.get("/groups", requireAuth, async (req: AuthRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "Not found" });

  const groups = await Group.find({ _id: { $in: user.groups } });
  res.json({ groups });
});

export default router;