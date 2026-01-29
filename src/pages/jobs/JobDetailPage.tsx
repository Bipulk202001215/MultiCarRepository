// TODO: Convert from src/app/jobs/[jobId]/page.tsx
// Use useParams from react-router-dom for jobId
// Replace next/link with react-router-dom Link
// Replace useRouter with useNavigate
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-4">
            Job Detail - {jobId}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            This page needs to be converted from Next.js format. See CONVERSION_SCRIPT.md for instructions.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

