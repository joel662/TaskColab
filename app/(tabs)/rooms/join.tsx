// app/rooms/join.tsx
import { router } from "expo-router";
import {
  arrayUnion,
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../../../firebase"; // adjust path if needed

export default function JoinRoom() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const uid = auth.currentUser?.uid;

  const onJoin = async () => {
    if (!uid) return alert("Not signed in");
    const c = code.trim().toUpperCase();
    if (!c) return alert("Enter a room code");
    setBusy(true);

    try {
      const snap = await getDocs(query(collection(db, "rooms"), where("code", "==", c)));
      if (snap.empty) throw new Error("Room code not found");

      const docRef = snap.docs[0].ref;
      const room = snap.docs[0].data() as any;
      const members: string[] = room.members || [];

      if (!members.includes(uid)) {
        await updateDoc(docRef, {
          members: arrayUnion(uid),
          updatedAt: serverTimestamp(),
        });
      }

      alert(`Joined room: ${room.name}`);
      // Navigate to the room (or back to list)
      // router.replace("/rooms");
      router.replace({
  pathname: "/room/[roomId]",
  params: { roomId: docRef.id },
});
    } catch (e: any) {
      alert(e.message || "Failed to join room");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a Room</Text>
      <Text style={styles.sub}>Enter the code you received</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. ABC234"
        autoCapitalize="characters"
        value={code}
        onChangeText={setCode}
      />
      <TouchableOpacity
        style={[styles.button, (!code || busy) && styles.disabled]}
        onPress={onJoin}
        disabled={!code || busy}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Join</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.link}>
        <Text style={styles.linkText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:"center", alignItems:"center", padding:24, backgroundColor:"#F7F8FC" },
  title:{ fontSize:24, fontWeight:"800", color:"#1A237E", marginBottom:6 },
  sub:{ color:"#6B7280", marginBottom:16 },
  input:{
    width:"90%", height:52, borderWidth:1.5, borderColor:"#E0E7FF",
    borderRadius:12, paddingHorizontal:14, backgroundColor:"#fff", marginBottom:12
  },
  button:{ width:"90%", backgroundColor:"#3949AB", paddingVertical:16, borderRadius:12, alignItems:"center", marginTop:6 },
  disabled:{ opacity:0.6 },
  btnText:{ color:"#fff", fontWeight:"700", fontSize:16 },
  link:{ marginTop:14 },
  linkText:{ color:"#3949AB", fontWeight:"700" },
});
