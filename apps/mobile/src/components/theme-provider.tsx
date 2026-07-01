import { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationBar } from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useColorScheme } from "nativewind";
import { Platform } from "react-native";

const THEME_KEY = "tino-color-scheme";

type ThemeContextValue = {
  isDark: boolean;
  setDarkMode: (enabled: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [hydrated, setHydrated] = useState(false);
  const isDark = colorScheme === "dark";

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((storedTheme) => {
        setColorScheme(storedTheme === "dark" ? "dark" : "light");
      })
      .finally(() => setHydrated(true));
  }, [setColorScheme]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(isDark ? "#020617" : "#f8fafc");
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      setDarkMode: async (enabled) => {
        const nextTheme = enabled ? "dark" : "light";
        setColorScheme(nextTheme);
        await AsyncStorage.setItem(THEME_KEY, nextTheme);
      },
    }),
    [isDark, setColorScheme]
  );

  if (!hydrated) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {Platform.OS === "android" ? (
        <NavigationBar style={isDark ? "light" : "dark"} />
      ) : null}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
