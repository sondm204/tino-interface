import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiRequest } from "@/lib/api-client";

const PUSH_DEVICE_ID_KEY = "tino-push-device-id";

type RegisterPushDevicePayload = {
  device_id: string;
  platform: "ios" | "android" | "web";
  fcm_token: string;
  app_version?: string | null;
  device_name?: string | null;
};

function createDeviceId() {
  return [
    "device",
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
  ].join("-");
}

export async function getPushDeviceId() {
  const current = await AsyncStorage.getItem(PUSH_DEVICE_ID_KEY);

  if (current) {
    return current;
  }

  const next = createDeviceId();
  await AsyncStorage.setItem(PUSH_DEVICE_ID_KEY, next);
  return next;
}

async function ensureNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();

  if (existing.status === "granted") {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function registerPushDevice() {
  if (Platform.OS === "web" || !Device.isDevice) {
    return { registered: false };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Thông báo",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const hasPermission = await ensureNotificationPermission();

  if (!hasPermission) {
    return { registered: false };
  }

  const token = await Notifications.getDevicePushTokenAsync();
  const deviceId = await getPushDeviceId();
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const payload: RegisterPushDevicePayload = {
    device_id: deviceId,
    platform,
    fcm_token: token.data,
    app_version: Constants.expoConfig?.version ?? null,
    device_name: Device.deviceName ?? Device.modelName ?? null,
  };

  await apiRequest("/api/push-devices", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return { registered: true };
}

export async function unregisterCurrentPushDevice() {
  const deviceId = await AsyncStorage.getItem(PUSH_DEVICE_ID_KEY);

  if (!deviceId) {
    return { revoked: 0 };
  }

  const response = await apiRequest<{ revoked: number }>(
    `/api/push-devices/${encodeURIComponent(deviceId)}`,
    { method: "DELETE" }
  );

  return response.data ?? { revoked: 0 };
}
