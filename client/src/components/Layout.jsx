import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, BookOpen, Bookmark, Users, ClipboardList, LibraryBig, LogOut, LineChart, Library, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { cn } from "../lib/utils.js";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === "BIBLIOTHECAIRE" || user?.role === "ADMINISTRATEUR";

  const studentNav = [
    { to: "/catalogue", label: "Catalogue", icon: LayoutGrid },
    { to: "/mes-emprunts", label: "Mes emprunts", icon: BookOpen },
    { to: "/reservations", label: "Réservations", icon: Bookmark },
  ];
  const staffNav = [
    { to: "/catalogue", label: "Catalogue", icon: LayoutGrid },
    { to: "/admin/catalogue", label: "Gestion catalogue", icon: Library },
    { to: "/admin/prets", label: "Prêts & retours", icon: ClipboardList },
    { to: "/admin/adherents", label: "Adhérents", icon: Users },
    { to: "/admin/stats", label: "Statistiques", icon: LineChart },
    { to: "/admin/notifications", label: "Notifications", icon: Mail },
  ];
  const nav = isStaff ? staffNav : studentNav;

  const handleLogout = () => {
    logout();
    navigate("/connexion");
  };

  return (
    <div className="flex min-h-screen bg-paper font-sans">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border p-4">
        <div className="mb-6 flex items-center gap-2 px-1">
          <LibraryBig className="h-5 w-5 text-ink" />
          <span className="font-display text-lg font-semibold text-ink">Ex Libris</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                  isActive ? "bg-ink text-paper" : "text-ink-muted hover:bg-[#EFE9D8]"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-border pt-4">
          <p className="px-1 text-sm font-medium text-ink">{user?.prenom} {user?.nom}</p>
          <p className="px-1 text-xs text-ink-faint">{user?.role === "ADHERENT" ? "Adhérent" : user?.role === "BIBLIOTHECAIRE" ? "Bibliothécaire" : "Administrateur"}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-[#EFE9D8]"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
