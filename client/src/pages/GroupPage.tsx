import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";

type User = { _id: string; name: string; email: string };
type Group = {
  _id: string;
  name: string;
  members: User[];
};

function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const { user } = useAuth();

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
      {/* We'll show expenses, add expense form, and aggregate soon */}
    </div>
  );
}

export default GroupPage;