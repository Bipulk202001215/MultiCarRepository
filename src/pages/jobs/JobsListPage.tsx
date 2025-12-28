import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getJobCardsByCreator } from '@/lib/jobService';
import { JobCard } from '@/lib/types';
import { Link } from 'react-router-dom';

function getStatusBadgeClass(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
    SUBMITTED: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
    PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
    IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    QC_CHECK: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
    READY: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    COMPLETED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
    CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  };
  return statusMap[status] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200';
}

function formatStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    QC_CHECK: 'QC Check',
    READY: 'Ready',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return statusMap[status] || status;
}

export default function JobsListPage() {
  const { currentUser, userRole, userData } = useAuth();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    if (currentUser) {
      loadJobs();
    }
  }, [currentUser, userData]);

  const loadJobs = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      // Pass companyId if available, otherwise it will fallback to just filtering by creator
      const userJobs = await getJobCardsByCreator(currentUser.id, userData?.companyId);
      setJobs(userJobs);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs =
    filterStatus === 'ALL'
      ? jobs
      : jobs.filter((job) => job.status === filterStatus);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-zinc-600 dark:text-zinc-400">Loading jobs...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                My Job Cards
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                All job cards created by you
              </p>
            </div>
            <Link
              to="/jobs/create"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Create New Job
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Filter by Status:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="QC_CHECK">QC Check</option>
              <option value="READY">Ready</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span className="ml-4 text-sm text-zinc-600 dark:text-zinc-400">
              Showing {filteredJobs.length} of {jobs.length} jobs
            </span>
          </div>

          {/* Jobs Table */}
          <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900 shadow">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Job No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Vehicle No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                {filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {job.jobNo}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {job.vehicleNo || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {job.customerName || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {job.mobile || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
                          job.status
                        )}`}
                      >
                        {formatStatusLabel(job.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {job.createdAt.toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredJobs.length === 0 && (
              <div className="p-8 text-center text-zinc-600 dark:text-zinc-400">
                No jobs found
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

