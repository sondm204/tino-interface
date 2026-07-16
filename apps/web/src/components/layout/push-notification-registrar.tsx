"use client";

import { useEffect } from "react";
import { registerWebPushDevice } from "@/src/lib/push-notifications";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";

export function PushNotificationRegistrar() {
  const dispatch = useAppDispatch();
  const authHydrated = useAppSelector((state) => state.auth.hydrated);
  const userId = useAppSelector((state) => state.auth.user?.id);

  useEffect(() => {
    if (!authHydrated || !userId) {
      return;
    }

    registerWebPushDevice(dispatch).catch((error) => {
      console.warn("Could not register web push device", error);
    });
  }, [authHydrated, dispatch, userId]);

  return null;
}
