"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const dagn_1 = require("../utils/dagn");
const aggregation_1 = require("../utils/aggregation");
const router = express_1.default.Router();
/**
 * GET /api/aggregation/group/:groupId
 * Returns:
 * {
 *   debts: [{ from, to, amount }],
 *   currentUserSummary: { totalOwe, totalOwed, perUser: { [userId]: number } }
 * }
 */
router.get("/group/:groupId", auth_1.requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId;
    const matrix = await (0, aggregation_1.getGroupDebtMatrix)(groupId);
    const simplified = (0, dagn_1.simplifyDebts)(matrix);
    // Compute summary for the current user
    let totalOwe = 0, totalOwed = 0;
    const perUser = {};
    for (const debt of simplified) {
        if (debt.from === userId) {
            totalOwe += debt.amount;
            perUser[debt.to] = (perUser[debt.to] || 0) + debt.amount;
        }
        if (debt.to === userId) {
            totalOwed += debt.amount;
            perUser[debt.from] = (perUser[debt.from] || 0) - debt.amount;
        }
    }
    res.json({
        debts: simplified, // [{ from, to, amount }]
        currentUserSummary: { totalOwe, totalOwed, perUser }
    });
});
exports.default = router;
