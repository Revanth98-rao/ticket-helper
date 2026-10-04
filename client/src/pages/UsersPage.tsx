import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, Shield } from "lucide-react";
import UserListSection from "@/components/UserListSection";

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Workspace
              </Link>
            </Button>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>User Management</span>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            Admin Only
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <UserListSection standalone={false} />
      </main>
    </div>
  );
}
