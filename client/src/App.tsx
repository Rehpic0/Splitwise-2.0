import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Home from "./pages/Home";
import GroupPage from "./pages/GroupPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home" element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          } />
          <Route path="/group/:id" element={
            <RequireAuth>
              <GroupPage />
            </RequireAuth>
          } />
          <Route path="/" element={<Navigate to="/home" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;