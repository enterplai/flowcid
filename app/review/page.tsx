import { createAdminClient } from '@/lib/supabase/admin';
import NavBar from '@/components/NavBar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ReviewQueuePage() {
  const admin = createAdminClient();

  const { data: reviews } = await admin
    .from('clinician_reviews')
    .select(`
      id,
      status,
      created_at,
      reviewed_at,
      encounter_submissions (
        id,
        first_name,
        last_name,
        date_of_birth,
        source,
        created_at,
        form_sessions ( event_name, patient_name )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  const pending = reviews?.filter(r => r.status === 'pending') || [];
  const completed = reviews?.filter(r => r.status !== 'pending') || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Review Queue</h1>
          <p className="text-slate-500 text-sm mt-1">
            Patient submissions awaiting clinician review and approval
          </p>
        </div>

        {pending.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-amber-600">⚠️</span>
            <p className="text-sm text-amber-800 font-medium">{pending.length} submission{pending.length !== 1 ? 's' : ''} pending review</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Pending */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Pending Review</h2>
            {pending.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                No pending reviews. All caught up! 🎉
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map((r: any) => (
                  <ReviewRow key={r.id} review={r} />
                ))}
              </div>
            )}
          </section>

          {/* Completed */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Completed</h2>
              <div className="space-y-2">
                {completed.map((r: any) => (
                  <ReviewRow key={r.id} review={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function ReviewRow({ review }: { review: any }) {
  const enc = review.encounter_submissions;
  const session = enc?.form_sessions;
  const name = enc ? `${enc.first_name || ''} ${enc.last_name || ''}`.trim() || 'Unnamed' : 'Unknown';
  const dob = enc?.date_of_birth ? new Date(enc.date_of_birth).toLocaleDateString() : '—';

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    needs_correction: 'bg-orange-100 text-orange-700',
  };

  return (
    <Link
      href={`/review/${enc?.id}`}
      className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-slate-900 text-sm">{name}</p>
          <p className="text-xs text-slate-400">
            DOB: {dob} · {session?.event_name || '—'} · {enc?.source === 'qr_form' ? '📱 QR Form' : '📄 Paper Scan'}
          </p>
          <p className="text-xs text-slate-400">Submitted {new Date(enc?.created_at).toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[review.status] || 'bg-slate-100 text-slate-600'}`}>
          {review.status}
        </span>
        <span className="text-slate-400 group-hover:text-blue-600 transition-colors">→</span>
      </div>
    </Link>
  );
}
