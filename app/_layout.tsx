import { Stack } from "expo-router";
import React from "react";
import "react-native-gesture-handler";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="room/[roomId]" options={{ title: "Room" }} />
    </Stack>
  );
}
