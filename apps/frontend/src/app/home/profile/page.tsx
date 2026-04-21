'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import axios from 'axios';

// ---- Schemas ----
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((d) => d.newPassword === d.confirmNewPassword, {
  message: "Passwords don't match",
  path: ['confirmNewPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ---- Avatar ----
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold select-none">
      {initials}
    </div>
  );
}

// ---- Password field ----
function PasswordField({
  id,
  label,
  registration,
  error,
}: {
  id: string;
  label: string;
  registration: any;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          {...registration}
          className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  // Profile form
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
    reset: resetProfile,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '' },
  });

  // Sync default value when user loads
  useEffect(() => {
    if (user?.name) resetProfile({ name: user.name });
  }, [user?.name, resetProfile]);

  const onProfileSubmit = async (data: ProfileForm) => {
    setProfileSuccess(false);
    setProfileError('');
    try {
      const { data: res } = await api.put('/api/users/profile', { name: data.name });
      updateUser({ name: res.data.name });
      setProfileSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Something went wrong';
      setProfileError(msg);
    }
  };

  // Password form
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  const {
    register: regPw,
    handleSubmit: handlePw,
    formState: { errors: pwErrors, isSubmitting: pwSubmitting },
    reset: resetPw,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onPasswordSubmit = async (data: PasswordForm) => {
    setPwSuccess(false);
    setPwError('');
    try {
      await api.put('/api/users/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword,
      });
      setPwSuccess(true);
      resetPw();
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Something went wrong';
        if (status === 401) {
          setPwError('Current password is incorrect');
        } else {
          setPwError(msg);
        }
      }
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account information and password.</p>
      </div>

      {/* Section 1 — Profile Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        {/* Avatar + meta */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          {user && <Avatar name={user.name} />}
          <div>
            <p className="font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="mt-1.5">
              {user?.isEmailVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  <CheckCircle size={11} />
                  Email Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  <AlertCircle size={11} />
                  Email Not Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit name form */}
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Edit Name</h2>
        <form onSubmit={handleProfile(onProfileSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              {...regProfile('name')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {profileErrors.name && (
              <p className="mt-1 text-xs text-red-500">{profileErrors.name.message}</p>
            )}
          </div>

          {profileError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{profileError}</p>
            </div>
          )}

          {profileSuccess && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
              <CheckCircle size={15} className="text-green-600" />
              <p className="text-sm text-green-700">Profile updated successfully!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={profileSubmitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 px-4 rounded-lg text-sm transition"
          >
            <span className="flex items-center gap-2">
              {profileSubmitting && <Loader2 size={13} className="animate-spin" />}
              <span>Save Changes</span>
            </span>
          </button>
        </form>
      </div>

      {/* Section 2 — Change Password */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Change Password</h2>
        <form onSubmit={handlePw(onPasswordSubmit)} noValidate className="space-y-4">
          <PasswordField
            id="currentPassword"
            label="Current Password"
            registration={regPw('currentPassword')}
            error={pwErrors.currentPassword?.message}
          />
          <PasswordField
            id="newPassword"
            label="New Password"
            registration={regPw('newPassword')}
            error={pwErrors.newPassword?.message}
          />
          <PasswordField
            id="confirmNewPassword"
            label="Confirm New Password"
            registration={regPw('confirmNewPassword')}
            error={pwErrors.confirmNewPassword?.message}
          />

          {pwError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{pwError}</p>
            </div>
          )}

          {pwSuccess && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
              <CheckCircle size={15} className="text-green-600" />
              <p className="text-sm text-green-700">Password updated successfully!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pwSubmitting}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-medium py-2 px-4 rounded-lg text-sm transition"
          >
            <span className="flex items-center gap-2">
              {pwSubmitting && <Loader2 size={13} className="animate-spin" />}
              <span>Update Password</span>
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
