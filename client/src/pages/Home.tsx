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