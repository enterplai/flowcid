import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/forms/[token] — patient submits their form
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  // Validate session
  const { data: session, error: sessionError } = await admin
    .from('form_sessions')
    .select('id, status, expires_at')
    .eq('token', token)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Invalid form link' }, { status: 404 });
  }
  if (session.status === 'submitted' || session.status === 'approved') {
    return NextResponse.json({ error: 'Form already submitted' }, { status: 409 });
  }
  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Form link expired' }, { status: 410 });
  }

  const body = await request.json();
  const {
    first_name, last_name, date_of_birth, gender, phone, email,
    address, city, state, zip, primary_language,
    has_blood_thinner, medications, allergies, medical_conditions,
    has_hepatitis_b, has_hepatitis_c, has_hiv, has_diabetes, has_hypertension, has_liver_disease,
    consent_given,
  } = body;

  // Insert encounter submission
  const { data: encounter, error: encError } = await admin
    .from('encounter_submissions')
    .insert({
      session_id: session.id,
      source: 'qr_form',
      first_name, last_name, date_of_birth, gender, phone, email,
      address, city, state, zip, primary_language,
      has_blood_thinner, medications, allergies, medical_conditions,
      has_hepatitis_b, has_hepatitis_c, has_hiv, has_diabetes, has_hypertension, has_liver_disease,
      consent_given,
      consent_timestamp: consent_given ? new Date().toISOString() : null,
      raw_data: body,
    })
    .select('id')
    .single();

  if (encError) return NextResponse.json({ error: encError.message }, { status: 500 });

  // Create a pending review record
  await admin.from('clinician_reviews').insert({
    encounter_id: encounter.id,
    status: 'pending',
  });

  // Update session status
  await admin.from('form_sessions').update({
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    patient_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
  }).eq('id', session.id);

  // Log documentation event
  await admin.from('documentation_events').insert({
    encounter_id: encounter.id,
    event_type: 'form_submitted',
    metadata: { source: 'qr_form', session_id: session.id },
  });

  return NextResponse.json({ success: true, encounter_id: encounter.id });
}
