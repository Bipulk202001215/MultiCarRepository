import { useState } from 'react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen min-w-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-transparent flex flex-col">
        {/* Mobile header with menu button */}
        <header className="md:hidden shrink-0 flex items-center h-14 px-4 bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-2 text-lg font-semibold text-zinc-800 dark:text-zinc-200 truncate">Multi Car Repair</span>
        </header>
        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}





