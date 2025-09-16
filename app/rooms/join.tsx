// app/rooms/join.tsx
import { router } from "expo-router";
import { arrayUnion, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore - Firebase auth type issues
import { auth, db } from "../../firebase";

export default function JoinRoom() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const joinRoom = async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Room code is required");
      return;
    }

    const uid = auth?.currentUser?.uid;
    if (!uid) {
      Alert.alert("Error", "You must be signed in to join a room");
      return;
    }

    try {
      setLoading(true);
      
      // Find room by code using a query
      const roomsQuery = query(collection(db, "rooms"), where("code", "==", code));
      const querySnapshot = await getDocs(roomsQuery);
      
      if (querySnapshot.empty) {
        Alert.alert("Error", "Room not found. Please check the code and try again.");
        return;
      }

      // Get the first (and should be only) room with this code
      const roomDoc = querySnapshot.docs[0];
      const roomData = roomDoc.data();
      const roomId = roomDoc.id;
      
      // Check if user is already a member
      if (roomData.members && roomData.members.includes(uid)) {
        Alert.alert(
          "Already a Member",
          "You are already a member of this room.",
          [
            {
              text: "Go to Room",
              onPress: () => router.push(`/room/${roomId}`),
            },
          ]
        );
        return;
      }

      // Add user to room using the document ID
      await updateDoc(doc(db, "rooms", roomId), {
        members: arrayUnion(uid),
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        "Success!",
        `You have successfully joined "${roomData.name}"!`,
        [
          {
            text: "Go to Room",
            onPress: () => router.push(`/room/${roomId}`),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error joining room:", error);
      Alert.alert("Error", "Failed to join room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Join a Room</Text>
          <Text style={styles.subtitle}>Enter the room code to join</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Room Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit room code"
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!code.trim() || loading) && styles.buttonDisabled]}
            onPress={joinRoom}
            disabled={!code.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Join Room</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A237E",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    textAlign: "center",
    letterSpacing: 2,
  },
  button: {
    backgroundColor: "#5C6BC0",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: {
    color: "#6B7280",
    fontSize: 16,
  },
});
