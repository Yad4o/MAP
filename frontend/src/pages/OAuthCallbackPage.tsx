import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

/**
 * The backend's /auth/oauth/{provider}/callback route redirects the
 * browser here with either:
 *   ?access_token=...&refresh_token=...   (success)
 *   nothing (the provider error case redirects to /login?oauth_error=... instead)
 *
 * This page's only job is: grab the tokens, fetch the profile, store
 * both, strip the tokens out of the URL, and move on.
 */
export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setError('Sign-in did not complete. Please try again.');
      return;
    }

    (async () => {
      try {
        setTokens(accessToken, refreshToken);
        const user = await authApi.getMe();
        setUser(user);
        // Clear the tokens out of the URL/history before leaving.
        window.history.replaceState({}, '', '/oauth/callback');
        navigate('/tasks/new', { replace: true });
      } catch {
        setError("Signed in, but couldn't load your profile. Please try logging in again.");
      }
    })();
  }, [searchParams, setTokens, setUser, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070c]">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        {error ? (
          <>
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="text-sm text-emerald-400 hover:underline"
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            <p className="text-sm text-white/50">Finishing sign-in…</p>
          </>
        )}
      </div>
    </div>
  );
}
