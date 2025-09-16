// app/rooms/create.tsx
import { router } from "expo-router";
import {
    addDoc,
    collection,
    getDocs,
    query,
    serverTimestamp,
    where
} from "firebase/firestore";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../../../firebase"; // adjust path if needed

function genCode(len = 6) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function CreateRoom() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const uid = auth.currentUser?.uid;

  const onCreate = async () => {
    if (!uid) return alert("Not signed in");
    if (!name.trim()) return alert("Room name required");
    setBusy(true);

    try {
      // ensure unique short code
      let code = genCode();
      let exists = true;
      while (exists) {
        const snap = await getDocs(query(collection(db, "rooms"), where("code", "==", code)));
        if (snap.empty) exists = false; else code = genCode();
      }

      const ref = await addDoc(collection(db, "rooms"), {
        name: name.trim(),
        code,
        createdBy: uid,
        members: [uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // optional: add to users/{uid}.rooms if you track it there
      alert(`Room created!\nShare this code: ${code}`);
      // go to the room list (or router.replace(`/room/${ref.id}`) to enter directly)
      router.replace("/rooms");
    } catch (e: any) {
      alert(e.message || "Failed to create room");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a Room</Text>
      <TextInput
        style={styles.input}
        placeholder="Room name"
        value={name}
        onChangeText={setName}
      />
      <TouchableOpacity
        style={[styles.button, (!name || busy) && styles.disabled]}
        onPress={onCreate}
        disabled={!name || busy}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.link}>
        <Text style={styles.linkText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:"center", alignItems:"center", padding:24, backgroundColor:"#F7F8FC" },
  title:{ fontSize:24, fontWeight:"800", color:"#1A237E", marginBottom:16 },
  input:{
    width:"90%", height:52, borderWidth:1.5, borderColor:"#E0E7FF",
    borderRadius:12, paddingHorizontal:14, backgroundColor:"#fff", marginBottom:12
  },
  button:{ width:"90%", backgroundColor:"#5C6BC0", paddingVertical:16, borderRadius:12, alignItems:"center", marginTop:6 },
  disabled:{ opacity:0.6 },
  btnText:{ color:"#fff", fontWeight:"700", fontSize:16 },
  link:{ marginTop:14 },
  linkText:{ color:"#3949AB", fontWeight:"700" },
});
