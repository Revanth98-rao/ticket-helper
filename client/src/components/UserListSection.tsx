import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Shield,
  Search,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Loader2,
  Calendar,
  Mail,
  X,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { useUsers, UserItem, UsersApiResponse } from "@/hooks/useUsers";
import { CreateUserModal } from "./CreateUserModal";

export type { UserItem, UsersApiResponse };

interface UserListSectionProps {
  standalone?: boolean;
}

export default function UserListSection({ standalone = false }: UserListSectionProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "agent">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useUsers(roleFilter);

  const users = data?.users ?? [];
  const counts = data?.counts ?? { total: 0, admin: 0, agent: 0 };
  const errorMessage = error ? (error instanceof Error ? error.message : String(error)) : null;

  // Client-side instant filter on top of loaded users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getInitials = (name: string) => {
    return (
      name
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U"
    );
  };

  return (
    <div className={standalone ? "min-h-screen bg-slate-950 text-slate-100 flex flex-col" : "space-y-6"}>
      {/* Standalone Top Navbar */}
      {standalone && (
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Workspace
                </Link>
              </Button>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>User Management</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Admin Only
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Main Container */}
      <div className={standalone ? "max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8" : "space-y-6"}>
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`font-bold tracking-tight flex items-center gap-3 ${standalone ? "text-2xl text-white" : "text-xl text-slate-900"}`}>
              Users & Permissions
              <span className={`text-xs font-normal px-2.5 py-0.5 rounded-full border ${standalone ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-200 text-slate-700 border-slate-300"}`}>
                {counts.total} total
              </span>
            </h1>
            <p className={`text-sm mt-1 ${standalone ? "text-slate-400" : "text-slate-500"}`}>
              View and audit all registered system administrators and support agents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 text-xs font-semibold shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create User
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className={standalone ? "border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-2 ${isRefetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={standalone ? "bg-slate-900 border-slate-800 shadow-sm" : "bg-white border-slate-200 shadow-sm"}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wider ${standalone ? "text-slate-400" : "text-slate-500"}`}>
                  Total Users
                </p>
                <p className={`text-2xl font-bold mt-1 ${standalone ? "text-white" : "text-slate-900"}`}>
                  {counts.total}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${standalone ? "bg-slate-800 text-slate-300" : "bg-indigo-50 text-indigo-600"}`}>
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card className={standalone ? "bg-slate-900 border-slate-800 shadow-sm" : "bg-white border-slate-200 shadow-sm"}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wider ${standalone ? "text-slate-400" : "text-slate-500"}`}>
                  Administrators
                </p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {counts.admin}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600">
                <Shield className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className={standalone ? "bg-slate-900 border-slate-800 shadow-sm" : "bg-white border-slate-200 shadow-sm"}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wider ${standalone ? "text-slate-400" : "text-slate-500"}`}>
                  Support Agents
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {counts.agent}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                <UserCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or role..."
              className={standalone ? "pl-9 pr-9 bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-indigo-500" : "pl-9 pr-9 bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus-visible:ring-indigo-500"}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className={`inline-flex rounded-lg p-1 border shrink-0 ${standalone ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
            <button
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                roleFilter === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : standalone ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                roleFilter === "admin"
                  ? "bg-purple-600 text-white shadow-sm"
                  : standalone ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Admins Only
            </button>
            <button
              onClick={() => setRoleFilter("agent")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                roleFilter === "agent"
                  ? "bg-blue-600 text-white shadow-sm"
                  : standalone ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Agents Only
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-rose-700">
                Failed to load users
              </h4>
              <p className="text-xs text-rose-600 mt-0.5">{errorMessage}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Users Table */}
        <Card className={`overflow-hidden shadow-xl ${standalone ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className={`text-sm ${standalone ? "text-slate-400" : "text-slate-500"}`}>Loading system users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${standalone ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400"}`}>
                <Users className="w-6 h-6" />
              </div>
              <h3 className={`text-base font-semibold ${standalone ? "text-white" : "text-slate-900"}`}>
                No users found
              </h3>
              <p className={`text-sm max-w-sm mx-auto ${standalone ? "text-slate-400" : "text-slate-500"}`}>
                {searchQuery
                  ? `No user matches the query "${searchQuery}". Try clearing your search.`
                  : "No users match the selected role filter."}
              </p>
              {(searchQuery || roleFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("all");
                  }}
                  className="mt-2 border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${standalone ? "border-slate-800 bg-slate-900/90 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                    <th className="py-3.5 px-6">User</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Created At</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${standalone ? "divide-slate-800/60" : "divide-slate-200"}`}>
                  {filteredUsers.map((user) => {
                    const isAdmin = user.role === "admin";
                    const isCurrentUser = session?.user?.email === user.email;

                    return (
                      <tr
                        key={user.id}
                        className={standalone ? "hover:bg-slate-800/40 transition-colors" : "hover:bg-slate-50 transition-colors"}
                      >
                        {/* User Identity */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                                isAdmin
                                  ? standalone
                                    ? "bg-purple-900/30 text-purple-300 border-purple-500/30"
                                    : "bg-purple-100 text-purple-700 border-purple-200"
                                  : standalone
                                    ? "bg-blue-900/30 text-blue-300 border-blue-500/30"
                                    : "bg-blue-100 text-blue-700 border-blue-200"
                              }`}
                            >
                              {user.image ? (
                                <img
                                  src={user.image}
                                  alt={user.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                getInitials(user.name)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium truncate ${standalone ? "text-white" : "text-slate-900"}`}>
                                  {user.name}
                                </span>
                                {isCurrentUser && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 font-semibold border border-indigo-500/30">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className={`text-xs flex items-center gap-1.5 mt-0.5 truncate ${standalone ? "text-slate-400" : "text-slate-500"}`}>
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-700 border border-purple-300">
                              <Shield className="w-3 h-3 text-purple-600" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 border border-blue-300">
                              <UserCheck className="w-3 h-3 text-blue-600" />
                              Support Agent
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        </td>

                        {/* Created At */}
                        <td className={`py-4 px-6 whitespace-nowrap text-xs ${standalone ? "text-slate-400" : "text-slate-500"}`}>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(user.createdAt)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
