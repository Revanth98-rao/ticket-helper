import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import {
  Inbox,
  Search,
  Mail,
  ExternalLink,
  RefreshCw,
  Clock,
  ArrowDown,
  ArrowUp,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTickets, TicketItem } from "../hooks/useTickets";
import TicketDetailModal from "./TicketDetailModal";
import SimulateEmailModal from "./SimulateEmailModal";

const columnHelper = createColumnHelper<TicketItem>();

export default function TicketListTable() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // TanStack Table Sorting State: Defaults to Newest First (createdAt: desc)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);

  // Derive sort parameters for server query from TanStack Table sorting state
  const currentSort = sorting[0];
  const sortParam: "newest" | "oldest" = currentSort?.desc === false ? "oldest" : "newest";
  const sortByParam = (currentSort?.id as any) || "createdAt";
  const sortOrderParam: "asc" | "desc" = currentSort?.desc === false ? "asc" : "desc";

  const { data, isLoading, error, refetch, isFetching } = useTickets({
    status: statusFilter,
    priority: priorityFilter,
    search: searchTerm,
    sort: sortParam,
    sortBy: sortByParam,
    sortOrder: sortOrderParam,
    page,
    limit: pageSize,
  });

  const tickets = useMemo(() => data?.tickets || [], [data?.tickets]);
  const counts = data?.counts || { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0 };
  const pagination = data?.pagination || { page: 1, limit: pageSize, totalPages: 1, totalItems: 0 };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setSearchTerm("");
    setSorting([{ id: "createdAt", desc: true }]);
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

  // Define TanStack Table Columns
  const columns = useMemo(
    () => [
      columnHelper.accessor("ticketNumber", {
        header: "Ticket",
        cell: (info) => (
          <span className="font-mono font-bold text-indigo-600">
            #{info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("subject", {
        header: "Subject",
        cell: (info) => {
          const ticket = info.row.original;
          return (
            <div className="flex items-center gap-2 max-w-sm">
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
          );
        },
      }),
      columnHelper.accessor(
        (row) => row.customerName || row.customerEmail,
        {
          id: "customer",
          header: "Customer",
          cell: (info) => {
            const ticket = info.row.original;
            const displayName = ticket.customerName || ticket.customerEmail.split("@")[0];
            const initial = (ticket.customerName?.[0] || ticket.customerEmail[0] || "U").toUpperCase();
            return (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px] shrink-0">
                  {initial}
                </div>
                <div className="flex flex-col truncate max-w-[180px]">
                  <span className="font-semibold text-slate-900 truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {ticket.customerEmail}
                  </span>
                </div>
              </div>
            );
          },
        }
      ),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => getStatusBadge(info.getValue()),
      }),
      columnHelper.accessor("priority", {
        header: "Priority",
        cell: (info) => getPriorityBadge(info.getValue()),
      }),
      columnHelper.accessor("createdAt", {
        header: "Received",
        enableSorting: true,
        sortDescFirst: true,
        cell: (info) => {
          const date = new Date(info.getValue());
          return (
            <div className="flex items-center gap-1.5 text-slate-600 text-[11px] whitespace-nowrap">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <div>
                <span className="font-medium text-slate-800">
                  {date.toLocaleDateString()}
                </span>
                <span className="text-slate-400 ml-1.5 text-[10px]">
                  {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="block text-right">Actions</span>,
        cell: (info) => (
          <div className="text-right">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTicketId(info.row.original.id);
              }}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="View ticket details"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        ),
      }),
    ],
    []
  );

  // Initialize TanStack Table instance
  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
    manualSorting: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
  });

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

        {/* Right: TanStack Table Sort controls, Refresh & Simulate Email button */}
        <div className="flex items-center gap-2 justify-end">
          {/* Toolbar Sort selector synchronized with TanStack Table */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
            <span className="text-slate-500 font-medium hidden sm:inline">Sort:</span>
            <select
              value={sortParam}
              onChange={(e) => {
                const newSort = e.target.value as "newest" | "oldest";
                setSorting([{ id: "createdAt", desc: newSort === "newest" }]);
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

      {/* TanStack Table Container */}
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
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]"
                    >
                      {headerGroup.headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        const isSorted = header.column.getIsSorted();

                        return (
                          <th
                            key={header.id}
                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                            className={`py-3 px-4 ${
                              canSort ? "cursor-pointer hover:text-slate-900 select-none" : ""
                            }`}
                            title={
                              canSort
                                ? `Click to sort by ${header.column.columnDef.header}`
                                : undefined
                            }
                          >
                            <div className="flex items-center gap-1.5">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {isSorted === "desc" && (
                                <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                              {isSorted === "asc" && (
                                <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedTicketId(row.original.id)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-3.5 px-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
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
