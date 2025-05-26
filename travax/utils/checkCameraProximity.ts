import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { SpeedCamera } from './fetchSpeedCameras';

// Use a Set to remember which cameras have already been triggered
const triggered = new Set<number>();

export const checkCameraProximity = (
  userLat: number,
  userLon: number,
  cameras: SpeedCamera[],
  radiusKm = 0.05 // 50 meters
) => {
  for (const cam of cameras) {
    const distance = getDistanceFromLatLonInKm(userLat, userLon, cam.lat, cam.lon);

    if (distance <= radiusKm && !triggered.has(cam.id)) {
      triggered.add(cam.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      Toast.show({
        type: 'info',
        text1: 'Speed Camera Ahead',
        text2: 'Slow down to avoid fines 🚨',
        position: 'top',
      });
    }
  }
};

// Helper to calculate distance between two coordinates
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
