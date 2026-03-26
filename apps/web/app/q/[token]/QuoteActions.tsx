'use client';

import { useState } from 'react';

type Props = {
  quoteId: string;
  token: string;
  pdfUrl: string;
  isTerminal: boolean;
  currentStatus: string;
};

export default function QuoteActions({ quoteId, token, pdfUrl, isTerminal, currentStatus }: Props) {
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);
  const [done, setDone] = useState<'accepted' | 'rejected' | null>(
    currentStatus === 'accepted' ? 'accepted' : currentStatus === 'rejected' ? 'rejected' : null
  );

  async function recordAction(eventType: 'accepted' | 'rejected') {
    setLoading(eventType === 'accepted' ? 'accept' : 'reject');
    try {
      await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, eventType, quoteId }),
      });
      setDone(eventType);
    } catch (err) {
      console.error('Tracking error:', err);
    } finally {
      setLoading(null);
    }
  }

  async function handlePdfDownload() {
    await fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, eventType: 'pdf_downloaded', quoteId }),
    }).catch(console.error);
  }

  if (done === 'accepted') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-green-800 text-lg">Cotización aceptada</p>
        <p className="text-sm text-green-700 mt-1">
          Nos pondremos en contacto con usted a la brevedad.
        </p>
        <a
          href={pdfUrl}
          onClick={handlePdfDownload}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 transition-colors"
        >
          Descargar PDF
        </a>
      </div>
    );
  }

  if (done === 'rejected') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center mb-4">
        <p className="font-semibold text-gray-700 text-lg">Cotización rechazada</p>
        <p className="text-sm text-gray-500 mt-1">
          Gracias por su tiempo. Queda a sus órdenes para cualquier consulta.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h2 className="font-semibold text-gray-900 mb-4">Acciones</h2>

      {isTerminal ? (
        <div className="flex gap-3">
          <a
            href={pdfUrl}
            onClick={handlePdfDownload}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-4 py-2.5 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Descargar PDF
          </a>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => recordAction('accepted')}
            disabled={loading !== null}
            className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
          >
            {loading === 'accept' ? 'Procesando…' : 'Aceptar cotización'}
          </button>
          <button
            onClick={() => recordAction('rejected')}
            disabled={loading !== null}
            className="flex-1 px-4 py-3 bg-white border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors text-sm"
          >
            {loading === 'reject' ? 'Procesando…' : 'Rechazar'}
          </button>
          <a
            href={pdfUrl}
            onClick={handlePdfDownload}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-4 py-3 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Descargar PDF
          </a>
        </div>
      )}
    </div>
  );
}
