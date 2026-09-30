import React from "react";
import { Link } from "react-router-dom";
import { LifeBuoy, Inbox, Users, BookOpen, BarChart3, ShieldCheck } from "lucide-react";

export default function App() {
  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <LifeBuoy className="w-6 h-6 text-indigo-400" />
          <div>
            <h1 className="font-bold text-lg leading-none">TicketHelper</h1>
            <span className="text-xs text-slate-400">AI Student Support</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-slate-800 text-white hover:bg-slate-700"
          >
            <Inbox className="w-4 h-4 text-indigo-400" />
            Tickets
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Dashboard
          </Link>
          <Link
            to="/knowledge-base"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Knowledge Base
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Users className="w-4 h-4 text-indigo-400" />
            User Management
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Admin Connected
          </span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Ticket Workspace</h2>
            <p className="text-sm text-slate-500">AI-assisted ticket classification and suggested responses</p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              Bun + Express Backend Active
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Tickets</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">0</p>
            <p className="text-xs text-slate-500 mt-1">Ready for classification & triage</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resolved Today</span>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">0</p>
            <p className="text-xs text-slate-500 mt-1">Average response time: --</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Refund Requests</span>
            <p className="text-3xl font-extrabold text-amber-600 mt-2">0</p>
            <p className="text-xs text-slate-500 mt-1">Requires human review</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 text-center text-slate-500">
          <p className="text-base font-medium">Ready to start Phase 2: Database Sessions & Authentication</p>
          <p className="text-sm text-slate-400 mt-1">Express backend & React client initialized with Bun.</p>
        </div>
      </main>
    </div>
  );
}
