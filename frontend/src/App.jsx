import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import {
  beginSpotifyLogin,
  clearSpotifySession,
  exchangeCodeForToken,
  getSpotifySession,
  hasAuthCallbackParams,
} from "./services/spotifyAuth";

function App() {
  const [session, setSession] = useState(() => getSpotifySession());
  const [authStatus, setAuthStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!hasAuthCallbackParams()) {
      return;
    }

    let ignore = false;

    async function completeLogin() {
      setAuthStatus("loading");
      setErrorMessage("");

      try {
        const nextSession = await exchangeCodeForToken();

        if (!ignore) {
          setSession(nextSession);
          setAuthStatus("success");
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error ? error.message : "Spotify login failed.";
          setErrorMessage(message);
          setAuthStatus("error");
        }
      }
    }

    completeLogin();

    return () => {
      ignore = true;
    };
  }, []);

  function handleLogout() {
    clearSpotifySession();
    setSession(null);
    setAuthStatus("idle");
    setErrorMessage("");
  }

  async function handleLogin() {
    setAuthStatus("loading");
    setErrorMessage("");

    try {
      await beginSpotifyLogin();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Spotify login failed.";
      setErrorMessage(message);
      setAuthStatus("error");
    }
  }

  return (
    <AuthPage
      authStatus={authStatus}
      errorMessage={errorMessage}
      isAuthenticated={Boolean(session?.accessToken)}
      onLogin={handleLogin}
      session={session}
      onLogout={handleLogout}
    />
  );
}

export default App;
