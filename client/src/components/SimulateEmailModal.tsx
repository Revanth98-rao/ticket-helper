import React, { useState } from "react";
import { X, Mail, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useSimulateInboundEmail } from "../hooks/useTickets";

interface SimulateEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SimulateEmailModal({
  isOpen,
  onClose,
  onSuccess,
}: SimulateEmailModalProps) {
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [to, setTo] = useState("support@tickethelper.internal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const simulateMutation = useSimulateInboundEmail();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    if (!fromEmail.trim() || !fromEmail.includes("@")) {
      setErrorMessage("Please provide a valid sender email address");
      return;
    }
    if (!subject.trim()) {
      setErrorMessage("Email subject is required");
      return;
    }
    if (!body.trim()) {
      setErrorMessage("Email body is required");
      return;
    }

    try {
      const res = await simulateMutation.mutateAsync({
        fromName: fromName.trim() || undefined,
        fromEmail: fromEmail.trim(),
        to: to.trim() || "support@tickethelper.internal",
        subject: subject.trim(),
        body: body.trim(),
      });

      setSuccessInfo(
        `Ticket #${res.ticket.ticketNumber} created successfully!`
      );
      if (onSuccess) onSuccess();

      // Reset form and close shortly
      setTimeout(() => {
        setFromName("");
        setFromEmail("");
        setSubject("");
        setBody("");
        setSuccessInfo(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to simulate email"
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulate-email-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 id="simulate-email-title" className="text-base font-bold text-slate-900">
                Simulate Inbound Email
              </h3>
              <p className="text-xs text-slate-500">
                Send a test email to the support address to generate a ticket
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successInfo}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fromName" className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name
              </label>
              <input
                id="fromName"
                type="text"
                placeholder="Jane Student"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label htmlFor="fromEmail" className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Email <span className="text-rose-500">*</span>
              </label>
              <input
                id="fromEmail"
                type="email"
                required
                placeholder="jane@student.edu"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="toAddress" className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient Support Address
            </label>
            <input
              id="toAddress"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 bg-slate-50 text-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-xs font-semibold text-slate-700 mb-1">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              id="subject"
              type="text"
              required
              placeholder="e.g. Issue accessing online lecture notes"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label htmlFor="body" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="body"
              required
              rows={4}
              placeholder="Hi support team, I'm encountering an issue with..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={simulateMutation.isPending}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={simulateMutation.isPending}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {simulateMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Inbound Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

