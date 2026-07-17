import { useNavigate, useSearchParams } from 'react-router-dom';
import { BASE_URL } from '../../../api/client';

/**
 * Hero — simplified, centered "entry point" layout.
 * Signature element: the MAP mark with a single soft emerald bloom behind it.
 * Everything else (copy, buttons, texture) stays quiet on purpose.
 */
export default function Hero() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('oauth_error');

  const startOAuth = (provider: 'google' | 'github') => {
    window.location.href = `${BASE_URL}/auth/oauth/${provider}/login`;
  };

  return (
    <section id="hero" className="hero-v2">
      {/* Ambient background: solid near-black + one soft green bloom + faint dot grid */}
      <div className="hero-v2__bg" aria-hidden="true">
        <div className="hero-v2__glow" />
        <div className="hero-v2__grid" />
      </div>

      <div className="hero-v2__content">
        <div className="hero-v2__mark">
          <div className="hero-v2__mark-glow" aria-hidden="true" />
          <img src="/map-icon.png" alt="" aria-hidden="true" className="hero-v2__mark-img" />
        </div>

        <img
          src="/map-wordmark.png"
          alt="MAP"
          className="hero-v2__wordmark-img"
        />

        <span className="hero-v2__tagline">
          MULTIAGENT <span className="hero-v2__tagline-accent">AI</span> PLATFORM
        </span>

        <p className="hero-v2__subtext">
          Route complex work through specialized AI agents, each with its own
          role, tools, and protocol.
        </p>

        {oauthError && (
          <p className="hero-v2__oauth-error" role="alert">
            {oauthError === 'access_denied'
              ? 'Sign-in was cancelled.'
              : "Couldn't sign you in — please try again."}
          </p>
        )}

        <div className="hero-v2__actions">
          <button
            type="button"
            className="hero-v2__btn hero-v2__btn--google"
            onClick={() => startOAuth('google')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33Z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            className="hero-v2__btn hero-v2__btn--ghost"
            onClick={() => startOAuth('github')}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.44-2.43-.97-2.43-.97-.33-.83-.8-1.05-.8-1.05-.66-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.09.6.07-.46.25-.78.46-.96-1.61-.18-3.3-.8-3.3-3.59 0-.79.28-1.44.74-1.94-.07-.19-.32-.94.07-1.95 0 0 .61-.19 1.98.74a6.9 6.9 0 0 1 3.6 0c1.37-.93 1.98-.74 1.98-.74.39 1.01.14 1.76.07 1.95.46.5.74 1.15.74 1.94 0 2.8-1.7 3.41-3.32 3.59.26.22.49.66.49 1.33l-.01 1.98c0 .21.14.45.55.38A8 8 0 0 0 8 0Z" />
            </svg>
            Continue with GitHub
          </button>

          <div className="hero-v2__divider">
            <span />
            <em>OR</em>
            <span />
          </div>

          <button
            type="button"
            className="hero-v2__btn hero-v2__btn--outline"
            onClick={() => navigate('/register')}
          >
            Continue with Email
          </button>

          <button
            type="button"
            className="hero-v2__signin"
            onClick={() => navigate('/login')}
          >
            Already have an account? <span>Sign in</span>
          </button>
        </div>
      </div>
    </section>
  );
}
