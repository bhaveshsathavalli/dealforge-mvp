"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { appNav } from "@/config/nav";
import { accentIconClass, accentActiveBg } from "@/lib/accents";
import { Logo } from "@/components/logo";
import { useState } from "react";
import { UserButton, useUser } from '@clerk/nextjs';

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useUser();

  return (
    <aside
      className={`relative shrink-0 border-r bg-surface border-border transition-all duration-300 flex flex-col h-screen ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo and Brand */}
      <div className="flex items-center gap-2 px-4 py-3 text-xl font-semibold shrink-0">
        <Logo size={24} />
        {!isCollapsed && <span>DealForge</span>}
      </div>

      {/* Navigation - Scrollable */}
      <nav className="px-2 pt-2 space-y-1 flex-1 overflow-y-auto">
        {appNav.map(item => {
          const IconName = item.icon.charAt(0).toUpperCase() + item.icon.slice(1);
          const Icon = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[IconName] || Icons.Circle;

          const active = pathname.startsWith(item.href);
          const iconTint = accentIconClass[item.accent] ?? "text-slate-400";
          const pillBg = accentActiveBg[item.accent] ?? "bg-white/10";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none",
                active
                  ? `${pillBg} font-medium ring-1 ring-brand/25`
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              ].join(" ")}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`h-4 w-4 ${iconTint}`} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section - User Account and Collapse Button - Fixed */}
      <div className="p-4 border-t border-border bg-surface shrink-0">
        <div className="flex flex-col items-center gap-3">
          {/* User Account */}
          <div className="flex items-center gap-2">
            {!isCollapsed && user && (
              <span className="text-sm text-text">
                {user.firstName || user.emailAddresses[0]?.emailAddress}
              </span>
            )}
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8"
                }
              }}
            />
          </div>
          
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-border bg-surface hover:bg-surface-alt text-text transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <Icons.ChevronRight className="h-4 w-4" />
            ) : (
              <Icons.ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}