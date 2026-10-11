import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { UserItem, useDeleteUser } from "../hooks/useUsers";
import { Button } from "./ui/button";

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserItem | null;
  onSuccess?: () => void;
}

export function DeleteUserModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: DeleteUserModalProps) {
  const { mutateAsync: deleteUser, isPending } = useDeleteUser();
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isPending]);

  if (!isOpen || !user) return null;

  const handleDelete = async () => {
    setServerError(null);
    try {
      await deleteUser(user.id);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setServerError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to delete user."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 id="delete-modal-title" className="text-lg font-semibold text-slate-900">
              Delete User
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {serverError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
              {serverError}
            </div>
          )}

          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900">{user.name}</span> (
            <span className="font-mono text-xs text-slate-800">{user.email}</span>)?
          </p>

          <p className="text-xs text-slate-500 bg-amber-50 p-2.5 rounded-md border border-amber-200 text-amber-800">
            This will deactivate the user account (soft delete). The user will no longer be able to log in.
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-500"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete User
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

