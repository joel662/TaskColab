// app/room/[roomId].tsx

import {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";

import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
// @ts-ignore - Firebase auth type issues
import { auth, db } from "../../firebase";

// iOS-only inline picker (avoid mounting Android component)
let IOSDateTimePicker: any = null;
if (Platform.OS === "ios") {
  try {
    IOSDateTimePicker = require("@react-native-community/datetimepicker").default;
  } catch (error) {
    console.warn("DateTimePicker not available:", error);
  }
}


type UserDoc = { uid: string; displayName?: string; email?: string };
type Task = {
  id: string;
  title: string;
  description?: string;
  assignees: string[];
  status?: "todo" | "in_progress" | "done";
  dueAt?: any | null;
  reminderAt?: any | null;
  notificationId?: string | null;
  createdAt?: any;
  updatedAt?: any;
  createdBy: string;
  urgency?: "high" | "medium" | "low";
  tags?: string[];
  order?: number;
};

function tsToDate(ts: any | null | undefined): Date | null {
  if (!ts) return null;
  if (ts?.toDate) return ts.toDate(); // Firestore Timestamp
  if (typeof ts === "number") return new Date(ts);
  return null;
}

const URGENCY_COLOR: Record<NonNullable<Task["urgency"]>, string> = {
  high: "#ef4444",
  medium: "#3b82f6",
  low: "#22c55e",
};

// Preset reminder offsets in minutes (null = none)
const REMINDER_CHOICES: Array<{ label: string; minutes: number | null }> = [
  { label: "None", minutes: null },
  { label: "10m", minutes: 10 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "1d", minutes: 1440 },
];

export default function RoomDetail() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const uid = auth?.currentUser?.uid;

  console.log("RoomDetail - roomId:", roomId, "uid:", uid);

  const [roomName, setRoomName] = useState("");
  const [members, setMembers] = useState<UserDoc[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // view/filter
  const [onlyMine, setOnlyMine] = useState(false);
  // const [manualOrder, setManualOrder] = useState(true);

  // create modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false); // iOS only
  const [selectedUids, setSelectedUids] = useState<string[]>(uid ? [uid] : []);
  const [urgency, setUrgency] = useState<Task["urgency"]>("medium");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(["todo"]);
  const [reminderOffsetMin, setReminderOffsetMin] = useState<number | null>(30);


  /** ---- Load room & members ---- */
  useEffect(() => {
    if (!roomId) return;
    (async () => {
      try {
        const rs = await getDoc(doc(db, "rooms", String(roomId)));
        if (rs.exists()) {
          const r = rs.data() as any;
          setRoomName(r.name || "Room");
          const memberUids: string[] = r.members || [];
          const loaded: UserDoc[] = [];
          await Promise.all(
            memberUids.map(async (m) => {
              try {
                const u = await getDoc(doc(db, "users", m));
                if (u.exists()) {
                  const d = u.data() as any;
                  loaded.push({
                    uid: m,
                    displayName: d.displayName || undefined,
                    email: d.email || undefined,
                  });
                } else {
                  loaded.push({ uid: m });
                }
              } catch (error) {
                console.warn(`Failed to load user ${m}:`, error);
                loaded.push({ uid: m });
              }
            })
          );
          setMembers(loaded);
        }
      } catch (error) {
        console.error("Failed to load room:", error);
        setLoading(false);
      }
    })();
  }, [roomId]);

  /** ---- Live tasks (fallback if index missing) ---- */
  const [useFallbackQuery, setUseFallbackQuery] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const preferred: Query<DocumentData> = query(
      collection(db, "rooms", String(roomId), "tasks"),
      orderBy("order", "asc"),
      orderBy("createdAt", "desc")
    );
    const fallback: Query<DocumentData> = query(
      collection(db, "rooms", String(roomId), "tasks"),
      orderBy("createdAt", "desc")
    );

    const qToUse = useFallbackQuery ? fallback : preferred;

    if (unsubRef.current) unsubRef.current();

    const unsub = onSnapshot(
      qToUse,
      (snap) => {
        try {
          const list: Task[] = [];
          snap.forEach((d) => {
            try {
              list.push({ id: d.id, ...(d.data() as any) });
            } catch (error) {
              console.warn("Failed to parse task data:", error);
            }
          });
          setTasks(list);
          setLoading(false);
        } catch (error) {
          console.error("Error processing tasks snapshot:", error);
          setLoading(false);
        }
      },
      (err: any) => {
        if (err?.code === "failed-precondition" && !useFallbackQuery) {
          console.warn("[tasks] missing composite index; switching to fallback.");
          setUseFallbackQuery(true);
        } else {
          console.error("Tasks query error:", err);
          setLoading(false);
        }
      }
    );

    unsubRef.current = unsub;
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [roomId, useFallbackQuery]);

  /** ---- Derived view ---- */
  const urgencySorted = useMemo(() => {
    const now = Date.now();
    const rank = (u?: Task["urgency"]) => (u === "high" ? 3 : u === "medium" ? 2 : 1);
    return [...tasks].sort((a, b) => {
      const da = tsToDate(a.dueAt)?.getTime() ?? Infinity;
      const dbb = tsToDate(b.dueAt)?.getTime() ?? Infinity;
      const overA = da < now ? 1 : 0;
      const overB = dbb < now ? 1 : 0;
      if (overA !== overB) return overB - overA;
      const ua = rank(a.urgency);
      const ub = rank(b.urgency);
      if (ua !== ub) return ub - ua;
      if (da !== dbb) return da - dbb;
      const mineA = uid ? (a.assignees || []).includes(uid) : false;
      const mineB = uid ? (b.assignees || []).includes(uid) : false;
      if (mineA !== mineB) return mineA ? -1 : 1;
      const ca = tsToDate(a.createdAt)?.getTime() ?? 0;
      const cb = tsToDate(b.createdAt)?.getTime() ?? 0;
      return cb - ca;
    });
  }, [tasks, uid]);

  const viewTasks = useMemo(() => {
    const base = urgencySorted;
    return onlyMine && uid ? base.filter((t) => (t.assignees || []).includes(uid)) : base;
  }, [urgencySorted, onlyMine, uid]);

  /** ---- Helpers ---- */
  const memberLabel = (u: UserDoc) => u.displayName || u.email || u.uid.slice(0, 6);

  const toggleAssignee = (memberUid: string) => {
    setSelectedUids((prev) =>
      prev.includes(memberUid) ? prev.filter((u) => u !== memberUid) : [...prev, memberUid]
    );
  };

  const openNewTask = () => {
    setTitle("");
    setDesc("");
    setDueDate(null);
    setSelectedUids(uid ? [uid] : []);
    setUrgency("medium");
    setTags(["todo"]);
    setTagInput("");
    setReminderOffsetMin(30);
    setModalOpen(true);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (!tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  /** ---- iOS inline handler ---- */
  const onChangeDue = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") return;
    if (selectedDate) setDueDate(selectedDate);
  };

  /** ---- Android 2-step picker (date -> time) ---- */
  const androidPickingRef = useRef(false);
  const openAndroidDateTime = () => {
    if (androidPickingRef.current) return;
    
    try {
      androidPickingRef.current = true;

      const current = dueDate || new Date();

      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        display: "calendar",
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type !== "set" || !selectedDate) {
            androidPickingRef.current = false;
            return;
          }
          const base = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            current.getHours(),
            current.getMinutes(),
            0,
            0
          );

          setTimeout(() => {
            try {
              DateTimePickerAndroid.open({
                value: base,
                mode: "time",
                is24Hour: false,
                display: "spinner",
                onChange: (timeEvent: DateTimePickerEvent, time?: Date) => {
                  androidPickingRef.current = false;
                  if (timeEvent.type !== "set" || !time) return;

                  const finalDate = new Date(
                    base.getFullYear(),
                    base.getMonth(),
                    base.getDate(),
                    time.getHours(),
                    time.getMinutes(),
                    0,
                    0
                  );
                  setDueDate(finalDate);
                },
              });
            } catch (error) {
              console.error("Error opening time picker:", error);
              androidPickingRef.current = false;
            }
          }, 50);
        },
      });
    } catch (error) {
      console.error("Error opening date picker:", error);
      androidPickingRef.current = false;
    }
  };

  /** ---- Notifications helpers ---- */
  const ensureAndroidChannelAsync = async () => {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("due-reminders", {
        name: "Due Reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      });
    }
  };

  const scheduleReminderAsync = async (
    taskId: string,
    titleText: string,
    bodyText: string,
    remindAt: Date
  ) => {
    await ensureAndroidChannelAsync();

    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: remindAt,
      channelId: "due-reminders" as any, // Android only
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: titleText,
        body: bodyText,
        sound: "default",
        data: { taskId },
      },
      trigger,
    });
    return id;
  };

  const cancelReminderAsync = async (notificationId?: string | null) => {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {}
  };

  /** ---- Create task (with optional reminder) ---- */
  const createTask = async () => {
    if (!roomId || !uid) return alert("Not signed in");
    if (!title.trim()) return alert("Task title required");

    const status: Task["status"] = tags.includes("finished") ? "done" : "todo";
    const nextOrder = tasks.length ? Math.max(...tasks.map((t) => t.order ?? 0)) + 1 : 1;

    try {
      const newRef = await addDoc(collection(db, "rooms", String(roomId), "tasks"), {
        title: title.trim(),
        description: desc.trim(),
        createdBy: uid,
        assignees: selectedUids.length ? selectedUids : [uid],
        urgency,
        tags,
        status,
        order: nextOrder,
        dueAt: dueDate ? Timestamp.fromDate(dueDate) : null,
        reminderAt: null,
        notificationId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (dueDate && reminderOffsetMin != null) {
        const remindAt = new Date(dueDate.getTime() - reminderOffsetMin * 60 * 1000);
        if (remindAt.getTime() > Date.now()) {
          const notifId = await scheduleReminderAsync(
            newRef.id,
            "Task Reminder",
            `${title.trim()} is due at ${dueDate.toLocaleString()}`,
            remindAt
          );
          await updateDoc(newRef, {
            reminderAt: Timestamp.fromDate(remindAt),
            notificationId: notifId,
            updatedAt: serverTimestamp(),
          });
        }
      }

      setModalOpen(false);
    } catch (e: any) {
      alert(e.message || "Failed to create task");
    }
  };

  /** ---- Delete & mark done: cancel reminders ---- */
  const confirmDelete = (taskId: string) => {
    Alert.alert("Delete task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTask(taskId),
      },
    ]);
  };

  const deleteTask = async (taskId: string) => {
    if (!roomId) return;
    const t = tasks.find((x) => x.id === taskId);
    if (t?.notificationId) await cancelReminderAsync(t.notificationId);
    await deleteDoc(doc(db, "rooms", String(roomId), "tasks", taskId));
  };

  const markDone = async (taskId: string) => {
  if (!roomId) return;

  const t = tasks.find((x) => x.id === taskId);
  // cancel any scheduled reminder if we have one
  if (t?.notificationId) {
    await cancelReminderAsync(t.notificationId);
  }
  // if the task isn't in local state for some reason, still update Firestore
  await updateDoc(doc(db, "rooms", String(roomId), "tasks", taskId), {
    status: "done",
    tags: arrayUnion("finished"),
    updatedAt: serverTimestamp(),
    notificationId: null,
    reminderAt: null,
  });
};


  const onDragEnd = async ({ data }: { data: Task[] }) => {
    setTasks(data);
    await Promise.all(
      data.map((t, idx) =>
        updateDoc(doc(db, "rooms", String(roomId), "tasks", t.id), {
          order: idx + 1,
          updatedAt: serverTimestamp(),
        })
      )
    );
  };

  /** ---- Unified card renderer ---- */
  const renderTaskCard = (item: Task, drag?: () => void, isActive?: boolean) => {
    const due = tsToDate(item.dueAt);
    const overdue = !!due && due.getTime() < Date.now();
    const u = item.urgency || "medium";
    const color = overdue ? "#b91c1c" : URGENCY_COLOR[u];

    const assignedNames = (item.assignees || [])
      .map((x) => {
        const m = members.find((mm) => mm.uid === x);
        return m ? m.displayName || m.email || m.uid.slice(0, 6) : x.slice(0, 6);
      })
      .join(", ");

    return (
      <Pressable
        onLongPress={drag}
        disabled={!drag}
        style={[styles.card, { borderColor: color, opacity: isActive ? 0.85 : 1 }]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <View style={[styles.urgencyDot, { backgroundColor: color }]} />
        </View>

        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{due ? `Due: ${due.toLocaleString()}` : "No due date"}</Text>
          <Text style={styles.metaSmall}>{assignedNames || "No assignees"}</Text>
        </View>

        <View style={styles.tagRow}>
          {(item.tags || []).map((t) => (
            <View key={t} style={styles.tagChip}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rowEnd}>
          {item.status !== "done" && (
            <TouchableOpacity onPress={() => markDone(item.id)} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  // For DraggableFlatList (removed for Expo Go compatibility)
  // const renderDraggableItem = ({ item, drag, isActive }: RenderItemParams<Task>) =>
  //   renderTaskCard(item, drag, isActive);

  // For FlatList
  const renderFlatListItem: ListRenderItem<Task> = ({ item }) => renderTaskCard(item);

  /** ---- UI ---- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>{roomName}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* filters */}
      <View style={styles.filters}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Only my tasks</Text>
          <Switch value={onlyMine} onValueChange={setOnlyMine} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>
            Urgency order
            {useFallbackQuery ? "  • (fallback sort)" : ""}
          </Text>
        </View>
      </View>

      {/* list */}
      <FlatList
        data={viewTasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={renderFlatListItem}
        ListEmptyComponent={<Text style={styles.empty}>No tasks.</Text>}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openNewTask}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* New Task Modal */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Task</Text>

            <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Description (optional)"
              value={desc}
              onChangeText={setDesc}
              multiline
            />

            {/* due date/time */}
            <Text style={styles.sectionLabel}>Due date (optional)</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                style={[styles.smallBtn, { flex: 0 }]}
                onPress={() => {
                  if (Platform.OS === "android") openAndroidDateTime();
                  else setShowPicker(true);
                }}
              >
                <Text style={styles.smallBtnText}>{dueDate ? "Change" : "Pick"}</Text>
              </TouchableOpacity>
              <Text style={{ color: "#374151" }}>
                {dueDate ? dueDate.toLocaleString() : "No due date selected"}
              </Text>
            </View>

            {/* Inline picker rendered only on iOS */}
            {Platform.OS === "ios" && showPicker && IOSDateTimePicker && (
              <IOSDateTimePicker
                value={dueDate || new Date()}
                mode="datetime"
                display="inline"
                onChange={onChangeDue}
                minimumDate={new Date(Date.now() - 60 * 1000)}
              />
            )}

            {/* reminder */}
            <Text style={styles.sectionLabel}>Reminder</Text>
            <View style={styles.tagRow}>
              {REMINDER_CHOICES.map((opt) => {
                const selected = reminderOffsetMin === opt.minutes;
                return (
                  <Pressable
                    key={String(opt.minutes)}
                    onPress={() => setReminderOffsetMin(opt.minutes)}
                    style={[styles.tagChip, selected && styles.tagChipSelected]}
                  >
                    <Text style={[styles.tagText, selected && styles.tagTextSel]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* urgency */}
            <Text style={styles.sectionLabel}>Urgency</Text>
            <View style={styles.urgencyRow}>
              {(["high", "medium", "low"] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUrgency(u)}
                  style={[
                    styles.urgencyBtn,
                    urgency === u && { borderColor: URGENCY_COLOR[u], backgroundColor: "#eef2ff" },
                  ]}
                >
                  <View style={[styles.urgencyDot, { backgroundColor: URGENCY_COLOR[u], marginRight: 8 }]} />
                  <Text style={styles.urgencyText}>{u}</Text>
                </Pressable>
              ))}
            </View>

            {/* tags */}
            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.tagRow}>
              {["todo", "finished"].map((t) => {
                const selected = tags.includes(t);
                return (
                  <Pressable
                    key={t}
                    onPress={() =>
                      setTags((prev) => (selected ? prev.filter((x) => x !== t) : [...prev, t]))
                    }
                    style={[styles.tagChip, selected && styles.tagChipSelected]}
                  >
                    <Text style={[styles.tagText, selected && styles.tagTextSel]}>{t}</Text>
                  </Pressable>
                );
              })}
              {tags
                .filter((t) => !["todo", "finished"].includes(t))
                .map((t) => (
                  <Pressable
                    key={t}
                    onLongPress={() => removeTag(t)}
                    style={[styles.tagChip, styles.tagChipCustom]}
                  >
                    <Text style={styles.tagText}>{t}</Text>
                  </Pressable>
                ))}
            </View>

            {/* assignees */}
            <Text style={styles.sectionLabel}>Assign to</Text>
            <View style={styles.chipsRow}>
              {members.map((m) => {
                const selected = selectedUids.includes(m.uid);
                return (
                  <Pressable
                    key={m.uid}
                    onPress={() => toggleAssignee(m.uid)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSel]}>{memberLabel(m)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancel]} onPress={() => setModalOpen(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.create]} onPress={createTask}>
                <Text style={styles.modalBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** ---- Styles ---- */
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F8FC" },
  container: { flex: 1, backgroundColor: "#F7F8FC" },

  headerRow: {
    paddingTop: Platform.OS === "ios" ? 50 : 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { color: "#3949AB", fontWeight: "700" },
  header: { fontSize: 22, fontWeight: "800", color: "#1A237E" },

  filters: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  switchLabel: { color: "#374151", fontWeight: "700" },

  empty: { textAlign: "center", marginTop: 20, color: "#6B7280" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  taskTitle: { fontSize: 16, fontWeight: "700", color: "#111827", flex: 1, paddingRight: 12 },
  urgencyDot: { width: 12, height: 12, borderRadius: 6 },

  desc: { marginTop: 4, color: "#4B5563" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  meta: { color: "#374151", fontSize: 12, fontWeight: "600" },
  metaSmall: { color: "#6B7280", fontSize: 12 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tagChip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tagChipSelected: { backgroundColor: "#5C6BC0", borderColor: "#5C6BC0" },
  tagChipCustom: { backgroundColor: "#E0E7FF", borderColor: "#C7D2FE" },
  tagText: { color: "#111827", fontWeight: "600", fontSize: 12 },
  tagTextSel: { color: "#fff" },

  rowEnd: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 10 },
  doneBtn: { backgroundColor: "#10B981", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  doneBtnText: { color: "#fff", fontWeight: "700" },
  deleteBtn: { backgroundColor: "#ef4444", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  deleteBtnText: { color: "#fff", fontWeight: "700" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5C6BC0",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 28, marginTop: -2 },

  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12, color: "#111827" },

  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#E0E7FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    marginVertical: 6,
  },

  sectionLabel: { marginTop: 8, fontWeight: "700", color: "#374151" },
  urgencyRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  urgencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  urgencyText: { fontWeight: "700", color: "#111827", textTransform: "capitalize" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  chipSelected: { backgroundColor: "#5C6BC0", borderColor: "#5C6BC0" },
  chipText: { color: "#111827", fontWeight: "600" },
  chipTextSel: { color: "#fff" },

  // small button for pickers
  smallBtn: {
    backgroundColor: "#5C6BC0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnText: { color: "#fff", fontWeight: "700" },

  modalBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  cancel: { backgroundColor: "#E5E7EB" },
  create: { backgroundColor: "#5C6BC0" },
  modalBtnText: { color: "#111827", fontWeight: "700" },

  row: { flexDirection: "row", alignItems: "center" },
});
