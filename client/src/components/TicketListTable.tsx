import React, { useState } from "react";
import {
  Inbox,
  Search,
  Filter,
  Mail,
  ExternalLink,
  RefreshCw,
  Clock,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { useTickets, TicketItem } from "../hooks/useTickets";
import TicketDetailModal from "./TicketDetailModal";
import SimulateEmailModal from "./SimulateEmailModal";

export default function TicketListTable() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);

  const { data, isLoading, error, refetch, isFetching } = useTickets({
    status: statusFilter,
    priority: priorityFilter,
    search: searchTerm,
    sort: sortOrder,
    page,
    limit: pageSize,
  });

  const tickets = data?.tickets || [];
  const counts = data?.counts || { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 };
  const pagination = data?.pagination || { page: 1, limit: pageSize, totalPages: 1, totalItems: 0 };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearchTerm("");
    setSortOrder("newest");
    setPage(1);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Open
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Resolved
          </span>
        );
      case "closed":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            Urgent
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            High
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-normal uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Search input & Status filter */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by subject, email, or #..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
            {(
              [
                { id: "all", label: `All (${counts.total})` },
                { id: "open", label: `Open (${counts.open})` },
                { id: "in_progress", label: `In Progress (${counts.in_progress})` },
                { id: "resolved", label: `Resolved (${counts.resolved})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Priority filter selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Right: Sort controls, Refresh & Simulate Email button */}
        <div className="flex items-center gap-2 justify-end">
          {/* Sort order toggle / dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
            <span className="text-slate-500 font-medium hidden sm:inline">Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as "newest" | "oldest");
                setPage(1);
              }}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh tickets"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsSimulateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Simulate Inbound Email</span>
          </button>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
            <p>Loading tickets...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center text-xs text-rose-600 space-y-2">
            <p className="font-semibold">Failed to load tickets.</p>
            <button
              onClick={() => refetch()}
              className="text-xs text-indigo-600 underline font-medium hover:text-indigo-800"
            >
              Try again
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                ? "No matching tickets found"
                : "No tickets in inbox"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search criteria or resetting filters."
                : "Incoming customer emails sent to support addresses will automatically appear here."}
            </p>
            {(searchTerm || statusFilter !== "all" || priorityFilter !== "all") && (
              <button
                onClick={handleResetFilters}
                className="mt-2 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-20">Ticket</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th
                      onClick={toggleSortOrder}
                      className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors select-none"
                      title={`Click to sort by date (${sortOrder === "newest" ? "currently newest first" : "currently oldest first"})`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Received</span>
                        {sortOrder === "newest" ? (
                          <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Ticket Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                        #{ticket.ticketNumber}
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-slate-900 block truncate">
                              {ticket.subject}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {ticket.description}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px] shrink-0">
                            {(ticket.customerName?.[0] || ticket.customerEmail[0] || "U").toUpperCase()}
                          </div>
                          <div className="flex flex-col truncate max-w-[180px]">
                            <span className="font-semibold text-slate-900 truncate">
                              {ticket.customerName || ticket.customerEmail.split("@")[0]}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">
                              {ticket.customerEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(ticket.status)}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        {getPriorityBadge(ticket.priority)}
                      </td>

                      {/* Received Date (Newest First) */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <div>
                            <span className="font-medium text-slate-800">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-slate-400 ml-1.5 text-[10px]">
                              {new Date(ticket.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicketId(ticket.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View ticket details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
                <div>
                  Showing{" "}
                  <span className="font-semibold text-slate-800">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-800">
                    {Math.min(pagination.page * pagination.limit, pagination.totalItems)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-800">{pagination.totalItems}</span>{" "}
                  tickets
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-2 font-medium">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      <TicketDetailModal
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
      />

      {/* Simulate Inbound Email Modal */}
      <SimulateEmailModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
      />
    </div>
  );
}
