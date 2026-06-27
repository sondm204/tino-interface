"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { getStoredCurrentUser } from "@/src/lib/api-client";
import { hydrateAuth } from "@/src/store/auth-slice";
import { makeStore, type AppStore } from "@/src/store/store";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState<AppStore>(makeStore);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      store.dispatch(hydrateAuth(getStoredCurrentUser()));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
