import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { tinoApi, type RegisterPushDevicePayload } from "@/services/tino-api";

const PUSH_DEVICE_ID_KEY = "tino-push-device-id";

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
  console.info("Push device registration started", {
    isDevice: Device.isDevice,
    platform: Platform.OS,
  });
  if (Platform.OS === "web") {
    console.info("Push device registration skipped on web platform");
    return { registered: false };
  }

  if (Platform.OS === "android") {
    console.info("Configuring Android notification channel");
    await Notifications.setNotificationChannelAsync("default", {
      name: "Thông báo",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const hasPermission = await ensureNotificationPermission();
  console.info("Push notification permission checked", { hasPermission });

  if (!hasPermission) {
    return { registered: false };
  }

  console.info("Requesting native push token");
  const token = await Notifications.getDevicePushTokenAsync();
  console.info("Native push token acquired", {
    hasToken: Boolean(token.data),
    type: token.type,
  });
  const deviceId = await getPushDeviceId();
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const payload: RegisterPushDevicePayload = {
    device_id: deviceId,
    platform,
    fcm_token: token.data,
    app_version: Constants.expoConfig?.version ?? null,
    device_name: Device.deviceName ?? Device.modelName ?? null,
  };

  console.info("Saving push device to API", {
    hasToken: Boolean(payload.fcm_token),
    platform: payload.platform,
  });
  await tinoApi.registerPushDevice(payload);
  console.info("Push device saved to API");

  return { registered: true };
}

export async function unregisterCurrentPushDevice() {
  const deviceId = await AsyncStorage.getItem(PUSH_DEVICE_ID_KEY);

  if (!deviceId) {
    return { revoked: 0 };
  }

  const response = await tinoApi.unregisterPushDevice(deviceId);
  return response.data ?? { revoked: 0 };
}
