import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createApi } from "@med-purple/api-client";
import { CheckCircle } from "@phosphor-icons/react";
import s from "../components/ui.module.css";
export const api = createApi({
  baseUrl: import.meta.env.VITE_API_URL || "/api/v1",
});
const Context = createContext(null);
export function AppProvider({ children }) {
  const [guestAccess, setGuestAccess] = useState(false);
  const [user, setUser] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [toast, setToast] = useState(null);
  const initialize = useCallback(async () => {
    setGuestAccess(false);
    setLoading(true);
    setError("");
    try {
      setUser(await api.bootstrap());
      // Page data hooks can start before the guest/session bootstrap finishes.
      // Retry those initial 401s now that the shared API client has a token.
      window.dispatchEvent(new Event("mp:changed"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    initialize();
  }, [initialize]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = useCallback(
    (message) => setToast({ message, time: Date.now() }),
    [],
  );
  const changed = useCallback(
    () => window.dispatchEvent(new Event("mp:changed")),
    [],
  );
  return (
    <Context.Provider
      value={{
        user,
        setUser,
        error,
        loading,
        initialize,
        notify,
        changed,
        guestAccess,
        setGuestAccess,
      }}
    >
      {children}
      {toast && (
        <div className={s.toast} role="status">
          <CheckCircle size={20} />
          {toast.message}
        </div>
      )}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
