'use client';

import { useState } from 'react';

type Step = 'demographics' | 'medical' | 'screening' | 'consent' | 'done';

interface Props {
  sessionToken: string;
  sessionId: string;
  eventName: string;
  patientNamePrefill?: string | null;
}

export default function PatientForm({ sessionToken, sessionId, eventName, patientNamePrefill }: Props) {
  const [step, setStep] = useState<Step>('demographics');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    first_name: patientNamePrefill?.split(' ')[0] || '',
    last_name: patientNamePrefill?.split(' ').slice(1).join(' ') || '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    primary_language: 'English',
    has_blood_thinner: false,
    medications: '',
    allergies: '',
    medical_conditions: [] as string[],
    has_hepatitis_b: false,
    has_hepatitis_c: false,
    has_hiv: false,
    has_diabetes: false,
    has_hypertension: false,
    has_liver_disease: false,
    consent_given: false,
  });

  function update(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function toggleCondition(condition: string) {
    setForm(f => ({
      ...f,
      medical_conditions: f.medical_conditions.includes(condition)
        ? f.medical_conditions.filter(c => c !== condition)
        : [...f.medical_conditions, condition],
    }));
  }

  async function handleSubmit() {
    if (!form.consent_given) {
      setError('You must provide consent to continue.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/forms/${sessionToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit form');
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Form Submitted!</h1>
          <p className="text-slate-500 text-sm mb-4">
            Thank you! Your clinician will review your information and may follow up with you.
          </p>
          <p className="text-xs text-slate-400">You may close this window.</p>
        </div>
      </div>
    );
  }

  const steps: Step[] = ['demographics', 'medical', 'screening', 'consent'];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-4">
        <p className="text-xs text-blue-200 mb-1">{eventName}</p>
        <h1 className="text-lg font-bold">Patient Intake Form</h1>
        <div className="flex gap-1 mt-3">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-white' : 'bg-blue-400'}`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Step 1: Demographics */}
        {step === 'demographics' && (
          <FormSection title="Personal Information" subtitle="Step 1 of 4">
            <FormRow>
              <Field label="First Name" required>
                <input className={inputCls} value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="First name" />
              </Field>
              <Field label="Last Name" required>
                <input className={inputCls} value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Last name" />
              </Field>
            </FormRow>
            <Field label="Date of Birth" required>
              <input type="date" className={inputCls} value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} />
            </Field>
            <Field label="Gender">
              <select className={inputCls} value={form.gender} onChange={e => update('gender', e.target.value)}>
                <option value="">Select...</option>
                <option>Male</option>
                <option>Female</option>
                <option>Non-binary</option>
                <option>Prefer not to say</option>
              </select>
            </Field>
            <Field label="Phone Number">
              <input className={inputCls} type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="(555) 000-0000" />
            </Field>
            <Field label="Email">
              <input className={inputCls} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@email.com" />
            </Field>
            <Field label="Address">
              <input className={inputCls} value={form.address} onChange={e => update('address', e.target.value)} placeholder="Street address" />
            </Field>
            <FormRow>
              <Field label="City">
                <input className={inputCls} value={form.city} onChange={e => update('city', e.target.value)} placeholder="City" />
              </Field>
              <Field label="State">
                <input className={inputCls} value={form.state} onChange={e => update('state', e.target.value)} placeholder="CA" maxLength={2} />
              </Field>
              <Field label="ZIP">
                <input className={inputCls} value={form.zip} onChange={e => update('zip', e.target.value)} placeholder="12345" maxLength={10} />
              </Field>
            </FormRow>
            <Field label="Primary Language">
              <select className={inputCls} value={form.primary_language} onChange={e => update('primary_language', e.target.value)}>
                <option>English</option>
                <option>Spanish</option>
                <option>Mandarin</option>
                <option>Vietnamese</option>
                <option>Korean</option>
                <option>Other</option>
              </select>
            </Field>
            <NavButtons onNext={() => { if (!form.first_name || !form.last_name || !form.date_of_birth) { setError('Please fill in required fields.'); return; } setError(''); setStep('medical'); }} />
          </FormSection>
        )}

        {/* Step 2: Medical History */}
        {step === 'medical' && (
          <FormSection title="Medical History" subtitle="Step 2 of 4">
            <p className="text-sm text-slate-500 mb-2">Please check all that apply:</p>
            <div className="space-y-2">
              {['Heart disease', 'Stroke', 'Cancer', 'Kidney disease', 'Lung disease', 'Thyroid disorder'].map(c => (
                <CheckboxItem key={c} label={c} checked={form.medical_conditions.includes(c)} onChange={() => toggleCondition(c)} />
              ))}
            </div>
            <Field label="Current Medications">
              <textarea className={inputCls + ' resize-none'} rows={3} value={form.medications} onChange={e => update('medications', e.target.value)} placeholder="List any medications you currently take..." />
            </Field>
            <Field label="Allergies">
              <textarea className={inputCls + ' resize-none'} rows={2} value={form.allergies} onChange={e => update('allergies', e.target.value)} placeholder="List any known allergies..." />
            </Field>
            <CheckboxItem
              label="I am currently taking blood thinners (warfarin, Eliquis, Xarelto, etc.)"
              checked={form.has_blood_thinner}
              onChange={() => update('has_blood_thinner', !form.has_blood_thinner)}
            />
            <NavButtons onBack={() => setStep('demographics')} onNext={() => { setError(''); setStep('screening'); }} />
          </FormSection>
        )}

        {/* Step 3: Registry Screening */}
        {step === 'screening' && (
          <FormSection title="Registry Screening Questions" subtitle="Step 3 of 4">
            <p className="text-sm text-slate-500 mb-4">
              These questions are required for the clinical registry. All answers are confidential.
            </p>
            <div className="space-y-4">
              {[
                { key: 'has_hepatitis_b', label: 'Have you ever been diagnosed with Hepatitis B?' },
                { key: 'has_hepatitis_c', label: 'Have you ever been diagnosed with Hepatitis C?' },
                { key: 'has_hiv', label: 'Have you ever been diagnosed with HIV?' },
                { key: 'has_diabetes', label: 'Do you have diabetes?' },
                { key: 'has_hypertension', label: 'Do you have high blood pressure (hypertension)?' },
                { key: 'has_liver_disease', label: 'Have you been diagnosed with liver disease?' },
              ].map(({ key, label }) => (
                <div key={key} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-700 mb-2">{label}</p>
                  <div className="flex gap-3">
                    {['Yes', 'No', 'Unsure'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update(key, opt === 'Yes' ? true : opt === 'No' ? false : null)}
                        className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                          (form as any)[key] === (opt === 'Yes' ? true : opt === 'No' ? false : null) && (form as any)[key] !== undefined
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <NavButtons onBack={() => setStep('medical')} onNext={() => { setError(''); setStep('consent'); }} />
          </FormSection>
        )}

        {/* Step 4: Consent */}
        {step === 'consent' && (
          <FormSection title="Consent & Review" subtitle="Step 4 of 4">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 space-y-2 mb-4">
              <p className="font-medium">Patient Consent</p>
              <p>By submitting this form, I confirm that:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>The information I provided is accurate to the best of my knowledge</li>
                <li>I consent to my health information being used for clinical registry purposes</li>
                <li>A clinician will review and may contact me regarding my responses</li>
                <li>My information is protected under HIPAA guidelines</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm space-y-2 mb-4">
              <p className="font-medium text-slate-800">Summary of your responses</p>
              <div className="space-y-1 text-slate-600">
                <p><span className="font-medium">Name:</span> {form.first_name} {form.last_name}</p>
                <p><span className="font-medium">DOB:</span> {form.date_of_birth || '—'}</p>
                <p><span className="font-medium">Language:</span> {form.primary_language}</p>
                <p><span className="font-medium">Blood thinner:</span> {form.has_blood_thinner ? 'Yes' : 'No'}</p>
                <p><span className="font-medium">Conditions:</span> {form.medical_conditions.length > 0 ? form.medical_conditions.join(', ') : 'None reported'}</p>
              </div>
            </div>

            <CheckboxItem
              label="I agree to the consent statement above and confirm my information is accurate."
              checked={form.consent_given}
              onChange={() => update('consent_given', !form.consent_given)}
            />

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep('screening')} className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.consent_given}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Form ✓'}
              </button>
            </div>
          </FormSection>
        )}

        {error && step !== 'consent' && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function FormSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div>
        <p className="text-xs text-blue-600 font-medium mb-0.5">{subtitle}</p>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function CheckboxItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function NavButtons({ onBack, onNext }: { onBack?: () => void; onNext?: () => void }) {
  return (
    <div className="flex gap-3 mt-2">
      {onBack && (
        <button onClick={onBack} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors">
          ← Back
        </button>
      )}
      {onNext && (
        <button onClick={onNext} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors">
          Next →
        </button>
      )}
    </div>
  );
}
