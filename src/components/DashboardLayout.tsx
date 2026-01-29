import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-transparent">{children}</main>
    </div>
  );
}





