import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "../components/ErrorBoundary";

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // iOS-only keys; harmless on Android
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
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen 
            name="rooms" 
            options={{ 
              title: "Rooms",
              headerStyle: {
                backgroundColor: "#5C6BC0",
              },
              headerTintColor: "#fff",
              headerTitleStyle: {
                fontWeight: "bold",
              },
            }} 
          />
          <Stack.Screen 
            name="room/index" 
            options={{ 
              title: "Room",
              headerStyle: {
                backgroundColor: "#5C6BC0",
              },
              headerTintColor: "#fff",
              headerTitleStyle: {
                fontWeight: "bold",
              },
            }} 
          />
          <Stack.Screen 
            name="room/[roomId]" 
            options={{ 
              title: "Room",
              headerStyle: {
                backgroundColor: "#5C6BC0",
              },
              headerTintColor: "#fff",
              headerTitleStyle: {
                fontWeight: "bold",
              },
            }} 
          />
        </Stack>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
