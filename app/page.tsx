import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import NavBar from '@/components/NavBar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  // Fetch summary metrics
  const [{ count: totalForms }, { count: pendingReviews }, { count: approvedToday }] = await Promise.all([
    admin.from('form_sessions').select('*', { count: 'exact', head: true }),
    admin.from('clinician_reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('clinician_reviews').select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('reviewed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ]);

  // Recent encounters
  const { data: recentSessions } = await admin
    .from('form_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  // Pending reviews
  const { data: pendingList } = await admin
    .from('clinician_reviews')
    .select('*, encounter_submissions(*, form_sessions(event_name, patient_name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.email}</p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <MetricCard
            label="Total Form Sessions"
            value={totalForms ?? 0}
            icon="📋"
            color="blue"
          />
          <MetricCard
            label="Pending Reviews"
            value={pendingReviews ?? 0}
            icon="⏳"
            color="amber"
            urgent={Number(pendingReviews) > 0}
          />
          <MetricCard
            label="Approved Today"
            value={approvedToday ?? 0}
            icon="✅"
            color="green"
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link
            href="/qr"
            className="flex items-center gap-3 bg-blue-600 text-white rounded-xl p-4 hover:bg-blue-700 transition-colors"
          >
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-semibold text-sm">Generate QR Form</p>
              <p className="text-blue-200 text-xs">Create patient intake link</p>
            </div>
          </Link>
          <Link
            href="/review"
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
          >
            <span className="text-2xl">🔍</span>
            <div>
              <p className="font-semibold text-sm text-slate-900">Review Queue</p>
              <p className="text-slate-500 text-xs">{pendingReviews ?? 0} awaiting review</p>
            </div>
          </Link>
          <Link
            href="/portal"
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
          >
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-semibold text-sm text-slate-900">View Portal</p>
              <p className="text-slate-500 text-xs">Metrics & extraction results</p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent sessions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Recent Form Sessions</h2>
            {!recentSessions || recentSessions.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No form sessions yet. <Link href="/qr" className="text-blue-600 hover:underline">Create one →</Link></p>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.patient_name || 'Unnamed patient'}</p>
                      <p className="text-xs text-slate-400">{s.event_name} · {new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending reviews */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Pending Reviews</h2>
            {!pendingList || pendingList.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No pending reviews.</p>
            ) : (
              <div className="space-y-3">
                {pendingList.map((r: any) => {
                  const session = r.encounter_submissions?.form_sessions;
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {session?.patient_name || 'Unknown patient'}
                        </p>
                        <p className="text-xs text-slate-400">{session?.event_name || ''} · {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <Link
                        href={`/review/${r.encounter_id}`}
                        className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full hover:bg-amber-100 transition-colors"
                      >
                        Review
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
            {Number(pendingReviews) > 5 && (
              <Link href="/review" className="block text-center text-sm text-blue-600 hover:underline mt-3">
                View all {pendingReviews} pending →
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon, color, urgent }: {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'amber' | 'green';
  urgent?: boolean;
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
  };
  return (
    <div className={`bg-white rounded-xl border p-6 ${urgent ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${colorMap[color]}`}>{label}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    submitted: 'bg-blue-100 text-blue-700',
    reviewing: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}
