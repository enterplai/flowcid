'use client';

import { useState } from 'react';
import NavBar from '@/components/NavBar';
import QRCodeDisplay from '@/components/QRCodeDisplay';

export default function QRPage() {
  const [eventName, setEventName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [session, setSession] = useState<{ token: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generateQR() {
    if (!eventName.trim()) {
      setError('Event name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_name: eventName, patient_name: patientName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create form session');
      const formUrl = `${window.location.origin}/form/${data.token}`;
      setSession({ token: data.token, url: formUrl });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSession(null);
    setEventName('');
    setPatientName('');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Generate QR Form</h1>
          <p className="text-slate-500 text-sm mt-1">
            Create a unique QR code for a patient to fill out their encounter form on their phone.
          </p>
        </div>

        {!session ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Event / Clinic Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="e.g. CYFT Community Health Event – Apr 2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Patient Name <span className="text-slate-400 font-normal">(optional – pre-fill)</span>
              </label>
              <input
                type="text"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                placeholder="Leave blank for anonymous scan"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button
              onClick={generateQR}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Generating...' : '📱 Generate QR Code'}
            </button>

            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">How it works</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Generate a unique QR code for this patient encounter</li>
                <li>Patient scans with their phone and fills out the form</li>
                <li>You receive a review notification when they submit</li>
                <li>Review, edit if needed, and approve before submission</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mb-3">
                <span className="text-green-600 text-lg">✓</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">QR Code Ready</h2>
              <p className="text-sm text-slate-500">Patient can scan this code to fill out their form</p>
            </div>

            <div className="flex justify-center mb-6">
              <QRCodeDisplay url={session.url} />
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-slate-500 mb-1">Direct link</p>
              <p className="text-sm font-mono text-slate-700 break-all">{session.url}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(session.url)}
                className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Copy Link
              </button>
              <button
                onClick={reset}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                New QR Code
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
