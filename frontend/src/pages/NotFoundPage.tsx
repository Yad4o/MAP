import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#e8ebe6' }}
    >
      <div className="text-center w-full max-w-md">

        {/* 404 number */}
        <div
          className="text-[120px] font-black leading-none select-none mb-0"
          style={{
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 900,
            color: '#9fe870',
            letterSpacing: '-4px',
          }}
        >
          404
        </div>

        {/* Card */}
        <div className="wise-card" style={{ marginTop: '-8px' }}>
          <h2
            className="mb-3"
            style={{
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 900,
              fontSize: '24px',
              color: '#0e0f0c',
            }}
          >
            Page Not Found
          </h2>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: '#454745' }}>
            The page you're looking for doesn't exist or has been moved.
            Head back to the dashboard to continue.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="btn-wise-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              style={{ fontSize: '14px', padding: '11px 22px' }}
            >
              <Home size={16} />
              Return Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="btn-wise-tertiary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              style={{ fontSize: '14px', padding: '10px 22px' }}
            >
              <ArrowLeft size={16} />
              Go Back
            </button>
          </div>
        </div>

        <p
          className="mt-6 text-[11px] font-mono tracking-widest uppercase"
          style={{ color: '#868685' }}
        >
          MAP Platform · Page missing
        </p>
      </div>
    </div>
  );
}
