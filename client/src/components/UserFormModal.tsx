import React, { useEffect, useState } from "react";
import { X, Loader2, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserSchema,
  editUserSchema,
  type CreateUserInput,
  type EditUserInput,
} from "core/schemas/user";
import { useCreateUser, useEditUser, UserItem } from "../hooks/useUsers";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  initialData?: UserItem | null;
}

export function UserFormModal({
  isOpen,
  onClose,
  mode,
  initialData,
}: UserFormModalProps) {
  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();
  const { mutateAsync: editUser, isPending: isEditing } = useEditUser();
  const isPending = isCreating || isEditing;

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isEdit = mode === "edit";
  const schema = isEdit ? editUserSchema : createUserSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput | EditUserInput>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Reset form and errors when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      setShowPassword(false);
      if (isEdit && initialData) {
        reset({
          name: initialData.name,
          email: initialData.email,
          password: "",
        });
      } else {
        reset({
          name: "",
          email: "",
          password: "",
        });
      }
    } else {
      reset();
      setServerError(null);
    }
  }, [isOpen, isEdit, initialData, reset]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onSubmit = async (data: CreateUserInput | EditUserInput) => {
    setServerError(null);
    try {
      if (isEdit && initialData) {
        await editUser({ id: initialData.id, data: data as EditUserInput });
      } else {
        await createUser(data as CreateUserInput);
      }
      onClose(); // Close modal on success
    } catch (err: any) {
      setServerError(
        err.response?.data?.error ||
          err.message ||
          `Failed to ${isEdit ? "update" : "create"} user`,
      );
    }
  };

  const title = isEdit ? "Edit User" : "Create New User";
  const buttonText = isEdit ? "Save Changes" : "Create User";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="modal-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {serverError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="John Doe"
                className={errors.name ? "border-red-500" : ""}
                disabled={isPending}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="john@example.com"
                className={errors.email ? "border-red-500" : ""}
                disabled={isPending}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password{" "}
                {isEdit && (
                  <span className="text-xs text-slate-500 font-normal">
                    (Leave blank to keep current)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="••••••••"
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {buttonText}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
