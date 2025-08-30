import Expense from "../models/Expense";

export interface AggregatedDebt {
  [fromUserId: string]: { [toUserId: string]: number };
}

export async function getGroupDebtMatrix(groupId: string): Promise<AggregatedDebt> {
  // Only use APPROVED expenses!
  const expenses = await Expense.find({ group: groupId, approved: true });

  // Debt graph: fromUserId -> toUserId -> amount
  const matrix: AggregatedDebt = {};

  for (const exp of expenses) {
    const payer = exp.payer.toString();
    // Create per-pair map of how much is already settled
    const settledMap: Record<string, number> = {};
    if (exp.settlements && Array.isArray(exp.settlements)) {
      for (const s of exp.settlements) {
        // Each settlement is "from" user to "to" user
        // You could aggregate by pair for this expense:
        if (!settledMap[`${s.from}-${s.to}`]) {
          settledMap[`${s.from}-${s.to}`] = 0;
        }
        settledMap[`${s.from}-${s.to}`] += s.amount;
      }
    }
    for (const userId in exp.split) {
      if (userId !== payer) {
        let owed = exp.split[userId];
        // Subtract any recorded settlements for that pair
        const settled = settledMap[`${userId}-${payer}`] || 0;
        owed -= settled;
        if (owed > 0.01) { // Ignore near-zero
          matrix[userId] = matrix[userId] || {};
          matrix[userId][payer] = (matrix[userId][payer] || 0) + owed;
        }
      }
    }
  }

  return matrix;
}