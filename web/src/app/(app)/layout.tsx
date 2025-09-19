import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen
                    bg-df-lightMain text-neutral-900
                    dark:bg-[var(--df-dark-main)] dark:text-neutral-100">
      <Sidebar />
      <main className="flex-1">
        <div className="flex items-center justify-end p-4">
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
