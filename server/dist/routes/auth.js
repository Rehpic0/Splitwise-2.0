"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET;
// Register
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    const existing = await User_1.default.findOne({ email });
    if (existing)
        return res.status(400).json({ error: "Email exists" });
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await User_1.default.create({ name, email, passwordHash, groups: [] });
    // Issue JWT
    const token = jsonwebtoken_1.default.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "2d" });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
});
// Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User_1.default.findOne({ email });
    if (!user)
        return res.status(401).json({ error: "Invalid credentials" });
    const match = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!match)
        return res.status(401).json({ error: "Invalid credentials" });
    // Issue JWT
    const token = jsonwebtoken_1.default.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "2d" });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email } });
});
exports.default = router;
