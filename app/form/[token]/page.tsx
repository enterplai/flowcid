import { createAdminClient } from '@/lib/supabase/admin';
import PatientForm from '@/components/PatientForm';

export const dynamic = 'force-dynamic';

export default async function FormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: session, error } = await admin
    .from('form_sessions')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Form Not Found</h1>
          <p className="text-slate-500 text-sm">This QR code link is invalid or has expired. Please ask your clinician to generate a new one.</p>
        </div>
      </div>
    );
  }

  if (session.status === 'submitted' || session.status === 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Form Already Submitted</h1>
          <p className="text-slate-500 text-sm">This form has already been submitted. Your clinician is reviewing your information.</p>
        </div>
      </div>
    );
  }

  const expired = new Date(session.expires_at) < new Date();
  if (expired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link Expired</h1>
          <p className="text-slate-500 text-sm">This QR code has expired. Please ask your clinician to generate a new one.</p>
        </div>
      </div>
    );
  }

  return <PatientForm sessionToken={token} sessionId={session.id} eventName={session.event_name} patientNamePrefill={session.patient_name} />;
}
