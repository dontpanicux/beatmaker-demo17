import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase';
import { edgeFunctionsBaseUrl, publicAnonKey } from '@/config/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (accessToken: string, user: any) => void;
  initialMode?: 'signup' | 'login';
}

export function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Update mode when initialMode prop changes
  useEffect(() => {
    setIsSignUp(initialMode === 'signup');
  }, [initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up flow
        const signupResponse = await fetch(
          `${edgeFunctionsBaseUrl}/signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({ email, password, name })
          }
        );

        const signupData = await signupResponse.json();
        
        if (!signupResponse.ok) {
          throw new Error(signupData.error || 'Failed to create account');
        }

        // After signup, sign in
        const supabase = getSupabaseClient();
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        onAuthSuccess(data.session.access_token, data.user);
        onClose();
      } else {
        // Sign in flow
        const supabase = getSupabaseClient();
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        onAuthSuccess(data.session.access_token, data.user);
        onClose();
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[#18181b] rounded-[12px] p-[32px] w-[400px] border-2 border-[#3f3f47] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-[16px] right-[16px] text-[#9f9fa9] hover:text-[#f1f5f9] transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="font-['Inter:Medium',sans-serif] font-medium text-[#f8fafc] text-[24px] mb-[24px]">
          {isSignUp ? 'Create Account' : 'Log In'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[16px]">
          {isSignUp && (
            <div className="flex flex-col gap-[8px]">
              <label className="font-['Inter:Medium',sans-serif] font-medium text-[#f1f5f9] text-[14px]">
                Name (optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#27272a] border border-[#3f3f47] rounded-[4px] px-[16px] py-[8px] text-[#f1f5f9] font-['Inter:Medium',sans-serif] font-medium text-[16px] outline-none focus:border-[#8200db] transition-colors"
                placeholder="Your name"
              />
            </div>
          )}

          <div className="flex flex-col gap-[8px]">
            <label className="font-['Inter:Medium',sans-serif] font-medium text-[#f1f5f9] text-[14px]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#27272a] border border-[#3f3f47] rounded-[4px] px-[16px] py-[8px] text-[#f1f5f9] font-['Inter:Medium',sans-serif] font-medium text-[16px] outline-none focus:border-[#8200db] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-[8px]">
            <label className="font-['Inter:Medium',sans-serif] font-medium text-[#f1f5f9] text-[14px]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-[#27272a] border border-[#3f3f47] rounded-[4px] px-[16px] py-[8px] text-[#f1f5f9] font-['Inter:Medium',sans-serif] font-medium text-[16px] outline-none focus:border-[#8200db] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-500 font-['Inter:Medium',sans-serif] font-medium text-[14px]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#8200db] border border-[#ad46ff] rounded-[8px] px-[16px] py-[12px] text-[#f8fafc] font-['Geist:Medium',sans-serif] font-medium text-[16px] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Log In'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-[#8200db] font-['Inter:Medium',sans-serif] font-medium text-[14px] hover:opacity-80 transition-opacity"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}