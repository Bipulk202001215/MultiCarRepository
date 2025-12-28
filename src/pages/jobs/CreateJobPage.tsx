import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createJobCard, searchVehicle } from '@/lib/jobService';
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
  const { currentUser, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [vehicleNo, setVehicleNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [kmReading, setKmReading] = useState('');
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState<number | ''>('');

  // Job descriptions (10 rows)
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>(
    Array(10).fill(null).map(() => ({ ...INITIAL_JOB_DESCRIPTION }))
  );

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

  const handleSubmit = async (e: FormEvent, status: JobStatus) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // For DRAFT: only one field needs to be present
    if (status === 'DRAFT') {
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
      setError('You must be logged in to create a job card');
      return;
    }

    setLoading(true);

    try {
      // For draft: include all job descriptions (even empty ones)
      // For submitted: filter out empty job descriptions
      const validJobDescriptions = status === 'DRAFT'
        ? jobDescriptions.filter(
            (job) => job.serviceType || job.description.trim() || job.assignedMechanicType || job.estimatedTime
          )
        : jobDescriptions.filter(
            (job) => job.serviceType && job.description.trim()
          );

      // When submitting, change status from SUBMITTED to PENDING for the board
      const finalStatus = status === 'SUBMITTED' ? 'PENDING' : status;
      
      const jobId = await createJobCard(
        {
          vehicleNo: vehicleNo.trim() || undefined,
          customerName: customerName.trim() || undefined,
          mobile: mobile.trim() || undefined,
          kmReading: kmReading.trim() || undefined,
          carMake: carMake.trim() || undefined,
          carModel: carModel.trim() || undefined,
          carYear: typeof carYear === 'number' ? carYear : undefined,
          jobDescriptions: validJobDescriptions,
          status: finalStatus,
        },
        currentUser.id,
        userData?.companyId || ''
      );

      setSuccess(
        `Job card ${status === 'DRAFT' ? 'saved as draft' : 'submitted'} successfully!`
      );

      // For draft: keep the form data so user can continue editing
      // For submitted: redirect to jobs list
      if (status === 'SUBMITTED') {
        setTimeout(() => {
          navigate('/jobs/list');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create job card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
              Quick Check-in
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Create a new job card for vehicle service
            </p>
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
            onSubmit={(e) => handleSubmit(e, 'SUBMITTED')}
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
                        <input
                          type="text"
                          value={job.assignedMechanicType || ''}
                          onChange={(e) =>
                            updateJobDescription(
                              index,
                              'assignedMechanicType',
                              e.target.value
                            )
                          }
                          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Senior/Junior"
                        />
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

            {/* Action Buttons */}
            <div className="flex gap-4 border-t border-zinc-200 dark:border-zinc-700 pt-6">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, 'DRAFT')}
                disabled={loading}
                className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
