import React, { useState } from "react";
import {
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Sparkles,
  ArrowUpRight,
  MessageSquare,
  Bot,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import { useSession } from "../lib/auth-client";

// Domain sample tickets reflecting the 3 categories and statuses
const SAMPLE_TICKETS = [
  {
    id: "TCK-1042",
    student: "Alex Rivera",
    email: "alex.r@university.edu",
    subject: "Cannot access Week 3 cloud lab environment",
    category: "technical questions",
    status: "open",
    priority: "high",
    hasAiDraft: true,
    timeAgo: "12m ago",
  },
  {
    id: "TCK-1041",
    student: "Samantha Chen",
    email: "schen@college.edu",
    subject: "Requesting refund for Python Bootcamp enrollment",
    category: "refund request",
    status: "open",
    priority: "urgent",
    hasAiDraft: true,
    timeAgo: "34m ago",
  },
  {
    id: "TCK-1040",
    student: "Marcus Brody",
    email: "m.brody@student.org",
    subject: "When does enrollment for Spring semester open?",
    category: "general questions",
    status: "resolved",
    priority: "low",
    hasAiDraft: false,
    timeAgo: "2h ago",
  },
  {
    id: "TCK-1039",
    student: "Elena Rostova",
    email: "erostova@tech.edu",
    subject: "IDE compiler error in Assignment 2 submission",
    category: "technical questions",
    status: "closed",
    priority: "medium",
    hasAiDraft: false,
    timeAgo: "5h ago",
  },
];

export default function HomePage() {
  const { data: session } = useSession();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTickets = SAMPLE_TICKETS.filter((ticket) => {
    const matchesCategory =
      filterCategory === "all" || ticket.category === filterCategory;
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "technical questions":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "refund request":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "general questions":
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "resolved":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "closed":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Workspace Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Support Queue & Triage
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review incoming student requests and AI-generated response drafts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-xs font-semibold">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>AI Draft Assistant Active</span>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Open Tickets
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">2</span>
            <span className="text-xs text-emerald-600 font-medium">+2 today</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Awaiting review & response</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Resolved Today
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">1</span>
            <span className="text-xs text-slate-500 font-medium">85% satisfaction</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Sent with agent approval</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Refund Requests
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">1</span>
            <span className="text-xs text-amber-700 font-medium">Human review only</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Single category: refund request</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Avg First Response
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">4.2m</span>
            <span className="text-xs text-emerald-600 font-medium">AI accelerated</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Target SLA: &lt; 15 mins</p>
        </div>
      </div>

      {/* Queue Section & Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Table Filters & Search Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket ID, student name, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-500">Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="general questions">General Questions</option>
              <option value="technical questions">Technical Questions</option>
              <option value="refund request">Refund Requests</option>
            </select>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">AI Draft</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-600 font-semibold">{ticket.id}</span>
                      <span className="text-slate-800 line-clamp-1 max-w-xs">
                        {ticket.subject}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-900 font-medium">{ticket.student}</div>
                    <div className="text-xs text-slate-400">{ticket.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${getCategoryBadge(
                        ticket.category
                      )}`}
                    >
                      {ticket.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md border ${getStatusBadge(
                        ticket.status
                      )}`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {ticket.hasAiDraft ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        Draft Ready
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all">
                      <span>Review</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No tickets found matching your search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
