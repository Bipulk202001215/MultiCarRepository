'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getJobCard, searchVehicle } from '@/lib/jobService';
import { updateJobApi } from '@/lib/apiClient';
import { ServiceType, JobDescription, JobStatus, CreateJobCardData, JobCard } from '@/lib/types';

const SERVICE_TYPES: ServiceType[] = [
  'Periodic',
  'Repair',
  'AC',
  'Tires',
  'Paint',
  'Bodywork',
  'Electrical',
  'Engine',
  'Other',
];

const INITIAL_JOB_DESCRIPTION: JobDescription = {
  serviceType: 'Periodic',
  description: '',
  assignedMechanicType: '',
  estimatedTime: '',
};

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentJob, setCurrentJob] = useState<JobCard | null>(null);

  // Form state
  const [vehicleNo, setVehicleNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [kmReading, setKmReading] = useState('');
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState<number | ''>('');
  const [status, setStatus] = useState<JobStatus>('DRAFT');

  // Job descriptions (10 rows)
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>(
    Array(10).fill(null).map(() => ({ ...INITIAL_JOB_DESCRIPTION }))
  );

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const loadJob = async () => {
    try {
      setLoading(true);
      const job = await getJobCard(jobId);
      
      if (!job) {
        setError('Job not found');
        return;
      }

      // Store the full job data for printing
      setCurrentJob(job);

      // Populate form with job data
      setVehicleNo(job.vehicleNo || '');
      setCustomerName(job.customerName || '');
      setMobile(job.mobile || '');
      setKmReading(job.kmReading || '');
      setCarMake(job.carMake || '');
      setCarModel(job.carModel || '');
      setCarYear(job.carYear || '');
      setStatus(job.status);

      // Populate job descriptions (pad to 10 if needed)
      const descriptions = [...job.jobDescriptions];
      while (descriptions.length < 10) {
        descriptions.push({ ...INITIAL_JOB_DESCRIPTION });
      }
      setJobDescriptions(descriptions.slice(0, 10));

      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleNoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVehicleNo(value);

    // Auto-fill car details if vehicle exists
    if (value.length > 0) {
      try {
        const vehicleData = await searchVehicle(value);
        if (vehicleData) {
          if (vehicleData.make) setCarMake(vehicleData.make);
          if (vehicleData.model) setCarModel(vehicleData.model);
          if (vehicleData.year) setCarYear(vehicleData.year);
        }
      } catch (err) {
        // Vehicle not found, continue
      }
    }
  };

  const updateJobDescription = (
    index: number,
    field: keyof JobDescription,
    value: string
  ) => {
    const updated = [...jobDescriptions];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setJobDescriptions(updated);
  };

  const handleSubmit = async (e: FormEvent | MouseEvent, submitStatus?: JobStatus) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const finalStatus = submitStatus || status;

    // For DRAFT: only one field needs to be present
    if (finalStatus === 'DRAFT') {
      const hasAnyField = 
        vehicleNo.trim() ||
        customerName.trim() ||
        mobile.trim() ||
        kmReading.trim() ||
        carMake.trim() ||
        carModel.trim() ||
        carYear ||
        jobDescriptions.some((job) => 
          job.serviceType || job.description.trim() || job.assignedMechanicType || job.estimatedTime
        );
      
      if (!hasAnyField) {
        setError('At least one field must be filled to save as draft');
        return;
      }
    } else {
      // For SUBMITTED: validate required fields
      if (!customerName.trim()) {
        setError('Customer Name is required');
        return;
      }
      if (!mobile.trim()) {
        setError('Mobile is required');
        return;
      }
      if (!kmReading.trim()) {
        setError('KM Reading is required');
        return;
      }

      // Validate at least one job description with service type and description
      const hasValidJob = jobDescriptions.some(
        (job) => job.serviceType && job.description.trim()
      );
      if (!hasValidJob) {
        setError('At least one job description with Service Type and Description is required');
        return;
      }
    }

    if (!currentUser) {
      setError('You must be logged in to update a job card');
      return;
    }

    setSaving(true);

    try {
      // For draft: include all job descriptions (even empty ones)
      // For submitted: filter out empty job descriptions
      const validJobDescriptions = finalStatus === 'DRAFT'
        ? jobDescriptions.filter(
            (job) => job.serviceType || job.description.trim() || job.assignedMechanicType || job.estimatedTime
          )
        : jobDescriptions.filter(
            (job) => job.serviceType && job.description.trim()
          );

      // When submitting, change status from SUBMITTED to PENDING for the board
      const updateStatus = finalStatus === 'SUBMITTED' ? 'PENDING' : finalStatus;

      const updateData: Partial<CreateJobCardData> = {
        vehicleNo: vehicleNo.trim() || undefined,
        customerName: customerName.trim() || undefined,
        mobile: mobile.trim() || undefined,
        kmReading: kmReading.trim() || undefined,
        carMake: carMake.trim() || undefined,
        carModel: carModel.trim() || undefined,
        carYear: typeof carYear === 'number' ? carYear : undefined,
        jobDescriptions: validJobDescriptions,
        status: updateStatus,
      };

      // Use API to update job
      await updateJobApi(jobId, updateData);

      setStatus(updateStatus);
      setSuccess(
        `Job card updated successfully!`
      );

      // Reload job to get updated data
      await loadJob();

      // For submitted: redirect to jobs list
      if (finalStatus === 'SUBMITTED') {
        setTimeout(() => {
          router.push('/jobs/list');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error updating job card:', err);
      setError(err.message || 'Failed to update job card');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN', 'SERVICE_ADVISOR']}>
        <DashboardLayout>
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-zinc-600 dark:text-zinc-400">Loading job...</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SERVICE_ADVISOR']}>
      <DashboardLayout>
        <div className="p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                  Edit Job Card
                </h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  Update job card details
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/jobs/${jobId}/view`)}
                className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                View Job Card
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  {success}
                </p>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(e, status);
              }}
              className="space-y-6 rounded-lg bg-white dark:bg-zinc-900 p-6 shadow"
            >
              {/* Vehicle Information */}
              <div>
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Vehicle Information
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Vehicle No
                    </label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={handleVehicleNoChange}
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="ABC1234"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      KM Reading <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-zinc-500">(Required for Submit)</span>
                    </label>
                    <input
                      type="text"
                      value={kmReading}
                      onChange={(e) => setKmReading(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="50000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Car Make
                    </label>
                    <input
                      type="text"
                      value={carMake}
                      onChange={(e) => setCarMake(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Toyota"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Car Model
                    </label>
                    <input
                      type="text"
                      value={carModel}
                      onChange={(e) => setCarModel(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Camry"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Year
                    </label>
                    <input
                      type="number"
                      value={carYear}
                      onChange={(e) =>
                        setCarYear(e.target.value ? parseInt(e.target.value) : '')
                      }
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="2020"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Customer Information
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Customer Name <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-zinc-500">(Required for Submit)</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Mobile <span className="text-red-500">*</span>
                      <span className="ml-2 text-xs text-zinc-500">(Required for Submit)</span>
                    </label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              </div>

              {/* Job Description Section */}
              <div>
                <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                  Job Description
                </h2>
                <div className="space-y-4">
                  {jobDescriptions.map((job, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4"
                    >
                      <div className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Job {index + 1}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Service Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={job.serviceType}
                            onChange={(e) =>
                              updateJobDescription(
                                index,
                                'serviceType',
                                e.target.value as ServiceType
                              )
                            }
                            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {SERVICE_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Description
                          </label>
                          <input
                            type="text"
                            value={job.description}
                            onChange={(e) =>
                              updateJobDescription(index, 'description', e.target.value)
                            }
                            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Describe the work needed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Assigned Mechanic Type
                          </label>
                          <select
                            value={job.assignedMechanicType || ''}
                            onChange={(e) =>
                              updateJobDescription(
                                index,
                                'assignedMechanicType',
                                e.target.value
                              )
                            }
                            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select Type</option>
                            <option value="Senior">Senior</option>
                            <option value="Junior">Junior</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            Estimated Time
                          </label>
                          <input
                            type="text"
                            value={job.estimatedTime || ''}
                            onChange={(e) =>
                              updateJobDescription(index, 'estimatedTime', e.target.value)
                            }
                            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="2 hours"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as JobStatus)}
                  className="block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="QC_CHECK">QC Check</option>
                  <option value="READY">Ready</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 border-t border-zinc-200 dark:border-zinc-700 pt-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(e, 'DRAFT');
                  }}
                  disabled={saving}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Updating...' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'SUBMITTED')}
                  disabled={saving}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

