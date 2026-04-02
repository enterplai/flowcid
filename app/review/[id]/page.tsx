import { createAdminClient } from '@/lib/supabase/admin';
import NavBar from '@/components/NavBar';
import { notFound } from 'next/navigation';
import ClinicianReviewForm from '@/components/ClinicianReviewForm';

export const dynamic = 'force-dynamic';

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: encounter, error } = await admin
    .from('encounter_submissions')
    .select(`
      *,
      form_sessions ( event_name, patient_name, status ),
      extraction_fields ( * ),
      clinician_reviews ( * ),
      clinical_notes ( * )
    `)
    .eq('id', id)
    .single();

  if (error || !encounter) return notFound();

  const review = encounter.clinician_reviews?.[0];
  const clinicalNote = encounter.clinical_notes?.[0];
  const extractionFields = encounter.extraction_fields || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600 font-medium mb-1">
              📍 {encounter.form_sessions?.event_name}
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              {encounter.first_name} {encounter.last_name}
            </h1>
            <p className="text-slate-500 text-sm">
              DOB: {encounter.date_of_birth ? new Date(encounter.date_of_birth).toLocaleDateString() : '—'} ·
              Source: {encounter.source === 'qr_form' ? '📱 QR Digital Form' : '📄 Paper Scan (AI Extracted)'} ·
              Submitted: {new Date(encounter.created_at).toLocaleString()}
            </p>
          </div>
          <StatusBadge status={review?.status || 'pending'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient data */}
          <div className="lg:col-span-2 space-y-4">
            {/* If paper scan, show AI extraction confidence */}
            {extractionFields.length > 0 && (
              <div className="bg-white rounded-xl border border-blue-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-blue-600">🤖</span>
                  <h2 className="font-semibold text-slate-900">AI Extracted Fields</h2>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Review carefully</span>
                </div>
                <div className="space-y-2">
                  {extractionFields.map((f: any) => (
                    <ExtractionField key={f.id} field={f} />
                  ))}
                </div>
              </div>
            )}

            {/* Demographics */}
            <DataSection title="Demographics">
              <DataGrid>
                <DataItem label="First Name" value={encounter.first_name} />
                <DataItem label="Last Name" value={encounter.last_name} />
                <DataItem label="Date of Birth" value={encounter.date_of_birth ? new Date(encounter.date_of_birth).toLocaleDateString() : null} />
                <DataItem label="Gender" value={encounter.gender} />
                <DataItem label="Phone" value={encounter.phone} />
                <DataItem label="Email" value={encounter.email} />
                <DataItem label="Language" value={encounter.primary_language} />
              </DataGrid>
              {encounter.address && (
                <DataItem label="Address" value={`${encounter.address}, ${encounter.city || ''} ${encounter.state || ''} ${encounter.zip || ''}`.trim()} />
              )}
            </DataSection>

            {/* Medical history */}
            <DataSection title="Medical History">
              <DataGrid>
                <DataItem label="Blood Thinners" value={encounter.has_blood_thinner ? '⚠️ Yes' : 'No'} highlight={encounter.has_blood_thinner} />
                <DataItem label="Hepatitis B" value={encounter.has_hepatitis_b ? 'Yes' : encounter.has_hepatitis_b === false ? 'No' : '—'} />
                <DataItem label="Hepatitis C" value={encounter.has_hepatitis_c ? 'Yes' : encounter.has_hepatitis_c === false ? 'No' : '—'} />
                <DataItem label="HIV" value={encounter.has_hiv ? 'Yes' : encounter.has_hiv === false ? 'No' : '—'} />
                <DataItem label="Diabetes" value={encounter.has_diabetes ? 'Yes' : encounter.has_diabetes === false ? 'No' : '—'} />
                <DataItem label="Hypertension" value={encounter.has_hypertension ? 'Yes' : encounter.has_hypertension === false ? 'No' : '—'} />
                <DataItem label="Liver Disease" value={encounter.has_liver_disease ? 'Yes' : encounter.has_liver_disease === false ? 'No' : '—'} />
              </DataGrid>
              {(encounter.medical_conditions?.length > 0) && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-500 mb-1">Other Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {encounter.medical_conditions.map((c: string) => (
                      <span key={c} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {encounter.medications && <DataItem label="Medications" value={encounter.medications} />}
              {encounter.allergies && <DataItem label="Allergies" value={encounter.allergies} />}
            </DataSection>
          </div>

          {/* Clinician review panel */}
          <div className="space-y-4">
            <ClinicianReviewForm
              encounterId={encounter.id}
              reviewId={review?.id}
              currentStatus={review?.status || 'pending'}
              existingNotes={clinicalNote}
              reviewNotes={review?.review_notes}
              reviewerInitials={review?.reviewer_initials}
              reviewerName={review?.reviewer_name}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    needs_correction: 'bg-orange-100 text-orange-700 border-orange-200',
  };
  return (
    <span className={`text-sm px-3 py-1 rounded-full font-medium border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function DataSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DataGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>;
}

function DataItem({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`text-sm ${highlight ? 'text-red-600 font-semibold' : 'text-slate-800'}`}>
        {value || '—'}
      </p>
    </div>
  );
}

function ExtractionField({ field }: { field: any }) {
  const score = field.confidence_score;
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 90 ? 'text-green-700' : pct >= 70 ? 'text-amber-700' : 'text-red-700';

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${pct < 70 ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
      <div>
        <p className="text-xs font-medium text-slate-600">{field.field_name}</p>
        <p className="text-sm text-slate-900">{field.clinician_override || field.extracted_value || '—'}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-medium ${textColor}`}>{pct}%</span>
      </div>
    </div>
  );
}
