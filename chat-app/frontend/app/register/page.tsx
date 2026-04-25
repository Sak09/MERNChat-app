'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { register } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';
import { MessageSquare, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((s) => s.auth);
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    const result = await dispatch(register(form));
    if (register.fulfilled.match(result)) {
      toast.success('Account created!');
      router.replace('/');
    } else {
      toast.error(result.payload as string || 'Registration failed');
    }
  };

  const fields = [
    { key: 'username', label: 'Username', type: 'text', placeholder: 'cooluser123', icon: User },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', icon: Mail },
    { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', icon: Lock },
  ];

  return (
    <div className="flex min-h-screen bg-surface items-center justify-center p-6">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 mb-4">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
          <p className="mt-1 text-sm text-white/50">Join and start chatting instantly</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ key, label, type, placeholder, icon: Icon }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required
                  className="w-full rounded-xl bg-surface-2 border border-surface-4 pl-10 pr-4 py-3 text-sm placeholder-white/20 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold hover:bg-brand-500 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>Create account <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
