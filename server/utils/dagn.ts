// DAGN = Directed Acyclic Graph Normalization
import { AggregatedDebt } from "./aggregation";

/**
 * Simplifies the debt matrix by finding indirect paths and reducing them
 * E.g. If A owes B and B owes C, minimize pass-through.
 * Returns a debt list: [{ from, to, amount }]
 */
type DebtEdge = { from: string, to: string, amount: number };

export function simplifyDebts(matrix: AggregatedDebt): DebtEdge[] {
  // Build net balances for each user
  const balance: Record<string, number> = {};

  // Calculate balance per user (what they owe minus what they are owed)
  for (const from in matrix) {
    for (const to in matrix[from]) {
      const amount = matrix[from][to];
      balance[from] = (balance[from] || 0) - amount;
      balance[to]   = (balance[to] || 0) + amount;
    }
  }

  // Debtors: balance<0, Creditors: balance>0
  const debtors = Object.entries(balance).filter(([, amt]) => amt < 0).map(([u]) => u);
  const creditors = Object.entries(balance).filter(([, amt]) => amt > 0).map(([u]) => u);

  const result: DebtEdge[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const owe = Math.min(-balance[debtor], balance[creditor]);
    if (owe > 0) {
      result.push({ from: debtor, to: creditor, amount: owe });
      balance[debtor] += owe;
      balance[creditor] -= owe;
    }
    if (balance[debtor] === 0) i++;
    if (balance[creditor] === 0) j++;
  }
  return result;
}