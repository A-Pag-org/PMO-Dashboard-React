// FILE: src/pages/LoginPage.tsx
// PURPOSE: Login page — two-column layout with a brand panel on the
//          left and a stripped-down email/password sign-in form on the
//          right. Latest design pass removes the demo role selector,
//          the "Illustrative" badge, the heading + subtext above the
//          form, the footer disclaimer, the yellow accent stripe, and
//          the mobile-only "Impact Dashboard" title. The branded panel
//          now shows a logo placeholder + the new
//          "Delhi NCR Clean Air Dashboard" title.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { signIn } from '@/lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // TODO: replace with real auth (NextAuth / backend)
      void email;
      void password;
      await new Promise((resolve) => setTimeout(resolve, 150));
      // Role selector was removed in the latest design pass; signIn()
      // defaults to 'MoHUA' (see lib/auth.ts) so the rest of the app's
      // role-gated logic continues to work unchanged. Wire up to the
      // real backend response when auth lands.
      signIn();
      navigate('/dashboard/summary', { replace: true });
    } catch {
      setSubmitError('Unable to sign in right now. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT HALF — Brand panel ── */}
      <div className="relative hidden flex-1 flex-col items-center justify-center bg-[var(--color-ink)] lg:flex">
        <div className="px-12 text-center">
          {/* Logo placeholder — swap for the real A-PAG / NCR logo
              asset when one is provided. Dashed border + LOGO label
              clearly signals this is a placeholder. */}
          <div
            className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-white/40 bg-white/5"
            aria-label="Logo placeholder"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              Logo
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-snug text-white">
            Delhi NCR Clean Air Dashboard
          </h1>
        </div>
      </div>

      {/* ── RIGHT HALF — Login form ── */}
      <div className="relative flex flex-1 items-center justify-center bg-[var(--color-surface)] px-6">
        <div className="w-full max-w-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 pr-12 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[var(--color-ink)] text-base font-semibold text-[var(--color-accent)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In →'}
            </button>
            {submitError ? (
              <p className="text-center text-xs text-[var(--color-danger)]">{submitError}</p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
