'use client';

import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { currentUser, userData, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
            Welcome, {userData?.displayName || currentUser.displayName || 'User'}!
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Dashboard - Multi Car Repair Management System
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                Quick Actions
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Access frequently used features
              </p>
            </div>

            <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                Recent Jobs
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                View and manage job cards
              </p>
            </div>

            <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                Statistics
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                View system statistics
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
