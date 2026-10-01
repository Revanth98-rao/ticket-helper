import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, Shield } from "lucide-react";

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Workspace
              </Link>
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="w-4 h-4 text-primary" />
              <span>User Management</span>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Admin Only
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="border-b pb-6 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage system users and agent permissions.
          </p>
        </div>
      </main>
    </div>
  );
}
