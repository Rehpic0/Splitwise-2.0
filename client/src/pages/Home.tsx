import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Alert,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";

type Group = {
  _id: string;
  name: string;
  members: string[]; // user IDs
};

function Home() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const nav = useNavigate();

  useEffect(() => {
    async function fetchPending() {
      setLoadingPending(true);
      try {
        const res = await axios.get("/expenses/pending");
        setPending(
          res.data.requests.filter(
            (req: { approvedBy: string[] }) =>
              !req.approvedBy.includes(user!._id!)
          )
        );
      } catch (e) {}
      setLoadingPending(false);
    }
    fetchPending();
  }, [user]);

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
    setCreateError(null);
    try {
      const res = await axios.post("/groups", { name: groupName, memberIds: [] });
      setGroups([res.data.group, ...groups]);
      setGroupName("");
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || "Could not create group");
    }
  }

  function handleLogout() {
    logout();
    nav("/login");
  }

  // --- Dialog modal for add group ---
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Box
      sx={{
        background: "#f4f6f8",
        minHeight: "100vh",
        py: 4,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={5} sx={{ borderRadius: 4, p: 4, mt: 3 }}>
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h4" sx={{ color: "#229e69", fontWeight: 700 }}>
              Home
            </Typography>
            <IconButton size="large" title="Logout" onClick={handleLogout} color="secondary">
              <LogoutIcon />
            </IconButton>
          </Box>
          <Typography variant="h6" sx={{ color: "#555", mb: 2 }}>
            Hi, <b>{user?.name || user?.email}</b>!
          </Typography>

          {/* Pending approvals */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: "#fffbe5",
              border: "1px solid #ffe5a0",
              mb: 3,
              p: 2,
              borderRadius: 2,
            }}
          >
            <Typography color="primary" fontWeight={600}>
              Pending Requests
            </Typography>
            {loadingPending && (
              <Box sx={{ my: 2, textAlign: "center" }}>
                <CircularProgress size={22} />
              </Box>
            )}
            {pending.length === 0 && !loadingPending && (
              <Typography sx={{ mt: 2, color: "#999" }}>No pending requests.</Typography>
            )}
            <List>
              {pending.map((req) => (
                <ListItem key={req._id} disablePadding alignItems="flex-start" sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant="body2">
                      {req.type === "EXPENSE" &&
                        <>Expense <b>{req.expense?.description}</b> (${req.expense?.amount}) by <b>{req.sender?.name || req.senderName || "Unknown"}</b>.<br />Approve/Reject:</>
                      }
                      {req.type === "SETTLE" &&
                        <>Settle request of <b>${req.meta?.amount}</b> by <b>{req.sender?.name || "?"}</b> for <b>{req.expense?.description || "expense"}</b>.<br />Approve/Reject:</>
                      }
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        sx={{ mr: 1, minWidth: 88, borderRadius: 2 }}
                        onClick={async () => {
                          if (req.type === "EXPENSE") {
                            await axios.post(`/expenses/approve/${req._id}`, { accept: true });
                          } else {
                            await axios.post(`/expenses/settle/approve/${req._id}`, { accept: true });
                          }
                          setPending((p) => p.filter((r) => r._id !== req._id));
                        }}
                      >Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        sx={{ minWidth: 88, borderRadius: 2 }}
                        onClick={async () => {
                          if (req.type === "EXPENSE") {
                            await axios.post(`/expenses/approve/${req._id}`, { accept: false });
                          } else {
                            await axios.post(`/expenses/settle/approve/${req._id}`, { accept: false });
                          }
                          setPending((p) => p.filter((r) => r._id !== req._id));
                        }}
                      >Reject
                      </Button>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Groups header/menu */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#229e69" }}>
              Your Groups
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              color="primary"
              sx={{ borderRadius: 3, fontWeight: 600, bgcolor: "#229e69" }}
              onClick={() => setDialogOpen(true)}
            >Create Group
            </Button>
          </Box>

          {/* Add Group Modal */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogContent>
              <form onSubmit={createGroup} id="add-group-form">
                <TextField
                  label="Group name"
                  value={groupName}
                  required
                  fullWidth
                  margin="normal"
                  onChange={e => setGroupName(e.target.value)}
                />
                {createError && <Alert severity="error">{createError}</Alert>}
              </form>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)} color="secondary">Cancel</Button>
              <Button
                type="submit"
                form="add-group-form"
                variant="contained"
                color="success"
                sx={{ bgcolor: "#229e69" }}
              >Create</Button>
            </DialogActions>
          </Dialog>

          {/* Group list */}
          {loading ? (
            <Box sx={{ mt: 4, textAlign: "center" }}>
              <CircularProgress size={30} />
            </Box>
          ) : (
            <List sx={{ mt: 2 }}>
              {groups.length === 0 && (
                <Typography sx={{ ml: 2, color: "#888" }}>No groups yet.</Typography>
              )}
              {groups.map(group => (
                <React.Fragment key={group._id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      component={Link}
                      to={`/group/${group._id}`}
                      sx={{ borderRadius: 2, px: 2, py: 1, "&:hover": { bgcolor: "#e7f7ed" } }}
                    >
                      <ListItemText
                                                primary={
                          <span style={{ fontWeight: 600, color: "#229e69" }}>
                            {group.name}
                          </span>
                        }
                        secondary={
                          <span style={{ color: "#666", fontSize: "0.9em" }}>
                            {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                          </span>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default Home;