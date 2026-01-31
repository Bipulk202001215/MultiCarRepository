import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getJobsByCompanyId, getCompletedJobsByCompanyId } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { getCompanyConfig } from '@/lib/companyConfigService';

export default function JobCardViewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { userCompany, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [companyConfig, setCompanyConfig] = useState<any>(null);

  useEffect(() => {
    if (jobId && userCompany) {
      loadJob();
      loadCompanyConfig();
    }
  }, [jobId, userCompany]);

  const loadCompanyConfig = async () => {
    try {
      const config = await getCompanyConfig();
      setCompanyConfig(config);
    } catch (err) {
      console.error('Failed to load company config:', err);
    }
  };

  const loadJob = async () => {
    try {
      setLoading(true);
      const companyId = userCompany?.id || userData?.companyId;
      if (!companyId) {
        setError('Company ID not found');
        return;
      }

      let jobs = await getJobsByCompanyId(companyId);
      let foundJob = jobs.find((j: any) => j.jobCardId === jobId);
      // If not found (e.g. completed jobs), try completed jobs API so view shows all entries prefilled
      if (!foundJob) {
        const completedJobs = await getCompletedJobsByCompanyId(companyId);
        foundJob = completedJobs.find((j: any) => j.jobCardId === jobId);
      }

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
  const customerName = job.customerName || '';
  const jobNo = job.jobCardId || jobId || '';
  const jobStatus = job.status || '';
  const jobCreated = job.createdOn ? new Date(job.createdOn).toLocaleDateString() : '';

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
          <div className="flex style={{ marginBottom: '10px', marginLeft: '10px' }}
          no-print">
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
              {/* Logo left, Company name & GSTIN right (same alignment) */}
              <div className="flex justify-between items-start w-full mb-0">
                <div className="flex flex-col items-start" style={{ marginTop: '-36px' }}>
                  <img 
                    src="/autonation-logo.svg" 
                    alt="24X7 AutoNation Logo" 
                    className="h-32 w-auto object-contain"
                    style={{ maxHeight: '128px' }}
                  />
                  <div className="text-sm text-black font-semibold" style={{ marginTop: '-38px', marginLeft: '10px' }}>
                    Mobile: {companyConfig?.phone || '86268-16424'}
                  </div>
                </div>
                <div className="flex flex-col items-end text-right text-black">
                  <div className="text-lg font-semibold">{companyConfig?.name || '24X7 AutoNation'}</div>
                  <div className="text-sm mt-1">GSTIN: {companyConfig?.gstin || '02LSNPS6493R1ZC'}</div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-center text-3xl font-bold uppercase underline mb-8 text-black -mt-4">
                JOB CARD
              </h1>

              {/* Job No / Status / Created - same as table entries */}
              {(jobNo || jobStatus || jobCreated) && (
                <div className="grid grid-cols-3 gap-4 mb-6 text-sm text-black">
                  {jobNo && <div><span className="font-bold">Job No:</span> {jobNo}</div>}
                  {jobStatus && <div><span className="font-bold">Status:</span> {jobStatus}</div>}
                  {jobCreated && <div><span className="font-bold">Created:</span> {jobCreated}</div>}
                </div>
              )}

              {/* Customer and Vehicle Information - prefilled as per table */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                {/* Customer Section */}
                <div>
                  <div className="bg-blue-900 text-white px-3 py-2 font-bold text-sm uppercase mb-3">
                    CUSTOMER
                  </div>
                  {customerName && (
                    <div className="mb-4">
                      <div className="font-bold text-xs mb-1 text-black">NAME:</div>
                      <div className="border-b border-black min-h-[20px] pb-1 text-sm text-black">
                        {customerName}
                      </div>
                    </div>
                  )}
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
                      {/* <th className="border border-black p-2 text-left text-xs font-bold bg-gray-100" style={{ width: '25%' }}>
                        Estimated Time
                      </th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {jobDescriptions && jobDescriptions.length > 0
                      ? jobDescriptions.map((desc: any, index: number) => (
                            <tr key={index}>
                              <td className="border border-black p-2 text-xs text-black">
                                {desc.description || ''}
                              </td>
                              <td className="border border-black p-2 text-xs text-black">
                                {desc.serviceType || ''}
                              </td>
                              {/* <td className="border border-black p-2 text-xs text-black">
                                {desc.estimatedTime || ''}
                              </td> */}
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
