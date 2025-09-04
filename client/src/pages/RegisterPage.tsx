import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axios";
import { useNavigate, Link } from "react-router-dom";
import {
  Avatar,
  Button,
  TextField,
  Typography,
  Container,
  Box,
  Paper,
  Alert,
} from "@mui/material";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await axios.post("/auth/register", { name, email, password });
      auth.login(res.data.token, res.data.user);
      nav("/home");
    } catch (err: any) {
      setError(err.response?.data?.error || "Register error");
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f4f6f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={4} sx={{ p: 4, borderRadius: 4 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Avatar
              sx={{
                m: 1,
                bgcolor: "primary.main",
                width: 54,
                height: 54,
              }}
            >
              <PersonAddAlt1OutlinedIcon fontSize="large" />
            </Avatar>
            <Typography
              component="h1"
              variant="h5"
              sx={{ color: "#229e69", fontWeight: 700 }}
            >
              Splitwise 2.0 Register
            </Typography>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={onSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              size="medium"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              size="medium"
              type="email"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              size="medium"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 3,
                mb: 2,
                bgcolor: "#229e69",
                fontWeight: 600,
                fontSize: "1.125rem",
                ":hover": { bgcolor: "#1c8658" },
                borderRadius: 3,
                textTransform: "none",
              }}
            >
              Register
            </Button>
            <Typography sx={{ textAlign: "center", color: "#555" }}>
              Already registered? &nbsp;
              <Link
                to="/login"
                style={{ color: "#229e69", textDecoration: "underline" }}
              >
                Login here
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default RegisterPage;