import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getJobsByCompanyId } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';

export default function JobCardViewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { userCompany, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (jobId && userCompany) {
      loadJob();
    }
  }, [jobId, userCompany]);

  const loadJob = async () => {
    try {
      setLoading(true);
      const companyId = userCompany?.id || userData?.companyId;
      if (!companyId) {
        setError('Company ID not found');
        return;
      }

      const jobs = await getJobsByCompanyId(companyId);
      const foundJob = jobs.find((j: any) => j.jobCardId === jobId);

      if (!foundJob) {
        setError('Job not found');
        return;
      }

      setJob(foundJob);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-zinc-600 dark:text-zinc-400">Loading job card...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !job) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Job not found'}</p>
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-2.5 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Go Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const vehicleNumber = job.vehicleNumber || '';
  const kmReading = job.kmReading || '';
  const mobileNumber = job.mobileNumber || '';

  const jobDescriptions = job.jobDetailId?.jobDescription || [];

  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .job-card-view,
          .job-card-view * {
            visibility: visible;
          }
          .job-card-view {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .job-card-container {
            padding: 0;
            margin: 0;
            max-width: 100%;
          }
        }
        @page {
          size: A4;
          margin: 15mm;
        }
      ` }} />
      
      <div className="p-8">
        <div className="mx-auto max-w-4xl">
          {/* Action Buttons - Hidden when printing */}
          <div className="mb-6 flex gap-4 no-print">
            <button
              onClick={handlePrint}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4z"
                  clipRule="evenodd"
                />
              </svg>
              Print Job Card
            </button>
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl bg-zinc-200 dark:bg-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Back
            </button>
          </div>

          {/* Job Card View */}
          <div className="job-card-view">
            <div className="job-card-container bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm p-10 shadow-2xl border border-white/20 dark:border-zinc-700/50 rounded-2xl">
              {/* Title */}
              <h1 className="text-center text-3xl font-bold uppercase underline mb-8 text-black">
                JOB CARD
              </h1>

              {/* Customer and Vehicle Information */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                {/* Customer Section */}
                <div>
                  <div className="bg-blue-900 text-white px-3 py-2 font-bold text-sm uppercase mb-3">
                    CUSTOMER
                  </div>
                  <div className="mb-4">
                    <div className="font-bold text-xs mb-1 text-black">CONTACT:</div>
                    <div className="border-b border-black min-h-[20px] pb-1 text-sm text-black">
                      {mobileNumber}
                    </div>
                  </div>
                </div>

                {/* Vehicle Section */}
                <div>
                  <div className="bg-blue-900 text-white px-3 py-2 font-bold text-sm uppercase mb-3">
                    VEHICLE
                  </div>
                  <div className="mb-4">
                    <div className="font-bold text-xs mb-1 text-black">VEHICLE NUMBER:</div>
                    <div className="border-b border-black min-h-[20px] pb-1 text-sm text-black">
                      {vehicleNumber}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="font-bold text-xs mb-1 text-black">KM READING:</div>
                    <div className="border-b border-black min-h-[20px] pb-1 text-sm text-black">
                      {kmReading}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Instructions Section */}
              <div className="mt-8 mb-6">
                <div className="bg-blue-900 text-white px-3 py-2 font-bold text-sm uppercase mb-3">
                  CUSTOMER INSTRUCTIONS CARRIED OUT
                </div>
                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr>
                      <th className="border border-black p-2 text-left text-xs font-bold bg-gray-100" style={{ width: '50%' }}>
                        Description
                      </th>
                      <th className="border border-black p-2 text-left text-xs font-bold bg-gray-100" style={{ width: '25%' }}>
                        Service Type
                      </th>
                      <th className="border border-black p-2 text-left text-xs font-bold bg-gray-100" style={{ width: '25%' }}>
                        Estimated Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobDescriptions && jobDescriptions.length > 0
                      ? jobDescriptions
                          .filter((desc: any) => desc.description && desc.description.trim())
                          .map((desc: any, index: number) => (
                            <tr key={index}>
                              <td className="border border-black p-2 text-xs text-black">
                                {desc.description || ''}
                              </td>
                              <td className="border border-black p-2 text-xs text-black">
                                {desc.serviceType || ''}
                              </td>
                              <td className="border border-black p-2 text-xs text-black">
                                {desc.estimatedTime || ''}
                              </td>
                            </tr>
                          ))
                      : null}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
