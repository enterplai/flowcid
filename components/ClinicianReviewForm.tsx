'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  encounterId: string;
  reviewId?: string;
  currentStatus: string;
  existingNotes?: any;
  reviewNotes?: string | null;
  reviewerInitials?: string | null;
  reviewerName?: string | null;
}

export default function ClinicianReviewForm({
  encounterId,
  reviewId,
  currentStatus,
  existingNotes,
  reviewNotes,
  reviewerInitials,
  reviewerName,
}: Props) {
  const [gagResponse, setGagResponse] = useState(existingNotes?.gag_response || '');
  const [procedureNotes, setProcedureNotes] = useState(existingNotes?.procedure_notes || '');
  const [additionalComments, setAdditionalComments] = useState(existingNotes?.additional_comments || '');
  const [eligibility, setEligibility] = useState(existingNotes?.eligibility_status || '');
  const [initials, setInitials] = useState(reviewerInitials || '');
  const [name, setName] = useState(reviewerName || '');
  const [notes, setNotes] = useState(reviewNotes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const isComplete = currentStatus === 'approved' || currentStatus === 'rejected';

  async function submit(status: 'approved' | 'rejected' | 'needs_correction') {
    if (!initials.trim()) {
      setError('Reviewer initials are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounter_id: encounterId,
          review_id: reviewId,
          status,
          reviewer_initials: initials.trim().toUpperCase(),
          reviewer_name: name.trim(),
          review_notes: notes.trim(),
          clinical_notes: {
            gag_response: gagResponse,
            procedure_notes: procedureNotes,
            additional_comments: additionalComments,
            eligibility_status: eligibility,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');
      setSuccess(status === 'approved' ? 'Approved! Ready for Formstack export.' : 'Review saved.');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <h2 className="font-semibold text-slate-900">Clinician Review</h2>

      {isComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          ✅ This encounter has been {currentStatus}.
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Gag Response</label>
        <select
          className={inputCls}
          value={gagResponse}
          onChange={e => setGagResponse(e.target.value)}
          disabled={isComplete}
        >
          <option value="">Select...</option>
          <option>Normal</option>
          <option>Absent</option>
          <option>Hypersensitive</option>
          <option>Reduced</option>
          <option>Not assessed</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Procedure Notes</label>
        <textarea
          className={inputCls + ' resize-none'}
          rows={3}
          value={procedureNotes}
          onChange={e => setProcedureNotes(e.target.value)}
          placeholder="Clinical observations during procedure..."
          disabled={isComplete}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Eligibility Status</label>
        <select
          className={inputCls}
          value={eligibility}
          onChange={e => setEligibility(e.target.value)}
          disabled={isComplete}
        >
          <option value="">Determine eligibility...</option>
          <option value="eligible">✅ Eligible</option>
          <option value="ineligible">❌ Ineligible</option>
          <option value="pending">⏳ Pending further review</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Additional Comments</label>
        <textarea
          className={inputCls + ' resize-none'}
          rows={2}
          value={additionalComments}
          onChange={e => setAdditionalComments(e.target.value)}
          placeholder="Any additional notes..."
          disabled={isComplete}
        />
      </div>

      <hr className="border-slate-200" />

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Review Notes</label>
        <textarea
          className={inputCls + ' resize-none'}
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Reason for approval/rejection..."
          disabled={isComplete}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Initials <span className="text-red-500">*</span></label>
          <input
            className={inputCls}
            value={initials}
            onChange={e => setInitials(e.target.value)}
            placeholder="JD"
            maxLength={4}
            disabled={isComplete}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
          <input
            className={inputCls}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Dr. Jane Doe"
            disabled={isComplete}
          />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
      </p>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

      {!isComplete && (
        <div className="space-y-2">
          <button
            onClick={() => submit('approved')}
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : '✅ Approve'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => submit('needs_correction')}
              disabled={loading}
              className="border border-amber-400 text-amber-700 py-2 rounded-lg font-medium text-sm hover:bg-amber-50 disabled:opacity-50 transition-colors"
            >
              ✏️ Needs Edit
            </button>
            <button
              onClick={() => submit('rejected')}
              disabled={loading}
              className="border border-red-300 text-red-600 py-2 rounded-lg font-medium text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              ❌ Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500';
