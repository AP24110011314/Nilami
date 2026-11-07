import React, { useState } from 'react';
import { Link } from 'react-router';
import { apiClient, ApiError } from '../../api/client.js';
import { User, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, ShoppingBag, Store } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.register({ name, email, password, role });
      setRegisteredEmail(email);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Check Your Email</h2>
          <p className="text-sm text-slate-600">
            We sent an email verification link to <strong className="text-slate-800">{registeredEmail}</strong>.
          </p>
        </div>
        <Link
          to="/login"
          className="inline-block w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create your Nilami account</h1>
        <p className="text-sm text-slate-500">Join the live auction community</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role toggle */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('buyer')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              role === 'buyer' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Buyer</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('seller')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              role === 'seller' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Seller</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Full Name</label>
          <div className="relative">
            <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Email Address</label>
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Password</label>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-800">
          Sign In
        </Link>
      </div>
    </div>
  );
};

