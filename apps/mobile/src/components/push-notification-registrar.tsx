import { useEffect } from "react";
import { registerPushDevice } from "@/lib/push-notifications";
import { useAppSelector } from "@/store/hooks";

export function PushNotificationRegistrar() {
  const hydrated = useAppSelector((state) => state.auth.hydrated);
  const userId = useAppSelector((state) => state.auth.user?.id);

  useEffect(() => {
    if (!hydrated || !userId) {
      return;
    }

    registerPushDevice().catch((error) => {
      console.warn("Could not register push device", error);
    });
  }, [hydrated, userId]);

  return null;
}
