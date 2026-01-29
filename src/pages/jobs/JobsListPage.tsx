import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getJobsByCompanyId } from '@/lib/apiClient';
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
  const { currentUser, userRole, userData, userCompany } = useAuth();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    if (currentUser) {
      loadJobs();
    }
  }, [currentUser, userData, userCompany]);

  const loadJobs = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const companyId = userCompany?.id || userData?.companyId;
      
      if (!companyId) {
        setError('Company ID not found. Please contact administrator.');
        setJobs([]);
        return;
      }

      // Fetch jobs by company ID from API
      const apiJobs = await getJobsByCompanyId(companyId);
      
      // Transform API response to JobCard format
      const transformedJobs: JobCard[] = apiJobs.map((job: any) => {
        // Extract job descriptions from nested structure: jobDetailId.jobDescription
        const jobDescriptions = job.jobDetailId?.jobDescription || [];
        
        // Transform job descriptions to match JobDescription type
        // Convert serviceType from uppercase (PERIODIC) to title case (Periodic)
        const transformServiceType = (type: string): string => {
          if (!type) return 'Periodic';
          // Handle special case: AC should stay as AC
          if (type.toUpperCase() === 'AC') return 'AC';
          // Convert "PERIODIC" -> "Periodic", "REPAIR" -> "Repair", etc.
          return type.charAt(0) + type.slice(1).toLowerCase();
        };
        
        const transformedJobDescriptions = jobDescriptions
          .filter((desc: any) => desc.serviceType || desc.description) // Filter out completely empty entries
          .map((desc: any) => ({
            serviceType: transformServiceType(desc.serviceType) as any,
            description: desc.description || '',
            assignedMechanicType: desc.assignedMechanicType || '',
            estimatedTime: desc.estimatedTime || '',
          }));

        return {
          id: job.jobCardId || '',
          jobNo: job.jobCardId || '',
          companyId: companyId,
          vehicleNo: job.vehicleNumber || '',
          customerName: job.customerName || '', // Not present in API response, keeping empty string
          mobile: job.mobileNumber || '',
          kmReading: String(job.kmReading || ''),
          carMake: job.carMake || '',
          carModel: job.carModel || '',
          carYear: job.carYear || undefined,
          jobDescriptions: transformedJobDescriptions,
          status: job.status || 'PENDING',
          createdBy: job.createdBy || currentUser.id,
          createdAt: job.createdOn ? new Date(job.createdOn) : new Date(),
          updatedAt: job.updatedOn ? new Date(job.updatedOn) : new Date(),
        };
      });

      setJobs(transformedJobs);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
      setJobs([]);
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
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                My Job Cards
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                All job cards created by you
              </p>
            </div>
                <Link
                  to="/jobs/create"
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Create New Job
                </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 shadow-md">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
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
          <div className="overflow-hidden rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 shadow-2xl border border-white/20 dark:border-zinc-700/50">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                    Job No
                  </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                        Vehicle No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                        Mobile
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">
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
                            className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                          >
                            View →
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

