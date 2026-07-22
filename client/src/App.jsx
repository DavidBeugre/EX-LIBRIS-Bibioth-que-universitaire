import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Catalogue from "./pages/Catalogue.jsx";
import MyLoans from "./pages/MyLoans.jsx";
import Reservations from "./pages/Reservations.jsx";
import AdminLoans from "./pages/AdminLoans.jsx";
import AdminMembers from "./pages/AdminMembers.jsx";
import AdminStats from "./pages/AdminStats.jsx";
import AdminCatalogue from "./pages/AdminCatalogue.jsx";
import AdminNotifications from "./pages/AdminNotifications.jsx";

function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuth();
  if (!token) return <Navigate to="/connexion" replace />;
  if (!user) return <div className="flex min-h-screen items-center justify-center text-sm text-ink-faint">Chargement…</div>;
  if (roles && !roles.includes(user.role)) return <Navigate to="/catalogue" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />
      <Route path="/catalogue" element={<ProtectedRoute><Catalogue /></ProtectedRoute>} />
      <Route path="/mes-emprunts" element={<ProtectedRoute roles={["ADHERENT"]}><MyLoans /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute roles={["ADHERENT"]}><Reservations /></ProtectedRoute>} />
      <Route path="/admin/prets" element={<ProtectedRoute roles={["BIBLIOTHECAIRE", "ADMINISTRATEUR"]}><AdminLoans /></ProtectedRoute>} />
      <Route path="/admin/catalogue" element={<ProtectedRoute roles={["BIBLIOTHECAIRE", "ADMINISTRATEUR"]}><AdminCatalogue /></ProtectedRoute>} />
      <Route path="/admin/adherents" element={<ProtectedRoute roles={["BIBLIOTHECAIRE", "ADMINISTRATEUR"]}><AdminMembers /></ProtectedRoute>} />
      <Route path="/admin/stats" element={<ProtectedRoute roles={["BIBLIOTHECAIRE", "ADMINISTRATEUR"]}><AdminStats /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute roles={["BIBLIOTHECAIRE", "ADMINISTRATEUR"]}><AdminNotifications /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/catalogue" replace />} />
    </Routes>
  );
}
