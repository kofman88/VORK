import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useTelegram } from "./hooks/useTelegram";
import { useAuthStore } from "./store/authStore";
import { useAuth, useMe } from "./api/hooks";
import Router from "./router";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initData, isInTelegram } = useTelegram();
  const { isAuthenticated, setTokens, setUser } = useAuthStore();
  const authMutation = useAuth();
  const { data: me } = useMe();

  useEffect(() => {
    if (me) setUser(me);
  }, [me, setUser]);

  useEffect(() => {
    if (!isAuthenticated && initData) {
      authMutation.mutate(initData, {
        onSuccess: (data) => {
          setTokens(data.access_token, data.refresh_token);
        },
      });
    }
  }, [initData, isAuthenticated]);

  // Dev mode - allow usage without Telegram
  useEffect(() => {
    if (!isInTelegram && !isAuthenticated) {
      // In dev, skip auth
      console.warn("Not in Telegram, running in dev mode");
    }
  }, [isInTelegram, isAuthenticated]);

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimatePresence mode="wait">
          <Router />
        </AnimatePresence>
      </AuthProvider>
    </BrowserRouter>
  );
}
