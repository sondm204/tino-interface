import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { tinoApi, type RegisterPushDevicePayload } from "@/services/tino-api";

const PUSH_DEVICE_ID_KEY = "tino-push-device-id";
const PUSH_NOTIFICATIONS_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS === "true";

function isExpoGo() {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

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

async function ensureNotificationPermission(
  Notifications: typeof import("expo-notifications")
) {
  const existing = await Notifications.getPermissionsAsync();

  if (existing.status === "granted") {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function registerPushDevice() {
  if (!PUSH_NOTIFICATIONS_ENABLED) {
    return { registered: false };
  }

  if (Platform.OS === "web" || isExpoGo()) {
    return { registered: false };
  }

  const Notifications = await import("expo-notifications");

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Thông báo",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const hasPermission = await ensureNotificationPermission(Notifications);

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

  await tinoApi.registerPushDevice(payload);

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
