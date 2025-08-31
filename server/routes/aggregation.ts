  import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { simplifyDebts } from "../utils/dagn";
import User from "../models/User";
import { getGroupDebtMatrix } from "../utils/aggregation";

const router = express.Router();

/**
 * GET /api/aggregation/group/:groupId
 * Returns:
 * {
 *   debts: [{ from, to, amount }],
 *   currentUserSummary: { totalOwe, totalOwed, perUser: { [userId]: number } }
 * }
 */
router.get("/group/:groupId", requireAuth, async (req: AuthRequest, res) => {
  const { groupId } = req.params;
  const userId = req.userId!;

  const matrix = await getGroupDebtMatrix(groupId);
  const simplified = simplifyDebts(matrix);

  // Compute summary for the current user
  let totalOwe = 0, totalOwed = 0;
  const perUser: Record<string, number> = {};

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

export default router;