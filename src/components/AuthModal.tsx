import React, { useState } from 'react';
import { UserRole } from '../types';
import { Shield, Lock, ChefHat, KeyRound, X, Check } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: 'kitchen' | 'admin';
  onAuthenticated: (role: UserRole, userEmail: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  onAuthenticated,
}) => {
  if (!isOpen) return null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Check if Supabase Auth is available
      const supabase = getSupabaseClient();
      if (supabase && email.includes('@')) {
        try {
          const { data, error: supaError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });
          if (data?.user && !supaError) {
            onAuthenticated(targetRole, data.user.email || email);
            onClose();
            return;
          }
        } catch {}
      }

      // 2. Verified staff credentials check (Default secure role login)
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();

      if (targetRole === 'admin') {
        if (
          (cleanEmail === 'owner@hotspot.com' && cleanPass === 'admin123') ||
          (cleanEmail === 'admin' && cleanPass === 'admin123')
        ) {
          onAuthenticated('admin', 'owner@hotspot.com');
          onClose();
          return;
        }
      } else if (targetRole === 'kitchen') {
        if (
          (cleanEmail === 'kitchen@hotspot.com' && cleanPass === 'kitchen123') ||
          (cleanEmail === 'kitchen' && cleanPass === 'kitchen123') ||
          (cleanEmail === 'owner@hotspot.com' && cleanPass === 'admin123')
        ) {
          onAuthenticated('kitchen', 'kitchen@hotspot.com');
          onClose();
          return;
        }
      }

      setError('Invalid credentials. Use demo credentials below or sign in with your Supabase account.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: 'admin' | 'kitchen') => {
    if (role === 'admin') {
      setEmail('owner@hotspot.com');
      setPassword('admin123');
    } else {
      setEmail('kitchen@hotspot.com');
      setPassword('kitchen123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-[#FAF7F2] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EADBCE]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#6B696F] hover:text-[#1E1E24] hover:bg-[#F3ECE1] rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ${
              targetRole === 'admin' ? 'bg-[#C85A32]' : 'bg-[#1E1E24]'
            }`}
          >
            {targetRole === 'admin' ? <Shield className="w-6 h-6" /> : <ChefHat className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#1E1E24]">
              {targetRole === 'admin' ? 'Owner / Admin Login' : 'Kitchen KDS Access'}
            </h2>
            <p className="text-xs text-[#6B696F]">
              Restricted area for authorized Hot Spot staff.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-[#1E1E24] uppercase tracking-wider">
              Staff Email / Username
            </label>
            <input
              type="text"
              required
              placeholder={targetRole === 'admin' ? 'owner@hotspot.com' : 'kitchen@hotspot.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm focus:outline-none focus:border-[#C85A32]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#1E1E24] uppercase tracking-wider">
              Password / Passkey
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3.5 py-2.5 bg-white border border-[#EADBCE] rounded-xl text-sm focus:outline-none focus:border-[#C85A32]"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#C85A32] text-white rounded-xl text-sm font-bold hover:bg-[#B04B26] transition-colors shadow-sm mt-2"
          >
            {loading ? 'Authenticating...' : `Enter ${targetRole === 'admin' ? 'Admin Panel' : 'Kitchen'}`}
          </button>
        </form>

        {/* Quick Demo Credentials Autofill */}
        <div className="mt-5 pt-4 border-t border-[#EADBCE]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C8A90] block mb-2">
            Quick Fill Demo Staff Credentials:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              className="flex-1 py-1.5 px-2 bg-white border border-[#EADBCE] rounded-lg text-[11px] font-semibold text-[#1E1E24] hover:border-[#C85A32] text-center"
            >
              Owner: <code>admin123</code>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('kitchen')}
              className="flex-1 py-1.5 px-2 bg-white border border-[#EADBCE] rounded-lg text-[11px] font-semibold text-[#1E1E24] hover:border-[#C85A32] text-center"
            >
              Kitchen: <code>kitchen123</code>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
