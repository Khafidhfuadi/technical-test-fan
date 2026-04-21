'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('Verification failed. The link may be expired or invalid.');

  useEffect(() => {
    if (!token) {
      setErrorMessage('No verification token found in the link.');
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/api/auth/verify-email?token=${token}`);
        setStatus('success');
      } catch (error: any) {
        const message =
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Verification failed. The link may be expired or invalid.';
        setErrorMessage(message);
        setStatus('error');
      }
    };

    verify();
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="flex justify-center mb-4">
              <Loader2 size={48} className="text-blue-500 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
            <p className="text-sm text-gray-500">Please wait a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle size={56} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your email has been verified successfully. You can now log in to your account.
            </p>
            <Link
              href="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <XCircle size={56} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
          <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
          <Link
            href="/login"
            className="inline-block bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
