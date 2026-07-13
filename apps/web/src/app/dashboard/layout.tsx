"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  Users,
  Settings,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMe } from "@/lib/api";
import { authClient } from "../../lib/auth-client";

import { config } from "@tracker/config";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/links", label: "Links", icon: Link2 },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const enableAuth = config.public.enableAuth;

  useEffect(() => {
    async function load() {
      try {
        const u = await getMe();
        setUser(u);
      } catch (err) {
        console.error("Failed to load user profile", err);
        if (enableAuth) {
          router.push("/auth/login");
        }
      }
    }
    load();
  }, []);

  async function handleLogout() {
    await authClient.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-white/[0.06] py-6">
        {/* Logo */}
        <div className="px-5 mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-lg font-black gradient-text">Tribelinks</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  active
                    ? "bg-white/8 text-white font-medium"
                    : "text-white/40 hover:text-white/70 hover:bg-white/4",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Profile Card / Signout */}
        <div className="mt-auto px-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-violet-300 uppercase">
              {user?.name ? user.name.slice(0, 2) : "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.name || "Loading..."}
            </p>
            <p className="text-[10px] text-white/40 truncate">
              {user?.email || "tribelinks user"}
            </p>
          </div>
          {enableAuth && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition-all shrink-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
