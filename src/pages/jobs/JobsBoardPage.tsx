import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getAllJobCards, updateJobCardStatus } from '@/lib/jobService';
import { JobCard, JobStatus } from '@/lib/types';

const STATUS_COLUMNS: { status: JobStatus; label: string; color: string }[] = [
  { status: 'PENDING', label: 'PENDING', color: 'yellow' },
  { status: 'IN_PROGRESS', label: 'IN PROGRESS', color: 'blue' },
  { status: 'QC_CHECK', label: 'QC CHECK', color: 'orange' },
  { status: 'READY', label: 'READY', color: 'green' },
];

function formatTimeInStatus(updatedAt: Date): string {
  const now = new Date();
  const diff = now.getTime() - updatedAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function getStatusColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    blue: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    orange: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
    green: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  };
  return colorMap[color] || 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700';
}

function getHeaderColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-500 dark:bg-yellow-600',
    blue: 'bg-blue-500 dark:bg-blue-600',
    orange: 'bg-orange-500 dark:bg-orange-600',
    green: 'bg-green-500 dark:bg-green-600',
  };
  return colorMap[color] || 'bg-zinc-500 dark:bg-zinc-600';
}

export default function JobsBoardPage() {
  const { currentUser, userData } = useAuth();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      if (!userData?.companyId || userData.companyId.trim() === '') {
        setError('Company not found. Please contact administrator to assign you to a company.');
        setJobs([]);
        return;
      }
      const allJobs = await getAllJobCards(userData.companyId);
      // Filter out DRAFT and COMPLETED/CANCELLED statuses for the board
      const boardJobs = allJobs.filter(
        (job) => STATUS_COLUMNS.some((col) => col.status === job.status)
      );
      setJobs(boardJobs);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (jobId: string, newStatus: JobStatus) => {
    try {
      setUpdatingJobId(jobId);
      await updateJobCardStatus(jobId, newStatus);
      await loadJobs();
    } catch (err: any) {
      setError(err.message || 'Failed to update job status');
    } finally {
      setUpdatingJobId(null);
    }
  };

  const getJobsByStatus = (status: JobStatus): JobCard[] => {
    return jobs.filter((job) => job.status === status);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-zinc-600 dark:text-zinc-400">Loading status board...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
<div className="p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl min-w-0">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
              Status Board
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Visual overview of all job cards by status
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {STATUS_COLUMNS.map((column) => {
              const columnJobs = getJobsByStatus(column.status);
              return (
                <div
                  key={column.status}
                  className="flex flex-col rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                >
                  {/* Column Header */}
                  <div
                    className={`${getHeaderColorClass(
                      column.color
                    )} rounded-t-lg px-4 py-3 text-center`}
                  >
                    <h2 className="text-lg font-semibold text-white">
                      {column.label}
                    </h2>
                    <p className="text-sm text-white/80">
                      {columnJobs.length} {columnJobs.length === 1 ? 'job' : 'jobs'}
                    </p>
                  </div>

                  {/* Column Content */}
                  <div className="flex-1 space-y-3 p-4 overflow-y-auto max-h-[calc(100vh-220px)] sm:max-h-[calc(100vh-250px)]">
                    {columnJobs.length === 0 ? (
                      <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        No jobs
                      </div>
                    ) : (
                      columnJobs.map((job) => (
                        <div
                          key={job.id}
                          className={`${getStatusColorClass(
                            column.color
                          )} rounded-lg border p-4 shadow-sm`}
                        >
                          <div className="mb-3">
                            <div className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {job.jobNo}
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                              Vehicle: {job.vehicleNo || 'N/A'}
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                              Customer: {job.customerName || 'N/A'}
                            </div>
                            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                              Time in status: {formatTimeInStatus(job.updatedAt)}
                            </div>
                          </div>

                          {/* Status Update Actions */}
                          <div className="mt-3 space-y-1">
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              Update Status:
                            </label>
                            <select
                              value={job.status}
                              onChange={(e) =>
                                handleStatusUpdate(job.id, e.target.value as JobStatus)
                              }
                              disabled={updatingJobId === job.id}
                              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {STATUS_COLUMNS.map((col) => (
                                <option key={col.status} value={col.status}>
                                  {col.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
