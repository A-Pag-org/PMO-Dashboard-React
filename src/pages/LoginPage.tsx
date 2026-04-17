// FILE: src/pages/LoginPage.tsx
// PURPOSE: Login page — A-PAG branded, two-column layout, sign-in form
// DESIGN REF: Wireframe page 5 of 13 (Log-in page)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import Badge from '@/components/ui/Badge';
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
      signIn();
      navigate('/home', { replace: true });
    } catch {
      setSubmitError('Unable to sign in right now. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT HALF — Brand panel ── */}
      <div className="relative hidden flex-1 flex-col items-center justify-center bg-[var(--color-ink)] lg:flex">
        {/* A-PAG yellow accent stripe */}
        <div className="absolute left-0 top-0 h-full w-2 bg-[var(--color-accent)]" />
        <div className="px-12 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--color-accent)]">
            <span className="text-2xl font-black text-[var(--color-ink)]">A</span>
          </div>
          <h1 className="text-3xl font-bold leading-snug text-white">
            Delhi Air Pollution<br />Mitigation Dashboard
          </h1>
        </div>
      </div>

      {/* ── RIGHT HALF — Login form ── */}
      <div className="relative flex flex-1 items-center justify-center bg-[var(--color-surface)] px-6">
        <div className="absolute right-6 top-6">
          <Badge label="Illustrative" variant="slate" />
        </div>

        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Sign in
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Access the Impact Dashboard
            </p>
          </div>

          {/* Mobile-only title */}
          <h1 className="text-center text-xl font-bold text-[var(--color-ink)] lg:hidden">
            Impact Dashboard
          </h1>

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

          <p className="text-center text-xs text-[var(--color-text-muted)]">
            Common log-in for Action-Plan and Impact dashboards (AQI coming later)
          </p>
        </div>
      </div>
    </div>
  );
}
