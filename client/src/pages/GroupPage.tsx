import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";
import type { AxiosError } from "axios";


type AggregationSummary = {
  currentUserSummary: {
    totalOwe: number;
    totalOwed: number;
    perUser: Record<string, number>;
  };
  debts: Array<{
    from: string;
    to: string;
    amount: number;
  }>;
};

type User = { _id: string; name: string; email: string };
type Group = {
  _id: string;
  name: string;
  members: User[];
};
type Expense = {
  _id: string;
  description: string;
  amount: number;
  payer: string;
  involved: string[];
  approved: boolean;
  split: Record<string, number>;
  createdAt: string;
  settlements?: Settlement[];
};

type Settlement = {
  from: string;
  to: string;
  amount: number;
  approved: boolean;
  rejected?: boolean;
  createdAt: string;
  expenseDesc: string;
  expenseId: string;
};


function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"transactions" | "settlements">("transactions");
  // Expenses & aggregation
  const [expenses, setExpenses] = useState<Expense[]>([]);


  const [agg, setAgg] = useState<AggregationSummary | null>(null);


  // NEW: Add Expense form state
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState<number>(0);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [selected, setSelected] = useState<string[]>(user ? [user._id] : []);
  const [customSplit, setCustomSplit] = useState<Record<string, number>>({});
  const [loadingAdd, setLoadingAdd] = useState(false);

  const [payer, setPayer] = useState(user ? user._id : "");
  const [splitValidation, setSplitValidation] = useState<string | null>(null);

  const [showSettle, setShowSettle] = useState(false);
  const [settleToUser, setSettleToUser] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settling, setSettling] = useState(false);
  const [settleMsg, setSettleMsg] = useState<string | null>(null);

  function resetForm() {
    setDesc("");
    setAmt(0);
    setSplitType("equal");
    setSelected(user ? [user._id] : []);
    setCustomSplit({});
  }

  useEffect(() => {
    if (!id) return;
    async function fetchGroup() {
      try {
        setLoading(true);
        const res = await axios.get(`/groups/${id}`);
        setGroup(res.data.group);
      } catch (err) {
        nav("/home");
      } finally {
        setLoading(false);
      }
    }
    fetchGroup();
  }, [id, nav]);
  useEffect(() => {
    if (splitType === "custom") {
      const sum = selected.reduce((acc, uid) => acc + (customSplit[uid] || 0), 0);
      // Allow up to 1 cent rounding error
      if (Math.abs(sum - amt) > 0.01) {
        setSplitValidation(`Custom split must total $${amt.toFixed(2)}, but it's $${sum.toFixed(2)}.`);
      } else {
        setSplitValidation(null);
      }
    } else {
      setSplitValidation(null);
    }
  }, [customSplit, amt, selected, splitType]);
  const reloadExpenses = async () => {
    const exp = await axios.get("/expenses", { params: { groupId: id } });
    setExpenses(exp.data.expenses);
    const summary = await axios.get(`/aggregation/group/${id}`);
    setAgg(summary.data);
  };
  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      const exp = await axios.get("/expenses", { params: { groupId: id } });
      setExpenses(exp.data.expenses);

      const summary = await axios.get(`/aggregation/group/${id}`);
      setAgg(summary.data);
    }
    fetchData();
  }, [id, showForm]); // showForm ensures refetch after add

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (splitValidation) return; // Do not submit with split error!
    if (!payer) return;
    setLoadingAdd(true);
    let split: Record<string, number> = {};
    split[user!._id] = 0;
    if (splitType === "equal" && selected.length > 0) {
      const per = amt / selected.length;
      selected.forEach(uid => split[uid] = Number(per.toFixed(2)));
    } else {
      split = { ...split, ...customSplit };
    }

    await axios.post("/expenses", {
      group: id,
      description: desc,
      amount: amt,
      payer,
      involved: Array.from(new Set([...selected, user?._id])),
      split
    });
    setLoadingAdd(false); setShowForm(false); resetForm();
    reloadExpenses();
  }

  // Add to component state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<null | string>(null);
  const [inviteError, setInviteError] = useState<null | string>(null);
  const [inviting, setInviting] = useState(false);

  if (loading) return <div style={{ margin: 30 }}>Loading group...</div>;
  if (!group) return <div style={{ margin: 30 }}>Group not found or error.</div>;

  return (
    <div style={{ maxWidth: 560, margin: "32px auto", padding: 24, border: "1px solid #eee" }}>
      <h2>{group.name}</h2>
      <Link to="/home">← Back to Groups</Link>
      <h4 style={{ marginTop: 20 }}>Members:</h4>
      <ul>
        {group.members.map(m =>
          <li key={m._id}>
            {m.name} {user && user._id === m._id && <span style={{ color: "#888" }}>(You)</span>}
          </li>
        )}
      </ul>
      {/* INVITE MEMBER FORM */}
      <div style={{ background: "#eeeeff", padding: 10, margin: "18px 0", borderRadius: 6 }}>
        <b>Invite member by email:</b>
        <form
          style={{ display: "inline-block", marginLeft: 10 }}
          onSubmit={async e => {
            e.preventDefault();
            setInviting(true);
            setInviteStatus(null);
            setInviteError(null);
            try {
              const res = await axios.post(`/groups/${group._id}/invite-member`, { email: inviteEmail });
              setInviteStatus(`Added user: ${res.data.addedUser.name || res.data.addedUser.email}`);
              setInviteEmail("");
              // Refresh group info so new member appears in the member list
              const g = await axios.get(`/groups/${group._id}`);
              setGroup(g.data.group);
            } catch (err) {
              // Define the expected error response structure
              interface ErrorResponse {
                error: string;
              }
            
              // Type the error properly using AxiosError and the expected response structure
              const axiosError = err as AxiosError<ErrorResponse>;
              setInviteError(axiosError?.response?.data?.error || "Unknown error occurred");
            } finally {
              setInviting(false);
            }
          }}>
          <input
            type="email"
            value={inviteEmail}
            placeholder="Email address"
            required
            disabled={inviting}
            onChange={e => setInviteEmail(e.target.value)}
          />
          <button type="submit" disabled={inviting || !inviteEmail}>Invite</button>
          {inviteStatus && <span style={{ color: "green", marginLeft: 8 }}>{inviteStatus}</span>}
          {inviteError && <span style={{ color: "red", marginLeft: 8 }}>{inviteError}</span>}
        </form>
      </div>
      {/* Aggregate info (DAGN): */}
      {agg && (
  <div style={{ background: "#ffe", padding: 12, margin: "16px 0", border: "1px solid #ddc" }}>
    <b>Your balances in this group:</b><br />
    <span style={{ color: "#444" }}>
      {agg.currentUserSummary.totalOwe > 0 && (
        <>You owe <b>${agg.currentUserSummary.totalOwe.toFixed(2)}</b> in total.&nbsp;</>
      )}
      {agg.currentUserSummary.totalOwed > 0 && (
        <>You are owed <b>${agg.currentUserSummary.totalOwed.toFixed(2)}</b> in total.&nbsp;</>
      )}
    </span>
    {Object.keys(agg.currentUserSummary.perUser).length > 0 && (
      <ul style={{ margin: "8px 0" }}>
        {Object.entries(agg.currentUserSummary.perUser).map(([userId, amount]) =>
          <li key={userId}>
            {group.members.find(m => m._id === userId)?.name || "(unknown)"}:{" "}
            {amount > 0 && <span>You owe <b>${amount.toFixed(2)}</b></span>}
            {amount < 0 && <span>Owes you <b>${(-amount).toFixed(2)}</b></span>}
          </li>
        )}
      </ul>
    )}
  </div>
)}


      {agg && (
        <div style={{ margin: "8px 0 0 0" }}>
          {agg.debts
            .filter((d: any) => d.from === user?._id && d.amount > 0)
            .map((debt: any) => {
              const toUser = group.members.find(m => m._id === debt.to);
              return (
                <div key={debt.to} style={{ marginTop: 8 }}>
                  You owe <b>${debt.amount.toFixed(2)}</b> to <b>{toUser?.name || debt.to}</b>
                  <button
                    style={{ marginLeft: 9 }}
                    onClick={() => {
                      setSettleToUser(debt.to);
                      setSettleAmount(debt.amount);
                      setShowSettle(true);
                    }}
                  >
                    Settle up
                  </button>
                </div>
              );
            })}
        </div>
      )}

      {showSettle && (
        <form
          style={{ marginTop: 10, background: "#eefff2", padding: 10, borderRadius: 6 }}
          onSubmit={async e => {
            e.preventDefault();
            setSettling(true);
            setSettleMsg(null);
            try {
              // Find any one owed expense, or just create settle request for amount+to
              // (Backend does not care which expense for now)
              // For demo, we'll just pick the oldest expense that's not yet settled & involves the payer and payee
              const exp = expenses.find(
                exp =>
                  exp.involved.includes(user!._id!) &&
                  exp.involved.includes(settleToUser!) &&
                  exp.approved
              );
              if (!exp) {
                setSettleMsg("No eligible expense found between you and this user.");
                setSettling(false);
                return;
              }
              await axios.post(`/expenses/${exp._id}/settle`, {
                amount: settleAmount,
                receiver: settleToUser
              });
              setSettleMsg("Settle request sent! Wait for other party to approve.");
              setShowSettle(false);
            } catch (err: any) {
              setSettleMsg(err?.response?.data?.error || "Error sending settle request.");
            } finally {
              setSettling(false);
            }
          }}
        >
          <div>
            Settle amount: $
            <input
              value={settleAmount}
              type="number"
              step="0.01"
              min={0}
              max={settleAmount}
              onChange={e => setSettleAmount(Number(e.target.value))}
              required
              style={{ width: 60 }}
            />
            <span> to </span>
            <b>{group.members.find(m => m._id === settleToUser)?.name || ""}</b>
          </div>
          <button type="submit" disabled={settling}>Send Settle Request</button>
          <button type="button" onClick={() => setShowSettle(false)} style={{ marginLeft: 6 }}>
            Cancel
          </button>
          {settleMsg && <div style={{ color: "green", marginTop: 5 }}>{settleMsg}</div>}
        </form>
      )}

      {/* ADD EXPENSE BUTTON/FORM */}
      <button onClick={() => setShowForm(f => !f)} style={{ marginBottom: 12 }}>
        {showForm ? "Cancel" : "+ Add Expense"}
      </button>
      {showForm && (
        <form onSubmit={handleAddExpense} style={{ padding: 12, margin: "12px 0", border: "1px solid #ddd", borderRadius: 8 }}>
          <input
            placeholder="Description"
            value={desc}
            required
            onChange={e => setDesc(e.target.value)}
          /><br />
          <input
            placeholder="Amount"
            type="number"
            value={amt}
            required
            step="0.01"
            onChange={e => setAmt(Number(e.target.value))}
          /><br />
          <label>
            <input
              type="radio"
              checked={splitType === "equal"}
              onChange={() => setSplitType("equal")}
            />
            Split equally
          </label>
          <label>
            <input
              type="radio"
              checked={splitType === "custom"}
              onChange={() => setSplitType("custom")}
            />
            Custom split
          </label>

          <br />
          <div>
            <b>Payer: </b>
            <select
              value={payer}
              onChange={e => setPayer(e.target.value)}
              required
              style={{ margin: "0 10px 10px 0" }}
            >
              <option value="">--select--</option>
              {group.members.map(m =>
                <option value={m._id} key={m._id}>
                  {m.name} {user && user._id === m._id ? "(You)" : ""}
                </option>
              )}
            </select>
          </div>
          <div>
            <b>Involved:</b>
            {group.members.map(m =>
              <label key={m._id} style={{ marginRight: 6 }}>
                <input
                  type="checkbox"
                  checked={selected.includes(m._id)}
                  onChange={e => {
                    setSelected(sel => e.target.checked
                      ? [...sel, m._id]
                      : sel.filter(x => x !== m._id));
                  }}
                /> {m.name}
              </label>
            )}
          </div>
          {splitType === "custom" && (
            <div>
              {selected.map(uid =>
                <div key={uid}>
                  {group.members.find(m => m._id === uid)?.name}: $
                  <input
                    style={{ width: 60 }}
                    type="number"
                    step="0.01"
                    value={customSplit[uid] || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomSplit(cs => ({ ...cs, [uid]: Number(val) }));
                    }}
                    required
                  />
                </div>
              )}
              <div style={{ fontSize: "88%", color: splitValidation ? "red" : "#222", marginTop: 4 }}>
                {splitValidation || ""}
              </div>
            </div>
          )}
          <br />
          <button type="submit" disabled={loadingAdd || !!splitValidation || payer === ""}>
            {loadingAdd ? "Adding..." : "Save Expense"}
          </button>
        </form>
      )}

      <div style={{ margin: "16px 0" }}>
        <button
          onClick={() => setTab("transactions")}
          style={{
            fontWeight: tab === "transactions" ? 700 : 400,
            background: tab === "transactions" ? "#eef" : "#fff",
            border: "1px solid #99c"
          }}
        >
          Transactions
        </button>
        <button
          onClick={() => setTab("settlements")}
          style={{
            fontWeight: tab === "settlements" ? 700 : 400,
            marginLeft: 12,
            background: tab === "settlements" ? "#eef" : "#fff",
            border: "1px solid #99c"
          }}
        >
          Settlements
        </button>
      </div>

      {tab === "transactions" ? (
        <>
          <h4 style={{ margin: "16px 0 5px 0" }}>Transactions:</h4>
          {expenses.length === 0
            ? <p>No expenses yet.</p>
            : (
              <ul>
                {expenses.map(exp =>
                  <li key={exp._id} style={{ marginBottom: 8, padding: 8, border: "1px solid #eee" }}>
                    <div>
                      <b>{exp.description}</b> - <span>${exp.amount.toFixed(2)}</span>
                      <span style={{ color: exp.approved ? "green" : "orange", marginLeft: 8 }}>
                        {(exp as any).rejected ? "❌ rejected" : (exp).approved ? "✅ approved" : "⏳ pending"}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: "#555" }}>
                      Payer: <b>{group.members.find(u => u._id === exp.payer)?.name || "??"}</b>
                      <span>, Involved:&nbsp;
                        {exp.involved.map((id: string) =>
                          group.members.find(u => u._id === id)?.name || "??"
                        ).join(", ")}
                      </span>
                      <span>
                        &nbsp;({new Date(exp.createdAt).toLocaleString()})
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: "#666" }}>
                      Split:&nbsp;
                      {Object.entries(exp.split).map(
                        ([uid, amt]) =>
                          <span key={uid}>
                            {group.members.find(x => x._id === uid)?.name}: ${amt};{" "}
                          </span>
                      )}
                    </div>
                  </li>
                )}
              </ul>
            )
          }
        </>
      ) : (
        <>
          <h4 style={{ margin: "16px 0 5px 0" }}>Settlements:</h4>
          {expenses
            .flatMap(expense => (expense.settlements || []).map((settle: any) => ({
              ...settle,
              expenseDesc: expense.description,
              expenseId: expense._id
            }))).length === 0
            ? <p>No settlements yet.</p>
            : (
              <ul>
                {expenses
                  .flatMap(expense => (expense.settlements || []).map((settle: any) => ({
                    ...settle,
                    expenseDesc: expense.description,
                    expenseId: expense._id
                  })))
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((settle: any, idx: number) => {
                    const fromUser = group.members.find(m => m._id === (settle.from?._id || settle.from));
                    const toUser = group.members.find(m => m._id === (settle.to?._id || settle.to));
                    let status = "⏳ pending", color = "#fa0";
                    if (settle.approved === true) { status = "✔️ approved"; color = "green"; }
                    if (settle.approved === false && settle.rejected) { status = "❌ rejected"; color = "red"; }
                    // Optional: add 'rejected' boolean if/when you handle rejected.
                    return (
                      <li key={idx} style={{ marginBottom: 8, padding: 8, border: "1px solid #eee" }}>
                        <div>
                          <b>{fromUser?.name || "??"}</b> → <b>{toUser?.name || "??"}</b>
                          &nbsp;
                          <span>${settle.amount.toFixed(2)}</span>
                          <span style={{ color, marginLeft: 8 }}>{status}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#555" }}>
                          For: <em>{settle.expenseDesc}</em>
                          &nbsp;({new Date(settle.createdAt).toLocaleString()})
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )
          }
        </>
      )}


    </div>
  );
}

export default GroupPage;