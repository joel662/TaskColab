// app/room/index.tsx
import { Redirect } from 'expo-router';

export default function RoomIndex() {
  // This will redirect to the rooms list if someone tries to access /room without a roomId
  return <Redirect href="/rooms" />;
}
