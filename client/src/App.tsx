import React from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LifeBuoy,
  Inbox,
  Users,
  ShieldCheck,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import Login from "@/pages/Login";
import UsersPage from "@/pages/UsersPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTickets } from "@/hooks/useTickets";
import TicketListTable from "@/components/TicketListTable";

function WorkspaceDashboard() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Support User";
  const { data: ticketsData } = useTickets();

  const counts = ticketsData?.counts || { total: 0, open: 0, in_progress: 0, resolved: 0, ai_resolved: 0 };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Support Ticket Inbox</h2>
          <p className="text-xs text-slate-500 mt-1">
            Inbound emails received at support addresses are automatically converted to actionable tickets
          </p>
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
            Welcome back, {userName}!
          </span>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Ingested
          </span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{counts.total}</p>
          <p className="text-xs text-slate-500 mt-1">All email tickets</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-xs bg-gradient-to-br from-white to-blue-50/30">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Open Tickets
          </span>
          <p className="text-2xl font-extrabold text-blue-700 mt-2">{counts.open}</p>
          <p className="text-xs text-blue-600/80 mt-1">Awaiting triage & review</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs bg-gradient-to-br from-white to-amber-50/30">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            In Progress
          </span>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">{counts.in_progress}</p>
          <p className="text-xs text-amber-600/80 mt-1">Under investigation</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs bg-gradient-to-br from-white to-emerald-50/30">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Resolved
          </span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{counts.resolved}</p>
          <p className="text-xs text-emerald-600/80 mt-1">Completed issues</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-purple-200 shadow-xs bg-gradient-to-br from-white to-purple-50/30">
          <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            AI Auto-Resolved
          </span>
          <p className="text-2xl font-extrabold text-purple-700 mt-2">{counts.ai_resolved || 0}</p>
          <p className="text-xs text-purple-600/80 mt-1">Answered via KB</p>
        </div>
      </div>

      {/* Tickets List Table with Inbound Simulation */}
      <TicketListTable />
    </div>
  );
}

function WorkspaceLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error("Sign-out error:", err);
      navigate("/login");
    }
  };

  const userName = session?.user?.name || "Support User";
  const userEmail = session?.user?.email || "";
  const userRole = ((session?.user as any)?.role || "agent") as "admin" | "agent";

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="p-4 border-b border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none">TicketHelperStudent</h1>
              <span className="text-xs text-slate-400">AI Student Support</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <Link
              to="/"
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === "/"
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Inbox className="w-4 h-4 text-indigo-400" />
              Tickets
            </Link>

            {userRole === "admin" && (
              <Link
                to="/users"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                User Management
              </Link>
            )}
          </nav>
        </div>

        {/* Sidebar Footer / Session Status */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Database Sessions Active</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Ticket Workspace</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                userRole === "admin"
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              {userRole.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-sm font-medium text-slate-900 leading-none">
                {userName}
              </span>
              <span className="text-xs text-slate-500">{userEmail}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-auto bg-slate-50">
          <WorkspaceDashboard />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
