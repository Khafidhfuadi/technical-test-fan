'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, AlertCircle, Users, BookOpen, User, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

const quickLinks = [
  { href: '/home/users', label: 'User List', icon: Users, description: 'View and manage all registered users' },
  { href: '/home/books', label: 'My Books', icon: BookOpen, description: 'Manage your uploaded book collection' },
  { href: '/home/profile', label: 'Profile', icon: User, description: 'Update your name and password' },
];

export default function HomePage() {
  const { user } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResend = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    setResendMessage(null);
    try {
      await api.post('/api/auth/resend-verification', { email: user.email });
      setResendMessage('Verification email sent. Please check your inbox.');
    } catch {
      setResendMessage('Failed to send. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.name}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here's a quick overview of your account.</p>
      </div>

      {/* Verification status */}
      <div className="mb-8">
        {user?.isEmailVerified ? (
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
            <CheckCircle size={16} />
            Email Verified
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">Email Not Verified</span>
            </div>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="inline-flex items-center gap-1.5 text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition sm:ml-auto"
            >
              {resendLoading && <Loader2 size={13} className="animate-spin" />}
              Resend Verification Email
            </button>
            {resendMessage && (
              <p className="text-xs text-amber-700 sm:hidden">{resendMessage}</p>
            )}
          </div>
        )}
        {resendMessage && user?.isEmailVerified === false && (
          <p className="text-xs text-gray-500 mt-2">{resendMessage}</p>
        )}
      </div>

      {/* Quick nav cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map(({ href, label, icon: Icon, description }) => (
            <Link
              key={href}
              href={href}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3"
            >
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <Icon size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
