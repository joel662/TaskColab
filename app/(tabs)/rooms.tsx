// app/rooms.tsx
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  DocumentData,
  FirestoreError,
  onSnapshot,
  orderBy,
  query,
  Query,
  where,
} from "firebase/firestore";
import { auth, db } from "../../firebase"; // adjust if needed

type Room = {
  id: string;
  name: string;
  code?: string;
  createdBy: string;
  members: string[];
  createdAt?: any;
  updatedAt?: any;
};

export default function Rooms() {
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [debug, setDebug] = useState<string>("");

  // 1) Wait for Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // 2) Subscribe to rooms once we have a UID
  useEffect(() => {
    if (!authReady) return;

    if (!uid) {
      setRooms([]);
      setLoading(false);
      setDebug("No user; redirect to /login");
      return;
    }

    // Preferred query: needs composite index (members array-contains + orderBy updatedAt)
    const preferred: Query<DocumentData> = query(
      collection(db, "rooms"),
      where("members", "array-contains", uid),
      orderBy("updatedAt", "desc")
    );

    // Fallback query: no orderBy — avoids composite index
    const fallback: Query<DocumentData> = query(
      collection(db, "rooms"),
      where("members", "array-contains", uid)
    );

    const q = useFallback ? fallback : preferred;
    setLoading(true);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Room[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));

        // If we’re using fallback (no orderBy on server), sort client-side by updatedAt desc
        const sorted = useFallback
          ? [...list].sort((a, b) => {
              const ta =
                a.updatedAt?.toMillis?.() ??
                (a.updatedAt?._seconds ? a.updatedAt._seconds * 1000 : 0);
              const tb =
                b.updatedAt?.toMillis?.() ??
                (b.updatedAt?._seconds ? b.updatedAt._seconds * 1000 : 0);
              return tb - ta;
            })
          : list;

        setRooms(sorted);
        setLoading(false);
        setDebug(
          `${sorted.length} room(s) loaded ${
            useFallback ? "(fallback sort)" : "(indexed sort)"
          }`
        );
      },
      (e: FirestoreError) => {
        if (e.code === "failed-precondition" && !useFallback) {
          // Missing composite index, switch to fallback automatically
          setUseFallback(true);
          setDebug(
            "Composite index missing for rooms. Using fallback query without orderBy(updatedAt)."
          );
        } else {
          console.warn(e);
          setLoading(false);
          setDebug(`Error: ${e.code} — ${e.message}`);
        }
      }
    );

    return unsub;
  }, [authReady, uid, useFallback]);

  // 3) UI
  if (!authReady || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>&nbsp;{debug}</Text>
      </View>
    );
  }

  if (!uid) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>You’re not signed in</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.btnText}>Go to Login</Text>
        </TouchableOpacity>
        {debug ? <Text style={styles.muted}>{debug}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Your Rooms {useFallback ? "•" : ""}
      </Text>
      {debug ? <Text style={[styles.muted, { paddingHorizontal: 16 }]}>{debug}</Text> : null}

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No rooms yet — create or join one!
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.roomItem}
            onPress={() => router.push(`/room/${item.id}`)}
          >
            <Text style={styles.roomName}>{item.name}</Text>
            {item.code ? (
              <Text style={styles.roomCode}>Code: {item.code}</Text>
            ) : null}
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.create]}
          onPress={() => router.push("/rooms/create")}
        >
          <Text style={styles.actionText}>Create Room</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.join]}
          onPress={() => router.push("/rooms/join")}
        >
          <Text style={styles.actionText}>Join Room</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F8FC" },
  container: { flex: 1, backgroundColor: "#F7F8FC", paddingTop: 16 },
  title: { fontSize: 18, color: "#1F2937", fontWeight: "700" },
  header: { fontSize: 28, fontWeight: "800", color: "#1A237E", paddingHorizontal: 16, marginBottom: 8 },
  muted: { color: "#6B7280", fontSize: 12, marginTop: 6 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 10 },
  roomItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  roomName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  roomCode: { marginTop: 4, color: "#6B7280" },
  actions: { padding: 16, gap: 10 },
  actionBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  actionText: { color: "#fff", fontWeight: "700" },
  create: { backgroundColor: "#5C6BC0" },
  join: { backgroundColor: "#3949AB" },
  btn: { backgroundColor: "#5C6BC0", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
});
