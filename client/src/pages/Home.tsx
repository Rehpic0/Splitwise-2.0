import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axios";
import { Link, useNavigate } from "react-router-dom";

type Group = {
  _id: string;
  name: string;
  members: string[]; // user IDs
};

function Home() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const nav = useNavigate();

  const [pending, setPending] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  useEffect(() => {
    async function fetchPending() {
      setLoadingPending(true);
      try {
        const res = await axios.get("/expenses/pending");
        setPending(res.data.requests.filter((req: { approvedBy: string[] }) => !req.approvedBy.includes(user!._id!)));
      } catch (e) { }
      setLoadingPending(false);
    }
    fetchPending();
  }, []);
  useEffect(() => {
    async function fetchGroups() {
      setLoading(true);
      const res = await axios.get("/user/groups");
      setGroups(res.data.groups);
      setLoading(false);
    }
    fetchGroups();
  }, []);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    const res = await axios.post("/groups", { name: groupName, memberIds: [] });
    setGroups([res.data.group, ...groups]);
    setGroupName(""); setShowForm(false);
  }

  function handleLogout() {
    logout();
    nav("/login");
  }


  return (
    <div style={{ maxWidth: 520, margin: "30px auto", padding: 24, border: "1px solid #eee" }}>
      {/* PENDING APPROVALS */}
      <div style={{ background: "#fffbe5", border: "1px solid #edd", margin: "12px 0", padding: 12 }}>
        <b>Pending Requests for You:</b>
        {loadingPending && <span> Loading...</span>}
        {pending.length === 0 && !loadingPending && <div>No pending requests.</div>}
        <ul style={{ marginTop: 8 }}>
          {pending.map(req => (
            <li key={req._id} style={{ marginBottom: 10 }}>
              {req.type === "EXPENSE" ? (
                <>
                  <span>
                    Expense <b>{req.expense?.description}</b> (${req.expense?.amount}):
                    &nbsp;created by <b>{(() => {
                      return req.senderName ?? "Unknown User";
                    })()}</b>.<br />
                    You need to <b>Approve/Reject</b>.
                  </span>
                  <br />
                  <button style={{ marginRight: 8 }} onClick={async () => {
                    await axios.post(`/expenses/approve/${req._id}`, { accept: true });
                    setPending(p => p.filter(r => r._id !== req._id));
                  }}>Approve</button>
                  <button onClick={async () => {
                    await axios.post(`/expenses/approve/${req._id}`, { accept: false });
                    setPending(p => p.filter(r => r._id !== req._id));
                  }}>Reject</button>
                </>
              ) : req.type === "SETTLE" ? (
                <>
                  <span>
                    Settle up request of <b>${req.meta?.amount}</b> by <b>{req.sender?.name || ""}</b>
                    for expense <b>{req.expense?.description || ""}</b>.<br />
                    Approve if you received this payment.
                  </span>
                  <br />
                  <button style={{ marginRight: 8 }} onClick={async () => {
                    await axios.post(`/expenses/settle/approve/${req._id}`, { accept: true });
                    setPending(p => p.filter(r => r._id !== req._id));
                  }}>Approve</button>
                  <button onClick={async () => {
                    await axios.post(`/expenses/settle/approve/${req._id}`, { accept: false });
                    setPending(p => p.filter(r => r._id !== req._id));
                  }}>Reject</button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2>Your Groups</h2>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <p>Hi, <b>{user?.name || user?.email}</b>!</p>
      {loading ? <div>Loading...</div> :
        <>
          <button onClick={() => setShowForm(f => !f)}>
            {showForm ? "Cancel" : "Create New Group"}
          </button>
          {showForm &&
            <form onSubmit={createGroup} style={{ marginBottom: 16 }}>
              <input value={groupName} onChange={e => setGroupName(e.target.value)}
                placeholder="Group name" required style={{ marginRight: 4 }} />
              <button type="submit">Create</button>
            </form>
          }
          <ul>
            {groups.length === 0 && <li>No groups yet.</li>}
            {groups.map(group =>
              <li key={group._id} style={{ margin: "8px 0" }}>
                <Link to={`/group/${group._id}`} style={{ fontWeight: 600 }}>
                  {group.name}
                </Link>
              </li>
            )}
          </ul>
        </>
      }
    </div>
  );
}

export default Home;