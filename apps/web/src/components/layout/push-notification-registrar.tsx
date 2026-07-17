"use client";

import { useEffect } from "react";
import { registerWebPushDevice } from "@/src/lib/push-notifications";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";

export function PushNotificationRegistrar() {
  const dispatch = useAppDispatch();
  const authHydrated = useAppSelector((state) => state.auth.hydrated);
  const userId = useAppSelector((state) => state.auth.user?.id);

  useEffect(() => {
    console.info("Web push registrar state", {
      authHydrated,
      hasUser: Boolean(userId),
    });

    if (!authHydrated || !userId) {
      return;
    }

    registerWebPushDevice(dispatch)
      .then((result) => {
        if (!result.registered) {
          console.warn("Web push device was not registered", result);
        }
      })
      .catch((error) => {
        console.warn("Could not register web push device", error);
      });
  }, [authHydrated, dispatch, userId]);

  return null;
}
