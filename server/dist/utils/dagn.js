"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simplifyDebts = simplifyDebts;
function simplifyDebts(matrix) {
    // Build net balances for each user
    const balance = {};
    // Calculate balance per user (what they owe minus what they are owed)
    for (const from in matrix) {
        for (const to in matrix[from]) {
            const amount = matrix[from][to];
            balance[from] = (balance[from] || 0) - amount;
            balance[to] = (balance[to] || 0) + amount;
        }
    }
    // Debtors: balance<0, Creditors: balance>0
    const debtors = Object.entries(balance).filter(([, amt]) => amt < 0).map(([u]) => u);
    const creditors = Object.entries(balance).filter(([, amt]) => amt > 0).map(([u]) => u);
    const result = [];
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
        if (balance[debtor] === 0)
            i++;
        if (balance[creditor] === 0)
            j++;
    }
    return result;
}
