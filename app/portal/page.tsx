import { createAdminClient } from '@/lib/supabase/admin';
import NavBar from '@/components/NavBar';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PortalPage() {
  const admin = createAdminClient();

  // Aggregate metrics
  const [
    { count: totalSubmissions },
    { count: approvedCount },
    { count: pendingCount },
    { count: qrFormCount },
    { data: recentApprovals },
    { data: allEncounters },
  ] = await Promise.all([
    admin.from('encounter_submissions').select('*', { count: 'exact', head: true }),
    admin.from('clinician_reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    admin.from('clinician_reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('encounter_submissions').select('*', { count: 'exact', head: true }).eq('source', 'qr_form'),
    admin.from('clinician_reviews')
      .select('reviewed_at, encounter_submissions(first_name, last_name, form_sessions(event_name))')
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .limit(10),
    admin.from('encounter_submissions')
      .select('id, first_name, last_name, source, created_at, form_sessions(event_name), clinician_reviews(status, reviewer_initials, reviewed_at)')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const approvalRate = totalSubmissions ? Math.round((Number(approvedCount) / Number(totalSubmissions)) * 100) : 0;
  // Estimate time saved: avg 45 min saved per encounter (30 min Formstack + 15 min other)
  const timeSavedHours = Math.round((Number(approvedCount) * 45) / 60);

  // Group by event
  const eventMap: Record<string, number> = {};
  (allEncounters || []).forEach((e: any) => {
    const event = e.form_sessions?.event_name || 'Unknown';
    eventMap[event] = (eventMap[event] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Client Portal</h1>
          <p className="text-slate-500 text-sm mt-1">
            Extraction results, approval tracking, and documentation metrics
          </p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <KPICard label="Total Encounters" value={totalSubmissions ?? 0} unit="" color="blue" icon="📋" />
          <KPICard label="Approved" value={approvedCount ?? 0} unit="" color="green" icon="✅" />
          <KPICard label="Approval Rate" value={approvalRate} unit="%" color="purple" icon="📈" />
          <KPICard label="Est. Time Saved" value={timeSavedHours} unit="hrs" color="teal" icon="⏱️" />
        </div>

        {/* Sub-metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500 mb-3">Source Breakdown</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">📱 QR Digital Forms</span>
                <span className="font-semibold text-slate-900">{qrFormCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">📄 Paper Scan (AI)</span>
                <span className="font-semibold text-slate-900">{Number(totalSubmissions ?? 0) - Number(qrFormCount ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">⏳ Pending Review</span>
                <span className="font-semibold text-amber-600">{pendingCount ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500 mb-3">Time Savings Estimate</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Per encounter (avg)</span>
                <span className="font-semibold text-slate-900">~45 min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Total approved</span>
                <span className="font-semibold text-slate-900">{approvedCount} encounters</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-2">
                <span className="text-sm font-semibold text-slate-700">Total saved</span>
                <span className="font-bold text-green-600">{timeSavedHours} hrs</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500 mb-3">Events</p>
            <div className="space-y-2">
              {Object.entries(eventMap).slice(0, 5).map(([event, count]) => (
                <div key={event} className="flex justify-between items-center">
                  <span className="text-sm text-slate-700 truncate max-w-[160px]" title={event}>{event}</span>
                  <span className="font-semibold text-slate-900 ml-2">{count}</span>
                </div>
              ))}
              {Object.keys(eventMap).length === 0 && (
                <p className="text-sm text-slate-400">No events yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Veeva integration banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 mb-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔗</span>
                <h2 className="font-semibold">Veeva Clinical Database Integration</h2>
                <span className="text-xs bg-blue-500 text-blue-100 px-2 py-0.5 rounded-full">Coming Soon</span>
              </div>
              <p className="text-blue-100 text-sm max-w-xl">
                Approved encounters can be automatically pushed to Veeva, eliminating the second manual transcription step.
                Gisella is attending the Veeva Summit in May to confirm API access.
              </p>
            </div>
            <span className="text-3xl opacity-50">🏥</span>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="bg-blue-500 bg-opacity-50 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-200">Awaiting</p>
              <p className="text-sm font-semibold">Veeva API access</p>
            </div>
            <div className="bg-blue-500 bg-opacity-50 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-200">Ready to push</p>
              <p className="text-sm font-semibold">{approvedCount} encounters</p>
            </div>
          </div>
        </div>

        {/* All encounters table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Extraction Results</h2>
            <Link href="/review" className="text-sm text-blue-600 hover:underline">View pending reviews →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Patient</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Event</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Review</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!allEncounters || allEncounters.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No encounters yet. <Link href="/qr" className="text-blue-600 hover:underline">Generate a QR form</Link> to get started.
                    </td>
                  </tr>
                ) : (
                  (allEncounters as any[]).map(enc => {
                    const review = enc.clinician_reviews?.[0];
                    return (
                      <tr key={enc.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-800">
                          {enc.first_name} {enc.last_name}
                        </td>
                        <td className="px-6 py-3 text-slate-500">{enc.form_sessions?.event_name || '—'}</td>
                        <td className="px-6 py-3">
                          <span className="text-xs">{enc.source === 'qr_form' ? '📱 QR Form' : '📄 Paper Scan'}</span>
                        </td>
                        <td className="px-6 py-3 text-slate-500 text-xs">{new Date(enc.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-3">
                          <ReviewStatus status={review?.status} initials={review?.reviewer_initials} />
                        </td>
                        <td className="px-6 py-3">
                          <Link href={`/review/${enc.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                            {review?.status === 'approved' ? 'View' : 'Review →'}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function KPICard({ label, value, unit, color, icon }: {
  label: string; value: number; unit: string; color: string; icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}{unit}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function ReviewStatus({ status, initials }: { status?: string; initials?: string }) {
  if (!status) return <span className="text-xs text-slate-400">—</span>;
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    needs_correction: 'bg-orange-100 text-orange-700',
  };
  return (
    <div className="flex items-center gap-1">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-slate-100 text-slate-600'}`}>
        {status}
      </span>
      {initials && <span className="text-xs text-slate-400">by {initials}</span>}
    </div>
  );
}
