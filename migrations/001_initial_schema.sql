-- Flowcid Lab: Initial Schema
-- QR Code Digital Forms, Clinician Review, Client Portal

-- Form sessions created by clinicians for QR code patient intake
CREATE TABLE IF NOT EXISTS form_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_by UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL DEFAULT '',
  patient_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | submitted | reviewing | approved | rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours'
);

CREATE INDEX IF NOT EXISTS idx_form_sessions_token ON form_sessions(token);
CREATE INDEX IF NOT EXISTS idx_form_sessions_status ON form_sessions(status);
CREATE INDEX IF NOT EXISTS idx_form_sessions_created_by ON form_sessions(created_by);

-- Patient encounter submissions (from QR form or paper scan)
CREATE TABLE IF NOT EXISTS encounter_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES form_sessions(id),
  source TEXT NOT NULL DEFAULT 'qr_form',
  -- qr_form | paper_scan

  -- Patient demographics
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Medical history (patient self-report)
  primary_language TEXT,
  has_blood_thinner BOOLEAN,
  medications TEXT,
  allergies TEXT,
  medical_conditions TEXT[] DEFAULT '{}',

  -- Registry screening questions
  has_hepatitis_b BOOLEAN,
  has_hepatitis_c BOOLEAN,
  has_hiv BOOLEAN,
  has_diabetes BOOLEAN,
  has_hypertension BOOLEAN,
  has_liver_disease BOOLEAN,

  -- Consent
  consent_given BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,

  -- Raw form data (for audit)
  raw_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounter_submissions_session ON encounter_submissions(session_id);

-- AI/OCR extraction fields with confidence scores (paper scan workflow)
CREATE TABLE IF NOT EXISTS extraction_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounter_submissions(id),
  field_name TEXT NOT NULL,
  extracted_value TEXT,
  confidence_score NUMERIC(4,3) DEFAULT 0,
  -- 0.000 to 1.000
  is_uncertain BOOLEAN DEFAULT FALSE,
  clinician_override TEXT,
  override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_fields_encounter ON extraction_fields(encounter_id);

-- Clinician notes added during review (clinical observations)
CREATE TABLE IF NOT EXISTS clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounter_submissions(id),
  clinician_id UUID REFERENCES auth.users(id),
  gag_response TEXT,
  procedure_notes TEXT,
  additional_comments TEXT,
  eligibility_status TEXT,
  -- eligible | ineligible | pending
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_encounter ON clinical_notes(encounter_id);

-- Clinician review / approval records
CREATE TABLE IF NOT EXISTS clinician_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounter_submissions(id),
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_initials TEXT,
  reviewer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | approved | rejected | needs_correction
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinician_reviews_encounter ON clinician_reviews(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinician_reviews_status ON clinician_reviews(status);
CREATE INDEX IF NOT EXISTS idx_clinician_reviews_reviewer ON clinician_reviews(reviewer_id);

-- Metrics / time tracking for portal dashboard
CREATE TABLE IF NOT EXISTS documentation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID REFERENCES encounter_submissions(id),
  event_type TEXT NOT NULL,
  -- form_started | form_submitted | review_started | review_approved | formstack_exported | veeva_pushed
  duration_seconds INTEGER,
  -- time spent on this step
  performed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentation_events_encounter ON documentation_events(encounter_id);
CREATE INDEX IF NOT EXISTS idx_documentation_events_type ON documentation_events(event_type);
