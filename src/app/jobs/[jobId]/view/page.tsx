'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getJobCard } from '@/lib/jobService';
import { JobCard } from '@/lib/types';

export default function JobCardViewPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobCard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const loadJob = async () => {
    try {
      setLoading(true);
      const jobData = await getJobCard(jobId);
      
      if (!jobData) {
        setError('Job not found');
        return;
      }

      setJob(jobData);
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
      <ProtectedRoute allowedRoles={['ADMIN', 'SERVICE_ADVISOR', 'MECHANIC']}>
        <DashboardLayout>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-zinc-600 dark:text-zinc-400">Loading job card...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !job) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN', 'SERVICE_ADVISOR', 'MECHANIC']}>
        <DashboardLayout>
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Job not found'}</p>
              <button
                onClick={() => router.back()}
                className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const vehicleType = job.carMake && job.carModel 
    ? `${job.carMake} ${job.carModel}${job.carYear ? ` (${job.carYear})` : ''}`
    : '';

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SERVICE_ADVISOR', 'MECHANIC']}>
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
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
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
                onClick={() => router.back()}
                className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Back
              </button>
            </div>

            {/* Job Card View */}
            <div className="job-card-view">
              <div className="job-card-container bg-white p-10 shadow-lg">
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
                      <div className="font-bold text-xs mb-1 text-black">NAME:</div>
                      <div className="border-b border-black min-h-[20px] pb-1 text-sm text-black">
                        {job.customerName || ''}
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="font-bold text-xs mb-1 text-black">ADDRESS:</div>
                      <div className="border-b border-black min-h-[20px] pb-1 text-sm text-black">
                        
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="font-bold text-xs mb-1 text-black">CONTACT:</div>
                      <div className="border-b border-black min-h-[20px] pb-1 text-sm text-black">
                        {job.mobile || ''}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Section */}
                  <div>
                    <div className="bg-blue-900 text-white px-3 py-2 font-bold text-sm uppercase mb-3">
                      VEHICLE
                    </div>
                    <div className="mb-4">
                      <div className="font-bold text-xs mb-1 text-black">TYPE:</div>
                      <div className="border-b border-black min-h-[20px] pb-1 text-sm text-black">
                        {vehicleType || ''}
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="font-bold text-xs mb-1 text-black">REG NO:</div>
                      <div className="border-b border-black min-h-[20px] pb-1 text-sm text-black">
                        {job.vehicleNo || ''}
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="font-bold text-xs mb-1 text-black">ENGINE NO:</div>
                      <div className="border-b border-black min-h-[20px] pb-1 text-sm text-black">
                        
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
                      {job.jobDescriptions && job.jobDescriptions.length > 0 ? (
                        job.jobDescriptions.map((desc, index) => (
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
                      ) : (
                        Array.from({ length: 10 }).map((_, index) => (
                          <tr key={index}>
                            <td className="border border-black p-2 text-xs text-black h-6"></td>
                            <td className="border border-black p-2 text-xs text-black h-6"></td>
                            <td className="border border-black p-2 text-xs text-black h-6"></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Labour Charges Section */}
                <div className="mt-6">
                  <div className="bg-blue-900 text-white px-3 py-2 font-bold text-sm uppercase mb-3 inline-block">
                    LABOUR CHARGES
                  </div>
                  <table className="w-full border-collapse border border-black mt-3">
                    <thead>
                      <tr>
                        <th className="border border-black p-2 text-left text-xs font-bold bg-gray-100" style={{ width: '50%' }}>
                          Description
                        </th>
                        <th className="border border-black p-2 text-left text-xs font-bold bg-gray-100" style={{ width: '25%' }}>
                          Mechanic Type
                        </th>
                        <th className="border border-black p-2 text-left text-xs font-bold bg-gray-100" style={{ width: '25%' }}>
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.jobDescriptions && job.jobDescriptions.length > 0 ? (
                        job.jobDescriptions
                          .filter(desc => desc.assignedMechanicType || desc.description)
                          .map((desc, index) => (
                            <tr key={index}>
                              <td className="border border-black p-2 text-xs text-black">
                                {desc.description || ''}
                              </td>
                              <td className="border border-black p-2 text-xs text-black">
                                {desc.assignedMechanicType || ''}
                              </td>
                              <td className="border border-black p-2 text-xs text-black">
                                
                              </td>
                            </tr>
                          ))
                      ) : (
                        Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index}>
                            <td className="border border-black p-2 text-xs text-black h-6"></td>
                            <td className="border border-black p-2 text-xs text-black h-6"></td>
                            <td className="border border-black p-2 text-xs text-black h-6"></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

