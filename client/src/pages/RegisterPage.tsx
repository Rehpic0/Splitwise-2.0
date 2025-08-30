import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axios";
import { useNavigate, Link } from "react-router-dom";

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
    <div style={{ maxWidth: 360, margin: "100px auto" }}>
      <h2>Register</h2>
      <form onSubmit={onSubmit}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" required />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" required />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" required />
        <button type="submit">Register</button>
        {error && <div style={{ color: "red" }}>{error}</div>}
      </form>
      <p>Already registered? <Link to="/login">Login here</Link></p>
    </div>
  );
}
export default RegisterPage;