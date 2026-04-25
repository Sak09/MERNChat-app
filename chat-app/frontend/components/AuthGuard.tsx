'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { fetchMe } from '../store/slices/authSlice';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((s) => s.auth);
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      dispatch(fetchMe()).finally(() => setChecked(true));
    } else {
      setChecked(true);
      router.replace('/login');
    }
  }, [dispatch, router]);

  useEffect(() => {
    if (checked && !isAuthenticated && !isLoading) {
      router.replace('/login');
    }
  }, [checked, isAuthenticated, isLoading, router]);

  if (!checked || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-surface-4 border-t-brand-500" />
          <p className="text-sm text-white/40">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
