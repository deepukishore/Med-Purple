import { useEffect, useState, useCallback } from "react";
import { api } from "../context/AppContext";
export default function useData(path) {
  const [state, setState] = useState({ data: null, loading: true, error: "" }),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    if (path === "/progress" || path.startsWith("/profiles"))
      return api.subscribe?.(reload);
  }, [path, reload]);
  useEffect(() => {
    window.addEventListener("mp:changed", reload);
    return () => window.removeEventListener("mp:changed", reload);
  }, [reload]);
  useEffect(() => {
    let active = true;
    setState((old) => ({ ...old, loading: true, error: "" }));
    api
      .get(path)
      .then(
        (data) => active && setState({ data, loading: false, error: "", path }),
      )
      .catch(
        (e) =>
          active &&
          setState((old) => ({
            ...old,
            loading: false,
            error: e.message,
            path,
          })),
      );
    return () => {
      active = false;
    };
  }, [path, revision]);
  return {
    ...state,
    data: state.path === path ? state.data : null,
    loading: state.loading || state.path !== path,
    error: state.path === path ? state.error : "",
    reload,
  };
}
