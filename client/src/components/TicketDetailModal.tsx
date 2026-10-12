import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  User,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Send,
  MessageSquare,
  Reply,
  Loader2,
} from "lucide-react";
import {
  useTicket,
  useUpdateTicket,
  useAssignees,
  useReplyTicket,
} from "../hooks/useTickets";
import { useSession } from "../lib/auth-client";
import type { TicketStatus } from "core/schemas/ticket";

interface TicketDetailModalProps {
  ticketId: string | null;
  onClose: () => void;
}

export default function TicketDetailModal({
  ticketId,
  onClose,
}: TicketDetailModalProps) {
  const { data, isLoading, error } = useTicket(ticketId);
  const { data: assigneesData, isLoading: isAssigneesLoading } = useAssignees();
  const { data: sessionData } = useSession();
  const updateMutation = useUpdateTicket();
  const replyMutation = useReplyTicket();

  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<TicketStatus>("in_progress");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState<boolean>(false);

  const ticket = data?.ticket;
  const assignees = assigneesData?.assignees || [];
  const currentUserId = sessionData?.user?.id;
  const messages = ticket?.messages || [];
  const initialMessage = messages.length > 0 ? messages[0] : null;
  const replyMessages = messages.length > 1 ? messages.slice(1) : [];

  useEffect(() => {
    if (ticket) {
      setReplyStatus(ticket.status === "open" ? "in_progress" : ticket.status);
    }
  }, [ticket?.id, ticket?.status]);

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (!ticket) return;
    updateMutation.mutate({
      id: ticket.id,
      data: { status: newStatus },
    });
  };

  const handleAssigneeChange = (newAssigneeId: string | null) => {
    if (!ticket) return;
    updateMutation.mutate({
      id: ticket.id,
      data: { assignedToId: newAssigneeId },
    });
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyText.trim()) return;
    setReplyError(null);
    setReplySuccess(false);

    replyMutation.mutate(
      {
        ticketId: ticket.id,
        data: {
          bodyText: replyText.trim(),
          status: replyStatus,
        },
      },
      {
        onSuccess: () => {
          setReplyText("");
          setReplySuccess(true);
          setTimeout(() => setReplySuccess(false), 4000);
        },
        onError: (err: any) => {
          setReplyError(
            err?.response?.data?.message || err?.message || "Failed to submit reply"
          );
        },
      }
    );
  };

  if (!ticketId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
              #{ticket?.ticketNumber || "..."}
            </span>
            <div>
              <h3
                id="ticket-detail-title"
                className="text-base font-bold text-slate-900 truncate max-w-md"
              >
                {ticket?.subject || "Loading Ticket..."}
              </h3>
              <p className="text-xs text-slate-500">
                Received via Email &bull; {ticket?.recipientEmail}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isLoading && (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading ticket details...
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              Failed to load ticket details.
            </div>
          )}

          {ticket && (
            <>
              {/* Meta details bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Customer</span>
                  <span className="font-semibold text-slate-900 truncate block">
                    {ticket.customerName || ticket.customerEmail}
                  </span>
                  <span className="text-slate-500 truncate block text-[11px]">
                    {ticket.customerEmail}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Status</span>
                  <select
                    aria-label="Ticket Status"
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                    disabled={updateMutation.isPending}
                    className="mt-0.5 text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Priority</span>
                  <span className="font-semibold text-slate-700 capitalize block mt-1">
                    {ticket.priority}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 block font-medium">Assignee</span>
                    {currentUserId && ticket.assignedTo?.id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => handleAssigneeChange(currentUserId)}
                        disabled={updateMutation.isPending}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline disabled:opacity-50"
                        title="Assign ticket to yourself"
                      >
                        Me
                      </button>
                    )}
                  </div>
                  <select
                    aria-label="Assigned Agent"
                    value={ticket.assignedTo?.id || ""}
                    onChange={(e) => handleAssigneeChange(e.target.value || null)}
                    disabled={updateMutation.isPending || isAssigneesLoading}
                    className="mt-0.5 w-full text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Received At</span>
                  <span className="font-semibold text-slate-700 block mt-1 text-[11px]">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Initial Customer Inquiry */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Initial Inquiry
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {new Date(initialMessage?.createdAt || ticket.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                        {(initialMessage?.senderName || ticket.customerName)?.[0]?.toUpperCase() || "C"}
                      </div>
                      <span className="font-semibold text-slate-900">
                        {initialMessage?.senderName || ticket.customerName || ticket.customerEmail}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        &lt;{initialMessage?.senderEmail || ticket.customerEmail}&gt;
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        Customer
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">
                    {initialMessage?.bodyText || ticket.description}
                  </div>
                </div>
              </div>

              {/* Reply Thread */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Reply Thread ({replyMessages.length})
                  </h4>
                </div>

                {replyMessages.length > 0 ? (
                  <div className="space-y-3">
                    {replyMessages.map((msg) => {
                      const isAgent = msg.senderType === "agent";
                      return (
                        <div
                          key={msg.id}
                          className={`border rounded-xl p-4 shadow-xs space-y-2 ${
                            isAgent
                              ? "bg-indigo-50/40 border-indigo-200/80"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs border-b border-slate-100/80 pb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                  isAgent
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 border border-slate-200 text-slate-600"
                                }`}
                              >
                                {isAgent ? (
                                  <UserCheck className="w-3.5 h-3.5" />
                                ) : (
                                  msg.senderName?.[0]?.toUpperCase() || "C"
                                )}
                              </div>
                              <span className="font-semibold text-slate-900">
                                {msg.senderName || msg.senderEmail}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                &lt;{msg.senderEmail}&gt;
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  isAgent
                                    ? "bg-indigo-100 text-indigo-700 font-bold"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {isAgent ? "Staff Reply" : "Customer"}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[11px]">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">
                            {msg.bodyText}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/50">
                    <p className="text-xs text-slate-400">
                      No replies in this thread yet. Send a reply below to respond to the customer.
                    </p>
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Reply className="w-3.5 h-3.5 text-indigo-600" />
                    Submit Reply
                  </h4>
                  {sessionData?.user && (
                    <span className="text-[11px] text-slate-500">
                      Replying as <strong className="text-slate-700">{sessionData.user.name || sessionData.user.email}</strong>
                    </span>
                  )}
                </div>

                <form onSubmit={handleSendReply} className="space-y-3">
                  <textarea
                    aria-label="Reply message"
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response to the customer here..."
                    disabled={replyMutation.isPending}
                    className="w-full text-xs p-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 resize-y"
                  />

                  {replyError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{replyError}</span>
                    </div>
                  )}

                  {replySuccess && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Reply sent successfully!</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <label htmlFor="reply-status-select" className="text-xs text-slate-500 font-medium">
                        Status after reply:
                      </label>
                      <select
                        id="reply-status-select"
                        aria-label="Status after reply"
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value as TicketStatus)}
                        disabled={replyMutation.isPending}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                        <option value="open">Keep Open</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!replyText.trim() || replyMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    >
                      {replyMutation.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

