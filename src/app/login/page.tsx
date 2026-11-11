'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Music2,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, signInWithGoogle, sendResetEmail } = useAuth();
  const { success, error, info } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUnauthorizedDomain(null);
    setLoading(true);

    try {
      await loginWithEmail(email.trim(), password);
      success('Welcome back!', 'Signed in successfully.');
      router.push('/dashboard');
    } catch (err: unknown) {
      let msg = 'Authentication failed. Please verify your email and password.';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        msg = 'Invalid email or password.';
      } else if (code === 'auth/user-not-found') {
        msg = 'No account found with this email.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please reset your password or try again later.';
      }
      setErrorMessage(msg);
      error('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setUnauthorizedDomain(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      success('Welcome to SonicForge!', 'Signed in with Google.');
      router.push('/dashboard');
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.code;
      if (code === 'auth/unauthorized-domain') {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        setUnauthorizedDomain(hostname);
        setErrorMessage(
          `Google Sign-In is blocked because "${hostname}" has not been added to your Firebase Authorized Domains.`
        );
      } else if (code !== 'auth/popup-closed-by-user') {
        const msg = err instanceof Error ? err.message : 'Google sign-in error';
        setErrorMessage(msg);
        error('Google Sign-in Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address to receive a password reset link.');
      return;
    }
    try {
      await sendResetEmail(email.trim());
      setResetSent(true);
      info('Password Reset Sent', `Check inbox for ${email.trim()}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-midnight-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-studio-blue/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-studio-blue via-studio-violet to-cyan-400 p-0.5 shadow-lg shadow-studio-blue/20">
            <div className="w-full h-full bg-midnight-950 rounded-[10px] flex items-center justify-center">
              <Music2 className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            SONICFORGE AI
          </span>
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-white">
          Sign in to your Studio Account
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Or{' '}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="p-8 rounded-3xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl shadow-2xl space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/30 text-rose-200 text-xs space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{errorMessage}</span>
              </div>

              {unauthorizedDomain && (
                <div className="pt-2 border-t border-rose-500/20 text-[11px] text-slate-300 space-y-2">
                  <p className="font-medium text-cyan-300">
                    🛠️ How to fix in 30 seconds:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
                    <li>
                      Open your{' '}
                      <a
                        href="https://console.firebase.google.com/project/sonicforge-ai/authentication/settings"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 underline hover:text-cyan-300 font-semibold"
                      >
                        Firebase Console &rarr; Auth Settings
                      </a>
                    </li>
                    <li>
                      Scroll down to <strong>Authorized domains</strong> and click{' '}
                      <strong>Add domain</strong>
                    </li>
                    <li>
                      Add <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">{unauthorizedDomain}</code> (and <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">localhost</code>)
                    </li>
                  </ol>
                  <div className="p-2.5 rounded-xl bg-midnight-950/80 border border-studio-blue/30 text-slate-200">
                    💡 <strong>Instant Alternative:</strong> Sign in with your <strong>Email &amp; Password</strong> below right now! Email sign-in requires no domain authorization.
                  </div>
                </div>
              )}
            </div>
          )}

          {resetSent && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Password reset email dispatched. Please check your inbox.</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-all flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-midnight-900 px-3 text-[10px] text-slate-400 uppercase tracking-wider relative">
              Or with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="producer@sonicforge.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-midnight-950 border border-studio-border text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-studio-blue"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-midnight-950 border border-studio-border text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-studio-blue"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-semibold shadow-md shadow-studio-blue/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/dashboard"
                className="text-xs text-slate-400 hover:text-cyan-300 font-medium transition-colors"
              >
                Skip sign-in &amp; explore studio as Guest &rarr;
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

