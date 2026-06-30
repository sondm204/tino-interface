import { useEffect } from "react";
import { Provider } from "react-redux";
import { getStoredCurrentUser } from "@/lib/api-client";
import { hydrateAuth } from "@/store/auth-slice";
import { store } from "@/store/store";

function AuthHydrator() {
  useEffect(() => {
    getStoredCurrentUser().then((user) => {
      store.dispatch(hydrateAuth(user));
    });
  }, []);

  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthHydrator />
      {children}
    </Provider>
  );
}
