// app/login.tsx
import { router } from "expo-router";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth } from "../firebase"; // adjust path if needed

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true); // while we check auth state

  useEffect(() => {
    const sub = onAuthStateChanged(auth, (u) => {
      if (u) {
        router.replace("/rooms"); // already signed in → go to Rooms
      } else {
        setBooting(false);
      }
    });
    return sub;
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/rooms"); // success → go to Rooms
    } catch (err: any) {
      alert("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* soft background orbs */}
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />

      <KeyboardAvoidingView
        style={{ flex: 1, width: "100%" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.wrap}>
          <View style={styles.card}>
            <>
              <Text style={styles.brand}>TaskColab</Text>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>

              <View style={styles.inputRow}>
                <Text style={styles.inputIcon}>@</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#9aa3b2"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.inputIcon}>••</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#9aa3b2"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, (loading || !email || !password) && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading || !email || !password}
                activeOpacity={0.9}
              >
                {loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Sign In</Text>}
              </TouchableOpacity>

              <Text style={styles.hint}>Tip: use the same email you signed up with.</Text>
            </>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ACCENT = "#5C6BC0"; // indigo vibe
const BG = "#0f172a"; // slate-900
const CARD = "#0b1224"; // deep slate/indigo
const BORDER = "#1e2640";
const TEXT = "#e5e7eb";
const MUTED = "#9aa3b2";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  bgOrbA: {
    position: "absolute", top: -80, right: -60, width: 220, height: 220, borderRadius: 999,
    backgroundColor: ACCENT, opacity: 0.12,
  },
  bgOrbB: {
    position: "absolute", bottom: -100, left: -80, width: 280, height: 280, borderRadius: 999,
    backgroundColor: "#22d3ee", opacity: 0.08,
  },
  card: {
    width: "100%", maxWidth: 420, backgroundColor: CARD, borderColor: BORDER, borderWidth: 1,
    padding: 22, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 }, elevation: 10,
  },
  brand: {
    color: TEXT, fontSize: 14, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase",
    opacity: 0.9, marginBottom: 6,
  },
  title: { color: TEXT, fontSize: 26, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: MUTED, fontSize: 14, marginBottom: 22 },
  inputRow: {
    flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    backgroundColor: "#0e1832", marginBottom: 14, paddingHorizontal: 12, height: 52,
  },
  inputIcon: { color: MUTED, fontSize: 16, width: 22, textAlign: "center", marginRight: 6 },
  input: { flex: 1, color: TEXT, fontSize: 15, paddingVertical: 8 },
  button: {
    height: 52, backgroundColor: ACCENT, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  hint: { color: MUTED, fontSize: 12, textAlign: "center", marginTop: 12 },
});
