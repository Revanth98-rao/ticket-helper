import React from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import {
  LifeBuoy,
  Inbox,
  Users,
  BookOpen,
  BarChart3,
  ShieldCheck,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useSession, signOut } from "./lib/auth-client";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

function WorkspaceLayout() {
  const navigate = useNavigate();
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
  const userRole = (session?.user as any)?.role || "agent";

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="p-4 border-b border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none">TicketHelper</h1>
              <span className="text-xs text-slate-400">AI Student Support</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            >
              <Inbox className="w-4 h-4 text-indigo-400" />
              Tickets
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Dashboard
            </Link>
            <Link
              to="/knowledge-base"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Knowledge Base
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              User Management
            </Link>
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
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Ticket Workspace
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Express + Bun Active
            </span>
          </div>

          {/* User profile & Sign out */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
              <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 leading-none">
                    {userName}
                  </span>
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded tracking-wider ${
                      userRole === "admin"
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {userRole}
                  </span>
                </div>
                <span className="text-xs text-slate-500 leading-tight">
                  {userEmail}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-all"
              title="Sign out of your session"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-auto p-8">
          <div className="mb-6">
            <p className="text-sm text-slate-500">
              AI-assisted ticket classification and suggested responses
            </p>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Open Tickets
              </span>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">0</p>
              <p className="text-xs text-slate-500 mt-1">
                Ready for classification & triage
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Resolved Today
              </span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-2">0</p>
              <p className="text-xs text-slate-500 mt-1">
                Average response time: --
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Refund Requests
              </span>
              <p className="text-3xl font-extrabold text-amber-600 mt-2">0</p>
              <p className="text-xs text-slate-500 mt-1">
                Requires human review
              </p>
            </div>
          </div>

          {/* Status Box */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center text-slate-600">
            <div className="inline-flex p-3 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Welcome back, {userName}!
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Your session is active via Better Auth database sessions. Next
              phase: User Management (Phase 3) & Ticket Ingestion (Phase 4).
            </p>
          </div>
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
