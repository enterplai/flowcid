import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    encounter_id,
    review_id,
    status,
    reviewer_initials,
    reviewer_name,
    review_notes,
    clinical_notes,
  } = body;

  if (!encounter_id || !status || !reviewer_initials) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Upsert clinical notes
  if (clinical_notes) {
    const existingNote = await admin
      .from('clinical_notes')
      .select('id')
      .eq('encounter_id', encounter_id)
      .single();

    if (existingNote.data) {
      await admin.from('clinical_notes').update({
        gag_response: clinical_notes.gag_response,
        procedure_notes: clinical_notes.procedure_notes,
        additional_comments: clinical_notes.additional_comments,
        eligibility_status: clinical_notes.eligibility_status,
        updated_at: now,
      }).eq('id', existingNote.data.id);
    } else {
      await admin.from('clinical_notes').insert({
        encounter_id,
        clinician_id: user.id,
        ...clinical_notes,
      });
    }
  }

  // Update or create review record
  if (review_id) {
    const { error } = await admin.from('clinician_reviews').update({
      status,
      reviewer_id: user.id,
      reviewer_initials,
      reviewer_name,
      review_notes,
      reviewed_at: now,
    }).eq('id', review_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin.from('clinician_reviews').insert({
      encounter_id,
      reviewer_id: user.id,
      reviewer_initials,
      reviewer_name,
      review_notes,
      status,
      reviewed_at: now,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update form session status
  const sessionStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'reviewing';
  await admin
    .from('form_sessions')
    .update({ status: sessionStatus })
    .eq('id', (
      await admin.from('encounter_submissions').select('session_id').eq('id', encounter_id).single()
    ).data?.session_id);

  // Log documentation event
  await admin.from('documentation_events').insert({
    encounter_id,
    event_type: status === 'approved' ? 'review_approved' : 'review_started',
    performed_by: user.id,
    metadata: { status, reviewer_initials },
  });

  return NextResponse.json({ success: true });
}
