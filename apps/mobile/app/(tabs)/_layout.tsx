import { Tabs } from "expo-router";
import { AppWindow, LayoutDashboard, UserCircle, Wallet } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarStyle: {
          borderTopColor: "#e2e8f0",
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallets"
        options={{
          title: "Ví",
          tabBarIcon: ({ color, size }) => (
            <Wallet color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="features"
        options={{
          title: "Chức năng",
          tabBarIcon: ({ color, size }) => (
            <AppWindow color={String(color)} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <UserCircle color={String(color)} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
