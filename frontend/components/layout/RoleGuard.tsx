"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole?: "teacher" | "student";
}

export function RoleGuard({ children, requiredRole }: RoleGuardProps) {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (requiredRole && user.role.name !== requiredRole) {
      router.replace("/");
    }
  }, [mounted, token, user, requiredRole, router]);

  // Avoid flash of content before redirect
  if (!mounted || !token || !user) return null;
  if (requiredRole && user.role.name !== requiredRole) return null;

  return <>{children}</>;
}
