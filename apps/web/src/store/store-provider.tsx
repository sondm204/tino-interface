"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { getStoredCurrentUser } from "@/src/lib/api-client";
import {
  clearCurrentUser,
  hydrateAuth,
} from "@/src/store/auth-slice";
import { makeStore, type AppStore } from "@/src/store/store";
import { tinoApiSlice } from "@/src/store/tino-api-slice";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState<AppStore>(makeStore);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      store.dispatch(hydrateAuth(getStoredCurrentUser()));
    });
    const handleAuthExpired = () => {
      store.dispatch(clearCurrentUser());
      store.dispatch(tinoApiSlice.util.resetApiState());
    };

    window.addEventListener("tino-auth-expired", handleAuthExpired);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("tino-auth-expired", handleAuthExpired);
    };
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
