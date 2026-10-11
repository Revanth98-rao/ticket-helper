import React, { useState } from "react";
import {
  Inbox,
  Search,
  Filter,
  Mail,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock,
  User,
} from "lucide-react";
import { useTickets, TicketItem } from "../hooks/useTickets";
import TicketDetailModal from "./TicketDetailModal";
import SimulateEmailModal from "./SimulateEmailModal";

export default function TicketListTable() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);

  const { data, isLoading, error, refetch, isFetching } = useTickets({
    status: statusFilter,
    search: searchTerm,
  });

  const tickets = data?.tickets || [];
  const counts = data?.counts || { total: 0, open: 0, in_progress: 0, resolved: 0 };

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
        return <span className="text-rose-600 font-bold uppercase text-[10px]">Urgent</span>;
      case "high":
        return <span className="text-amber-600 font-semibold uppercase text-[10px]">High</span>;
      case "medium":
        return <span className="text-indigo-600 font-medium uppercase text-[10px]">Medium</span>;
      default:
        return <span className="text-slate-500 font-normal uppercase text-[10px]">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Search input & Status filter */}
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by subject, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
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
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === tab.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Refresh & Simulate Email button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
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
          <div className="py-16 text-center text-xs text-slate-400">
            Loading tickets...
          </div>
        ) : error ? (
          <div className="py-16 text-center text-xs text-rose-600">
            Failed to load tickets. Please try again.
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">No tickets found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No tickets match your filter. You can simulate an incoming email using the button above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Received</th>
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
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      #{ticket.ticketNumber}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{ticket.subject}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {ticket.customerName || ticket.customerEmail.split("@")[0]}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {ticket.customerEmail}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(ticket.status)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getPriorityBadge(ticket.priority)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(ticket.createdAt).toLocaleDateString()}{" "}
                      {new Date(ticket.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

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

