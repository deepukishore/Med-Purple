import { useState, useEffect, useCallback } from "react";
import { useIsFocused } from "@react-navigation/native";
import { api, useApp } from "../context/AppContext";
export default function useData(path) {
  const [state, setState] = useState({ data: null, loading: true, error: "" }),
    [refresh, setRefresh] = useState(0);
  const focused = useIsFocused();
  const { revision } = useApp();
  const reload = useCallback(() => setRefresh((x) => x + 1), []);
  useEffect(() => {
    if (path === "/progress" || path.startsWith("/profiles"))
      return api.subscribe?.(reload);
  }, [path, reload]);
  useEffect(() => {
    if (!focused) return;
    let active = true;
    setState((x) => ({ ...x, loading: true, error: "" }));
    api
      .get(path)
      .then((data) => {
        if (active) setState({ data, loading: false, error: "", path });
      })
      .catch((e) => {
        if (active)
          setState((x) => ({ ...x, loading: false, error: e.message, path }));
      });
    return () => {
      active = false;
    };
  }, [path, refresh, focused, revision]);
  return {
    ...state,
    data: state.path === path ? state.data : null,
    loading: state.loading || state.path !== path,
    error: state.path === path ? state.error : "",
    reload,
  };
}
