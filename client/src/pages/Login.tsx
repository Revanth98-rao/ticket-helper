import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LifeBuoy, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { signIn, useSession } from "../lib/auth-client";

// Zod schema for login form validation
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";
  const { data: session, isPending: isSessionLoading } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  // If user is already logged in, redirect to home or requested path
  useEffect(() => {
    if (session?.user) {
      navigate(from, { replace: true });
    }
  }, [session, navigate, from]);

  const onSubmit = async (values: LoginFormData) => {
    setServerError(null);

    try {
      const res = await signIn.email({
        email: values.email,
        password: values.password,
      });

      if (res.error) {
        setServerError(res.error.message || "Invalid email or password");
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setServerError(err?.message || "Failed to connect to authentication server");
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      {/* Brand Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <LifeBuoy className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            TicketHelperStudent
          </h1>
          <p className="text-xs text-slate-400">AI Student Support Workspace</p>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Sign In</h2>
          <p className="text-sm text-slate-400 mt-1">
            Access your support dashboard and ticket queue
          </p>
        </div>

        {serverError && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-300 leading-snug">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail
                  className={`w-4 h-4 transition-colors ${
                    errors.email ? "text-rose-400" : "text-slate-500"
                  }`}
                />
              </div>
              <input
                id="email"
                type="email"
                {...register("email")}
                placeholder="admin@example.com"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${
                  errors.email
                    ? "border-2 border-rose-500 ring-2 ring-rose-500/30"
                    : "border border-slate-700/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-medium">
                <span>{errors.email.message}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock
                  className={`w-4 h-4 transition-colors ${
                    errors.password ? "text-rose-400" : "text-slate-500"
                  }`}
                />
              </div>
              <input
                id="password"
                type="password"
                {...register("password")}
                placeholder="••••••••••••"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-800/80 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none transition-all ${
                  errors.password
                    ? "border-2 border-rose-500 ring-2 ring-rose-500/30"
                    : "border border-slate-700/80 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                }`}
              />
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-medium">
                <span>{errors.password.message}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-500">
            Internal access only. Account creation is managed by your
            administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
