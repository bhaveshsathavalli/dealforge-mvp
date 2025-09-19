"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { appNav } from "@/config/nav";
import { accentIconClass, accentActiveBg } from "@/lib/accents";
import { Logo } from "@/components/logo";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 shrink-0 border-r
                 bg-[var(--df-light-nav)] border-df-lightBorder
                 dark:bg-[var(--df-dark-nav)] dark:border-[var(--df-dark-border)]"
    >
      <div className="flex items-center gap-2 px-4 py-4 text-xl font-semibold">
        <Logo size={24} />
        <span>DealForge</span>
      </div>

      <nav className="px-2 space-y-1">
        {appNav.map(item => {
          const IconName = item.icon.charAt(0).toUpperCase() + item.icon.slice(1);
          const Icon = (Icons as Record<string, ReaCt.ComponentType<{ className?: string }>>)[IconName] || Icons.Circle;

          const active = pathname.startsWith(item.href);
          const iconTint = accentIconClass[item.accent] ?? "text-slate-400";
          const pillBg  = accentActiveBg[item.accent] ?? "bg-white/10";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                active
                  ? `${pillBg} font-medium ring-1 ring-brand/25`
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              ].join(" ")}
            >
              <Icon className={`h-4 w-4 ${iconTint}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
