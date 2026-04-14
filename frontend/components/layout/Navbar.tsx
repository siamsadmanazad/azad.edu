"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — localStorage isn't available on server
  useEffect(() => setMounted(true), []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (!mounted) {
    return (
      <header className="h-14 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50" />
    );
  }

  return (
    <header className="h-14 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-slate-900 hover:text-slate-700 transition-colors"
        >
          Azad.Edu
        </Link>

        {/* Right side */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Teacher-only dashboard link */}
            {user.role.name === "teacher" && (
              <Link
                href="/dashboard"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors hidden sm:block"
              >
                Dashboard
              </Link>
            )}

            <span className="text-sm text-slate-700 hidden sm:block">
              {user.full_name}
            </span>

            <Badge
              className={
                user.role.name === "teacher"
                  ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
              }
              variant="outline"
            >
              {user.role.name === "teacher" ? "Teacher" : "Student"}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-900"
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
