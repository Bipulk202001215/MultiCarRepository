import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createJobApi, updateJobApi, getJobsByCompanyId } from '@/lib/apiClient';
import { ServiceType, JobDescription, JobStatus } from '@/lib/types';

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

export default function CreateJobPage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId?: string }>();
  const { currentUser, userData, userCompany } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isViewMode = !!jobId;

  // Form state
  const [vehicleNo, setVehicleNo] = useState('');
  const [mobile, setMobile] = useState('');
  const [kmReading, setKmReading] = useState('');

  // Job descriptions - start with 4 rows for new jobs, will be populated from API when viewing existing job
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>(
    Array(4).fill(null).map(() => ({ ...INITIAL_JOB_DESCRIPTION }))
  );

  // Load job data if in view mode
  useEffect(() => {
    if (jobId && currentUser && userCompany) {
      loadJobData(jobId);
    }
  }, [jobId, currentUser, userCompany]);

  const loadJobData = async (id: string) => {
    try {
      setLoadingJob(true);
      const companyId = userCompany?.id || userData?.companyId;
      if (!companyId) {
        setError('Company ID not found');
        return;
      }

      const jobs = await getJobsByCompanyId(companyId);
      const job = jobs.find((j: any) => j.jobCardId === id);

      if (job) {
        // Populate all form fields from API response
        setVehicleNo(job.vehicleNumber || '');
        setMobile(job.mobileNumber || '');
        setKmReading(String(job.kmReading || ''));
        
        // Load job descriptions - only rows with data
        const apiJobDescriptions = job.jobDetailId?.jobDescription || [];
        const transformedDescriptions: JobDescription[] = apiJobDescriptions
          .filter((desc: any) => desc.description && desc.description.trim()) // Only include rows with description
          .map((desc: any) => ({
            serviceType: desc.serviceType ? (desc.serviceType.charAt(0) + desc.serviceType.slice(1).toLowerCase()) as ServiceType : 'Periodic',
            description: desc.description || '',
            assignedMechanicType: desc.assignedMechanicType || '',
            estimatedTime: desc.estimatedTime || '',
          }));

        setJobDescriptions(transformedDescriptions);
      } else {
        setError('Job not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load job data');
    } finally {
      setLoadingJob(false);
    }
  };

  const handleVehicleNoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setVehicleNo(value);
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

  const addJobDescriptionRow = () => {
    setJobDescriptions([...jobDescriptions, { ...INITIAL_JOB_DESCRIPTION }]);
  };

  const deleteJobDescriptionRow = (index: number) => {
    const updated = jobDescriptions.filter((_, i) => i !== index);
    setJobDescriptions(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log('🚀 handleSubmit called - Submit button clicked!');
    setError('');
    setSuccess('');

    // Validate all required fields
    if (!vehicleNo.trim()) {
      setError('Vehicle Number is required');
      return;
    }
    if (!kmReading.trim()) {
      setError('KM Reading is required');
      return;
    }
    if (!mobile.trim()) {
      setError('Mobile is required');
      return;
    }

    // Validate at least one job description with Service Type and Description
    const validJobDescriptions = jobDescriptions.filter(
      (job) => job.serviceType && job.description.trim()
    );

    if (validJobDescriptions.length === 0) {
      setError('At least one job description with Service Type and Description is required');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Starting API call process...');
      
      // Prepare job data for API (matching the expected API structure)
      const currentDate = new Date();
      const estimatedDelivery = new Date(currentDate);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 2); // 2 days from now
      
      // Map job descriptions to the API format (only include rows with Service Type and Description)
      const jobDescriptionArray = jobDescriptions
        .filter((jobDesc) => jobDesc.serviceType && jobDesc.description.trim())
        .map((jobDesc) => ({
          serviceType: jobDesc.serviceType?.toUpperCase() || 'PERIODIC',
          description: jobDesc.description || '',
          assignedMechanicType: jobDesc.assignedMechanicType || '',
          estimatedTime: jobDesc.estimatedTime || '',
        }));

      const jobData = {
        vehicleNumber: vehicleNo.trim() || '',
        kmReading: kmReading.trim() ? parseInt(kmReading.trim(), 10) : 0,
        mobileNumber: mobile.trim() || '',
        jobDate: currentDate.toISOString(),
        status: 'PENDING',
        checkinTime: currentDate.toISOString(),
        estimatedDelivery: estimatedDelivery.toISOString(),
        companyId: userCompany?.id || userData?.companyId || '',
        jobDescription: jobDescriptionArray,
      };

      // Call API to create or update job
      if (jobId) {
        // Update existing job (view mode)
        console.log('🔄 Calling PUT /jobs/' + jobId + ' API with data:', jobData);
        const apiResponse = await updateJobApi(jobId, jobData);
        console.log('✅ Job updated via API:', apiResponse);
        setSuccess('Job card updated successfully!');
      } else {
        // Create new job
        console.log('🔄 Calling POST /jobs API with data:', jobData);
        const apiResponse = await createJobApi(jobData);
        console.log('✅ Job created via API:', apiResponse);
        setSuccess('Job card submitted successfully!');
      }

      // Redirect to jobs list after successful submission/update
      setTimeout(() => {
        navigate('/jobs/list');
      }, 2000);
    } catch (err: any) {
      console.error('❌ Error creating job:', err);
      setError(err.message || 'Failed to create job card');
    } finally {
      setLoading(false);
    }
  };

  if (loadingJob) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-zinc-600 dark:text-zinc-400">Loading job data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                {isViewMode ? 'View Job Card' : 'Quick Check-in'}
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                {isViewMode ? 'View job card details' : 'Create a new job card for vehicle service'}
              </p>
            </div>
            {isViewMode && (
              <button
                type="button"
                onClick={() => navigate(`/jobs/${jobId}/view`)}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                View Job Card
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 shadow-md">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 shadow-md">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {success}
              </p>
            </div>
          )}

          <form
            onSubmit={(e) => {
              console.log('📝 Form onSubmit triggered');
              handleSubmit(e);
            }}
            className="space-y-6 rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 p-6 md:p-8 shadow-2xl border border-white/20 dark:border-zinc-700/50"
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
                    KM Reading
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
                    Mobile
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
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-zinc-200 dark:border-zinc-700">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800">
                      <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Service Type
                      </th>
                      <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Description
                      </th>
                      <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Assigned Mechanic Type
                      </th>
                      <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Estimated Time
                      </th>
                      <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobDescriptions.map((job, index) => (
                        <tr key={index} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">
                          <select
                            value={job.serviceType}
                            onChange={(e) =>
                              updateJobDescription(
                                index,
                                'serviceType',
                                e.target.value as ServiceType
                              )
                            }
                            className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {SERVICE_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">
                          <input
                            type="text"
                            value={job.description}
                            onChange={(e) =>
                              updateJobDescription(index, 'description', e.target.value)
                            }
                            className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Describe the work needed"
                          />
                        </td>
                        <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">
                          <select
                            value={job.assignedMechanicType || ''}
                            onChange={(e) =>
                              updateJobDescription(
                                index,
                                'assignedMechanicType',
                                e.target.value
                              )
                            }
                            className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select Type</option>
                            <option value="Senior">Senior</option>
                            <option value="Junior">Junior</option>
                          </select>
                        </td>
                        <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">
                          <input
                            type="text"
                            value={job.estimatedTime || ''}
                            onChange={(e) =>
                              updateJobDescription(index, 'estimatedTime', e.target.value)
                            }
                            className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="2 hours"
                          />
                        </td>
                        <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => deleteJobDescriptionRow(index)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete row"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={addJobDescriptionRow}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-lg font-bold">+</span>
                  <span>Add Row</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
                <div className="flex gap-4 border-t border-zinc-200 dark:border-zinc-700 pt-6">
                  {isViewMode ? (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {loading ? 'Updating...' : 'Update'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={loading}
                        className="rounded-xl bg-zinc-200 dark:bg-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {loading ? 'Saving...' : 'Save as Draft'}
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        onClick={(e) => {
                          console.log('🖱️ Submit button clicked');
                        }}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {loading ? 'Submitting...' : 'Submit'}
                      </button>
                    </>
                  )}
                </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
