// app/rooms/create.tsx
import { router } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
import { auth, db } from "../../firebase";

export default function CreateRoom() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Room name is required");
      return;
    }

    const uid = auth?.currentUser?.uid;
    if (!uid) {
      Alert.alert("Error", "You must be signed in to create a room");
      return;
    }

    try {
      setLoading(true);
      
      // Generate a random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      const roomRef = await addDoc(collection(db, "rooms"), {
        name: name.trim(),
        code,
        createdBy: uid,
        members: [uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        "Room Created!",
        `Room "${name}" created successfully!\n\nRoom Code: ${code}\n\nShare this code with others to invite them to your room.`,
        [
          {
            text: "Go to Room",
            onPress: () => router.push(`/room/${roomRef.id}`),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error creating room:", error);
      Alert.alert("Error", "Failed to create room. Please try again.");
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
          <Text style={styles.title}>Create New Room</Text>
          <Text style={styles.subtitle}>Set up a new collaboration space</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Room Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter room name"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
            onPress={createRoom}
            disabled={!name.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Room</Text>
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
