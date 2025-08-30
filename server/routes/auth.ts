import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET!;
console.log('✅', JWT_SECRET);

// Register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  console.log(JSON.stringify(req.body))
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: "Email exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, groups: [] });

  // Issue JWT
  console.log('✅', JWT_SECRET)
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "2d" });
  res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  // Issue JWT
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "2d" });
  res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
});

export default router;