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
  Eye,
  EyeOff,
  Sun,
  Moon,
  ShieldCheck,
  Zap,
  Sparkles,
  Disc3,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, signInWithGoogle, signInWithGoogleRedirect, sendResetEmail } = useAuth();
  const { success, error, info } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleGoogleSignIn = async (useRedirect = false) => {
    setErrorMessage(null);
    setUnauthorizedDomain(null);
    setLoading(true);
    try {
      if (useRedirect) {
        await signInWithGoogleRedirect();
      } else {
        await signInWithGoogle();
        success('Welcome to SonicForge!', 'Signed in with Google.');
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.code;
      if (code === 'auth/unauthorized-domain') {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        setUnauthorizedDomain(hostname);
        setErrorMessage(
          `Google Sign-In is blocked because "${hostname}" is not in Firebase Authorized Domains.`
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
      setErrorMessage('Please enter your email address first to reset password.');
      return;
    }
    setLoading(true);
    try {
      await sendResetEmail(email.trim());
      setResetSent(true);
      info('Reset Email Sent', 'Check your inbox for password reset instructions.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset email';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestEntry = () => {
    info('Guest Producer Mode', 'Entering SonicForge studio in guest preview.');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-cream-50/90 dark:bg-charcoal-950/85 transition-colors duration-300">
      {/* Cinematic Animated Background */}
      <AnimatedBackground />

      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-2xl glass-panel text-slate-500 hover:text-charcoal-900 dark:text-lavender-300 dark:hover:text-champagne-400 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-champagne-400" /> : <Moon className="w-4 h-4 text-plum-600" />}
        </button>
      </div>

      {/* Split-Screen Studio Showcase & Authentication Container */}
      <div className="w-full max-w-5xl rounded-3xl glass-panel-elevated overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 shadow-2xl">
        {/* Left Side: Brand Showcase & Atmosphere (5 Cols) */}
        <div className="lg:col-span-5 p-8 sm:p-10 bg-gradient-to-br from-plum-900/60 via-charcoal-900/60 to-plum-950/80 border-b lg:border-b-0 lg:border-r border-plum-700/20 dark:border-white/10 flex flex-col justify-between space-y-8">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-plum-600 via-champagne-500 to-plum-400 p-0.5 shadow-lg shadow-plum-950/30">
                <div className="w-full h-full bg-charcoal-950 rounded-[10px] flex items-center justify-center">
                  <Music2 className="w-5 h-5 text-champagne-400" />
                </div>
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white">
                  SONICFORGE AI
                </span>
                <p className="text-[10px] text-champagne-400 font-bold tracking-wider uppercase">
                  Music & Sound Studio
                </p>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Where Imagination <br />
              <span className="bg-gradient-to-r from-champagne-400 to-lavender-300 bg-clip-text text-transparent">
                Becomes Sound.
              </span>
            </h2>

            <p className="mt-3 text-xs sm:text-sm text-lavender-200/80 leading-relaxed">
              Create complete original music arrangements, isolate multitrack stems, design foley sound effects, and practice instruments with AI-powered audio intelligence.
            </p>
          </div>

          {/* Sound waves visualization indicator */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 h-8">
              {[40, 75, 100, 60, 90, 50, 80, 100, 65, 45, 85, 95, 55, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-plum-500 to-champagne-400 rounded-full animate-wave-bar"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-lavender-300/70 pt-2 border-t border-white/10 font-mono">
              <span>Studio Engine v3.2</span>
              <span>24-bit Lossless</span>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Panel (7 Cols) */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-charcoal-900 dark:text-white">
              Studio Sign In
            </h3>
            <p className="text-xs text-muted">
              Access your saved audio creations, projects vault, and creative workspaces.
            </p>
          </div>

          {/* Diagnostic Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">{errorMessage}</span>
                {unauthorizedDomain && (
                  <div className="pt-1.5 space-y-1 text-[11px] opacity-95">
                    <p className="font-semibold text-champagne-700 dark:text-champagne-300">
                      Quick Fix in Firebase Console (30 seconds):
                    </p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Go to Firebase Console → Authentication → Settings.</li>
                      <li>Under &quot;Authorized domains&quot;, click Add Domain.</li>
                      <li>Paste <code className="font-mono bg-black/20 px-1 py-0.5 rounded">{unauthorizedDomain}</code> and save.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {resetSent && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Password reset email dispatched. Please check your inbox.</span>
            </div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={() => handleGoogleSignIn(false)}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl glass-panel text-charcoal-900 dark:text-white font-bold text-xs flex items-center justify-center gap-2.5 hover:border-champagne-400/40 hover:shadow-md transition-all"
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
            <div className="w-full border-t border-plum-700/15 dark:border-white/10" />
            <span className="absolute bg-white/80 dark:bg-charcoal-900 px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
              Or with Email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-charcoal-900 dark:text-white">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="artist@sonicforge.ai"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 dark:bg-charcoal-950/60 border border-plum-700/20 dark:border-white/10 text-xs text-charcoal-900 dark:text-white placeholder:text-muted/60 focus:outline-none focus:border-champagne-400 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-charcoal-900 dark:text-white">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] font-semibold text-champagne-600 dark:text-champagne-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/70 dark:bg-charcoal-950/60 border border-plum-700/20 dark:border-white/10 text-xs text-charcoal-900 dark:text-white placeholder:text-muted/60 focus:outline-none focus:border-champagne-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-charcoal-900 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-plum-600 via-plum-700 to-champagne-600 hover:from-plum-500 hover:to-champagne-500 text-white font-extrabold text-xs shadow-lg shadow-plum-950/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Guest Producer & Register Links */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={handleGuestEntry}
              className="text-muted hover:text-charcoal-900 dark:hover:text-white font-medium flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-champagne-500" />
              <span>Explore as Guest Producer</span>
            </button>

            <div className="text-muted">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold text-champagne-600 dark:text-champagne-400 hover:underline">
                Create one
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
