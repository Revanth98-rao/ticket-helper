import React from "react";
import { X, Mail, User, Clock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { useTicket, useUpdateTicket } from "../hooks/useTickets";
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
  const updateMutation = useUpdateTicket();

  if (!ticketId) return null;

  const ticket = data?.ticket;

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (!ticket) return;
    updateMutation.mutate({
      id: ticket.id,
      data: { status: newStatus },
    });
  };

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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
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
                  <span className="text-slate-400 block font-medium">Received At</span>
                  <span className="font-semibold text-slate-700 block mt-1 text-[11px]">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Email Messages Thread */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Message Thread ({ticket.messages?.length || 1})
                </h4>

                {ticket.messages && ticket.messages.length > 0 ? (
                  ticket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                            {msg.senderName?.[0]?.toUpperCase() || "C"}
                          </div>
                          <span className="font-semibold text-slate-900">
                            {msg.senderName || msg.senderEmail}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            &lt;{msg.senderEmail}&gt;
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">
                        {msg.bodyText}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border border-slate-200 rounded-xl p-4 bg-white text-xs text-slate-700 whitespace-pre-wrap">
                    {ticket.description}
                  </div>
                )}
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

