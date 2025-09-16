// app/_layout.tsx
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // Newer type defs also include these iOS-specific flags:
    // (safe to always include; Android ignores them)
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
      // Ask permissions at startup (iOS shows prompt; Android is auto-granted)
      (async () => {
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing !== "granted") {
          await Notifications.requestPermissionsAsync();
        }
        // Android: ensure a channel with sound
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("due-reminders", {
            name: "Due Reminders",
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: "default",
          });
        }
      })();
    }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    
    </GestureHandlerRootView>
  );
}
