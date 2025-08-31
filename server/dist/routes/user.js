"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/User"));
const Group_1 = __importDefault(require("../models/Group"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get current user profile
router.get("/me", auth_1.requireAuth, async (req, res) => {
    const user = await User_1.default.findById(req.userId).select("-passwordHash");
    res.json({ user });
});
// Get user’s groups (with group metadata)
router.get("/groups", auth_1.requireAuth, async (req, res) => {
    const user = await User_1.default.findById(req.userId);
    if (!user)
        return res.status(404).json({ error: "Not found" });
    const groups = await Group_1.default.find({ _id: { $in: user.groups } });
    res.json({ groups });
});
exports.default = router;
