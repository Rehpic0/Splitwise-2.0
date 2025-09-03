import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";

import {
  Box,
  Paper,
  Button,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  List,
  Chip,
  Tabs,
  Tab,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

type User = { _id: string; name: string; email: string; };
type Group = { _id: string; name: string; members: User[]; };
type AggregationSummary = { currentUserSummary: { totalOwe: number; totalOwed: number; perUser: Record<string, number>; }, debts: Array<{ from: string; to: string; amount: number; }>; };
type Expense = { _id: string; description: string; amount: number; payer: string; involved: string[]; approved: boolean; split: Record<string, number>; createdAt: string; settlements?: Settlement[]; };
type Settlement = { from: string; to: string; amount: number; approved: boolean; rejected?: boolean; createdAt: string; expenseDesc: string; expenseId: string; };

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"transactions" | "settlements">("transactions");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [agg, setAgg] = useState<AggregationSummary | null>(null);

  // Expense form
  const [openExpense, setOpenExpense] = useState(false);
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState<number>(0);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [selected, setSelected] = useState<string[]>(user ? [user._id] : []);
  const [customSplit, setCustomSplit] = useState<Record<string, number>>({});
  const [payer, setPayer] = useState(user ? user._id : "");
  const [splitValidation, setSplitValidation] = useState<string | null>(null);
  const [loadingAdd, setLoadingAdd] = useState(false);

  // Invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<null | string>(null);
  const [inviteError, setInviteError] = useState<null | string>(null);
  const [inviting, setInviting] = useState(false);

  // Settle up
  const [showSettle, setShowSettle] = useState(false);
  const [settleToUser, setSettleToUser] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settling, setSettling] = useState(false);
  const [settleMsg, setSettleMsg] = useState<string | null>(null);

  function resetForm() {
    setDesc(""); setAmt(0); setSplitType("equal"); setSelected(user ? [user._id] : []); setCustomSplit({});
  }

  const reloadExpenses = async () => {
    const exp = await axios.get("/expenses", { params: { groupId: id } });
    setExpenses(exp.data.expenses);
    const summary = await axios.get(`/aggregation/group/${id}`);
    setAgg(summary.data);
  };

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
      if (Math.abs(sum - amt) > 0.01) {
        setSplitValidation(`Custom split must total $${amt.toFixed(2)}, but it's $${sum.toFixed(2)}.`);
      } else {
        setSplitValidation(null);
      }
    } else {
      setSplitValidation(null);
    }
  }, [customSplit, amt, selected, splitType]);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      const exp = await axios.get("/expenses", { params: { groupId: id } });
      setExpenses(exp.data.expenses);
      const summary = await axios.get(`/aggregation/group/${id}`);
      setAgg(summary.data);
    }
    fetchData();
    // eslint-disable-next-line
  }, [id, openExpense]);

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (splitValidation) return;
    if (!payer) return;
    setLoadingAdd(true);
    let split: Record<string, number> = {};
    if (splitType === "equal" && selected.length > 0) {
      const per = amt / selected.length;
      selected.forEach(uid => split[uid] = Number(per.toFixed(2)));
    } else {
      split = { ...customSplit };
    }
    await axios.post("/expenses", {
      group: id,
      description: desc,
      amount: amt,
      payer,
      involved: selected,
      split
    });
    setLoadingAdd(false); setOpenExpense(false); resetForm();
    reloadExpenses();
  }

  if (loading || !group) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress size={38} />
      </Box>
    );
  }

  // --- UI START ---
  return (
    <Box sx={{
      background: "#f4f6f8",
      minHeight: "100vh",
      py: 5
    }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 4, maxWidth: 720, mx: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar sx={{ bgcolor: "#229e69", mr: 2 }}>
            <GroupIcon />
          </Avatar>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#229e69" }}>{group.name}</Typography>
          <Box flexGrow={1} />
          <Button variant="text" size="small" component={Link} to="/home" sx={{ color: "#666", fontWeight: 600 }}>
            &larr; Back
          </Button>
        </Box>
        <Divider sx={{ mb: 1 }} />
        {/* Members */}
        <Box sx={{ mb: 2 }}>
          <Typography fontWeight={600} color="secondary" mb={1} variant="subtitle1">Members:</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {group.members.map(m => (
              <Chip key={m._id}
                label={user && user._id === m._id ? `${m.name} (You)` : m.name}
                color={user && user._id === m._id ? "success" : "default"}
                sx={{ px: 2, py: 0.5, fontWeight: 600, bgcolor: "#e0f7ef", color: "#229e69" }}
              />
            ))}
          </Box>
        </Box>
        {/* Invite member */}
        <Box sx={{ mb: 3 }}>
          <form
            style={{ display: "flex", maxWidth: 350 }}
            onSubmit={async e => {
              e.preventDefault();
              setInviting(true); setInviteStatus(null); setInviteError(null);
              try {
                const res = await axios.post(`/groups/${group._id}/invite-member`, { email: inviteEmail });
                setInviteStatus(`Added: ${res.data.addedUser.name || res.data.addedUser.email}`);
                setInviteEmail("");
                const g = await axios.get(`/groups/${group._id}`);
                setGroup(g.data.group);
              } catch (err: any) {
                setInviteError(err?.response?.data?.error || "Unknown error");
              } finally {
                setInviting(false);
              }
            }}>
            <TextField
              type="email"
              label="Invite email"
                            variant="outlined"
              size="small"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              disabled={inviting}
              sx={{ mr: 1, flex: 1 }}
            />
            <Button
              variant="contained"
              color="primary"
              disabled={inviting || !inviteEmail}
              type="submit"
              sx={{ bgcolor: "#229e69", textTransform: "none", fontWeight: 600 }}
            >
              Invite
            </Button>
          </form>
          {inviteStatus && (
            <Alert severity="success" sx={{ mt: 1 }}>{inviteStatus}</Alert>
          )}
          {inviteError && (
            <Alert severity="error" sx={{ mt: 1 }}>{inviteError}</Alert>
          )}
        </Box>

        {/* Aggregate info */}
        {agg && (
          <Paper elevation={0} sx={{ bgcolor: "#f5ffe1", p: 2, mb: 2, border: "1px solid #e7eeb3" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#229e69" }}>
              Your balances in this group:
            </Typography>
            <Box sx={{ color: "#444", fontWeight: 500, mb: 1 }}>
              {agg.currentUserSummary.totalOwe > 0 && (
                <>You owe <b style={{ color: "#cc4433" }}>${agg.currentUserSummary.totalOwe.toFixed(2)}</b>&nbsp;</>
              )}
              {agg.currentUserSummary.totalOwed > 0 && (
                <>You are owed <b style={{ color: "#229e69" }}>${agg.currentUserSummary.totalOwed.toFixed(2)}</b>&nbsp;</>
              )}
            </Box>
            {Object.keys(agg.currentUserSummary.perUser).length > 0 && (
              <Box component="ul" sx={{ mx: 0, pl: 2 }}>
                {Object.entries(agg.currentUserSummary.perUser).map(([userId, amount]) =>
                  <li key={userId} style={{ marginBottom: 2 }}>
                    {group.members.find(m => m._id === userId)?.name || "(unknown)"}:{" "}
                    {amount > 0 && <span style={{ color: "#cc4433" }}>You owe <b>${amount.toFixed(2)}</b></span>}
                    {amount < 0 && <span style={{ color: "#229e69" }}>Owes you <b>${(-amount).toFixed(2)}</b></span>}
                  </li>
                )}
              </Box>
            )}
          </Paper>
        )}

        {/* Settle up quick actions */}
        {agg && agg.debts
          .filter((d: any) => d.from === user?._id && d.amount > 0)
          .map((debt: any) => {
            const toUser = group.members.find(m => m._id === debt.to);
            return (
              <Box key={debt.to} sx={{ my: 1 }}>
                <Typography variant="body2">
                  You owe <b>${debt.amount.toFixed(2)}</b> to <b>{toUser?.name || debt.to}</b>
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    sx={{ ml: 2, borderRadius: 2, fontWeight: 600, textTransform: "none" }}
                    onClick={() => {
                      setSettleToUser(debt.to);
                      setSettleAmount(debt.amount);
                      setShowSettle(true);
                    }}
                  >
                    Settle up
                  </Button>
                </Typography>
              </Box>
            );
          })
        }

        {/* Settle up dialog */}
        <Dialog open={showSettle} onClose={() => setShowSettle(false)}>
          <DialogTitle>Settle Up</DialogTitle>
          <DialogContent>
            <form
              onSubmit={async e => {
                e.preventDefault();
                setSettling(true);
                setSettleMsg(null);
                try {
                  // Find any expense between you and this user
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
                  setSettleMsg("Settle request sent! Wait for approval.");
                  setShowSettle(false);
                  reloadExpenses();
                } catch (err: any) {
                  setSettleMsg(err?.response?.data?.error || "Error sending settle request.");
                } finally {
                  setSettling(false);
                }
              }}
              id="settle-form"
            >
              <TextField
                label="Amount"
                type="number"
                value={settleAmount}
                // @ts-ignore
                step="0.01"
                min={0}
                fullWidth
                sx={{ mb: 2, mt: 1 }}
                onChange={e => setSettleAmount(Number(e.target.value))}
                required
              />
              <Typography variant="body2" sx={{ mb: 1 }}>
                To: <b>{group.members.find(m => m._id === settleToUser)?.name || ""}</b>
              </Typography>
              {settleMsg && <Alert severity="info">{settleMsg}</Alert>}
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSettle(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="success"
              type="submit"
              form="settle-form"
              disabled={settling}
            >
              Send Request
            </Button>
          </DialogActions>
        </Dialog>

        {/* Tab bar */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ my: 3 }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="transactions" label="Transactions" />
          <Tab value="settlements" label="Settlements" />
          <Tab
            icon={<AddCircleOutlineIcon />}
            sx={{ ml: "auto", minWidth: 0 }}
            onClick={() => setOpenExpense(true)}
            aria-label="Add Expense"
          />
        </Tabs>

        {/* ADD EXPENSE DIALOG */}
        <Dialog open={openExpense} onClose={() => setOpenExpense(false)}>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogContent>
            <form onSubmit={handleAddExpense} id="add-expense-form">
              <TextField
                fullWidth
                label="Description"
                value={desc}
                required
                margin="normal"
                onChange={e => setDesc(e.target.value)}
              />
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={amt}
                required
                // @ts-ignore
                step="0.01"
                margin="normal"
                onChange={e => setAmt(Number(e.target.value))}
              />
              {/* Split type */}
              <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
                <InputLabel>Split</InputLabel>
                <Select
                  value={splitType}
                  label="Split Type"
                  onChange={e => setSplitType(e.target.value as any)}
                >
                  <MenuItem value="equal">Split equally</MenuItem>
                  <MenuItem value="custom">Custom split</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Payer</InputLabel>
                <Select
                  value={payer}
                  label="Payer"
                  required
                  onChange={e => setPayer(e.target.value)}
                >
                  <MenuItem value="">--select--</MenuItem>
                  {group.members.map(m => (
                    <MenuItem key={m._id} value={m._id}>{m.name} {user && user._id === m._id ? "(You)" : ""}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ mt: 1, mb: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Involved:</Typography>
                {group.members.map(m =>
                  <Chip
                    key={m._id}
                    label={m.name}
                    clickable
                    color={selected.includes(m._id) ? "primary" : "default"}
                    onClick={() =>
                      setSelected(sel =>
                        sel.includes(m._id)
                          ? sel.filter(x => x !== m._id)
                          : [...sel, m._id]
                      )
                    }
                    sx={{ mr: 1, mb: 1 }}
                  />
                )}
              </Box>
              {splitType === "custom" &&
                <Box>
                  {selected.map(uid =>
                    <TextField
                      key={uid}
                      label={`${group.members.find(m => m._id === uid)?.name}`}
                      type="number"
                      size="small"
                      variant="outlined"
                      sx={{ width: 120, mr: 1, mb: 1 }}
                      value={customSplit[uid] || ""}
                                            onChange={e =>
                        setCustomSplit(cs => ({ ...cs, [uid]: Number(e.target.value) }))
                      }
                      required
                    />
                  )}
                  <Typography
                    sx={{ fontSize: "88%", color: splitValidation ? "red" : "#555", mt: 1 }}
                  >
                    {splitValidation || ""}
                  </Typography>
                </Box>
              }
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenExpense(false)} color="secondary">
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-expense-form"
              variant="contained"
              color="primary"
              disabled={loadingAdd || !!splitValidation || payer === ""}
              sx={{ fontWeight: 600, bgcolor: "#229e69" }}
            >
              {loadingAdd ? "Adding..." : "Save Expense"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* TAB PANELS */}
        {tab === "transactions" ? (
          <>
            {expenses.length === 0
              ? <Typography sx={{ color: "#888", mt: 2 }}>No expenses yet.</Typography>
              : (
                <List>
                  {expenses.map(exp =>
                    <Paper key={exp._id} elevation={0} sx={{ mb: 2, p: 2, border: "1px solid #e0e0e0" }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 18 }}>{exp.description}</Typography>
                        <Box flexGrow={1} />
                        <Typography color="primary" fontWeight={600}>
                          ${exp.amount.toFixed(2)}
                        </Typography>
                        <Chip
                          label={
                            (exp as any).rejected
                              ? "❌ rejected"
                              : (exp).approved
                                ? "✅ approved"
                                : "⏳ pending"
                          }
                          size="small"
                          sx={{
                            ml: 2,
                            bgcolor: exp.approved
                              ? "#d1f7dd"
                              : (exp as any).rejected
                                ? "#ffd7d7"
                                : "#fff7d1",
                            color: exp.approved
                              ? "#229e69"
                              : (exp as any).rejected
                                ? "#cc4433"
                                : "#e29200",
                            fontWeight: 500
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: 14, color: "#666" }}>
                        Payer: <b>{group.members.find(u => u._id === exp.payer)?.name || "??"}</b>
                        , Involved: {exp.involved.map((id: string) =>
                          group.members.find(u => u._id === id)?.name || "??"
                        ).join(", ")}
                        <span> ({new Date(exp.createdAt).toLocaleString()})</span>
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: "#888" }}>
                        Split:&nbsp;
                        {Object.entries(exp.split).map(
                          ([uid, amt]) =>
                            <span key={uid}>
                              {group.members.find(x => x._id === uid)?.name}: ${amt}&nbsp;
                            </span>
                        )}
                      </Typography>
                    </Paper>
                  )}
                </List>
              )
            }
          </>
        ) : (
          <>
            {expenses
              .flatMap(expense =>
                (expense.settlements || []).map((settle: any) => ({
                  ...settle,
                  expenseDesc: expense.description,
                  expenseId: expense._id
                }))
              ).length === 0
              ? <Typography sx={{ color: "#888", mt: 2 }}>No settlements yet.</Typography>
              : (
                <List>
                  {expenses
                    .flatMap(expense =>
                      (expense.settlements || []).map((settle: any) => ({
                        ...settle,
                        expenseDesc: expense.description,
                        expenseId: expense._id
                      }))
                    )
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((settle: any, idx: number) => {
                      const fromUser = group.members.find(m => m._id === (settle.from?._id || settle.from));
                      const toUser = group.members.find(m => m._id === (settle.to?._id || settle.to));
                      let status = "⏳ pending", color = "#e29200";
                      if (settle.approved === true) { status = "✅ approved"; color = "#229e69"; }
                      if (settle.approved === false && settle.rejected) { status = "❌ rejected"; color = "#cc4433"; }
                      return (
                        <Paper key={idx} elevation={0} sx={{ mb: 2, p: 2, border: "1px solid #e0e0e0" }}>
                          <Typography>
                            <b>{fromUser?.name || "??"}</b> → <b>{toUser?.name || "??"}</b>
                            &nbsp;${settle.amount.toFixed(2)}
                            <Chip
                              label={status}
                              size="small"
                              sx={{
                                ml: 2,
                                bgcolor: color === "#229e69" ? "#d1f7dd" : color === "#cc4433" ? "#ffd7d7" : "#fff7d1",
                                color: color,
                                fontWeight: 500
                              }}
                            />
                          </Typography>
                          <Typography sx={{ fontSize: 13, color: "#666" }}>
                            For: <em>{settle.expenseDesc}</em> ({new Date(settle.createdAt).toLocaleString()})
                          </Typography>
                        </Paper>
                      );
                    })}
                </List>
              )
            }
          </>
        )}
      </Paper>
    </Box>
  );
}