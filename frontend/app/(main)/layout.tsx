import { Navbar } from "@/components/layout/Navbar";
import { RoleGuard } from "@/components/layout/RoleGuard";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </RoleGuard>
  );
}
