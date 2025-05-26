
import * as FileSystem from 'expo-file-system';

let lastFetchTime = 0;
let lastCoords = { lat: 0, lon: 0 };
let lastResults: SpeedCamera[] = [];

export const fetchSpeedCameras = async (
  latitude: number,
  longitude: number,
  radius = 1, // ~5km
  throttleMs = 10000 // don't re-fetch more often than this
): Promise<SpeedCamera[]> => {
  const now = Date.now();

  // If within throttle window, return cached
  if (now - lastFetchTime < throttleMs) {
    return lastResults;
  }

  // If already fetched nearby (within radius), return cached
  const isNearby =
    getDistanceFromLatLonInKm(latitude, longitude, lastCoords.lat, lastCoords.lon) <
    radius * 111; // approx. radius in km

  if (isNearby) {
    return lastResults;
  }

  const south = latitude - radius;
  const north = latitude + radius;
  const west = longitude - radius;
  const east = longitude + radius;

  const query = `
    [out:json];
    node["highway"="speed_camera"](${south},${west},${north},${east});
    out;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    const cameras = json.elements.map((el: any) => ({
      id: el.id,
      lat: el.lat,
      lon: el.lon,
    }));

    // Cache result
    lastFetchTime = now;
    lastCoords = { lat: latitude, lon: longitude };
    lastResults = cameras;

    return cameras;
  } catch (error) {
    console.error('Failed to fetch speed cameras:', error);
    return [];
  }
};

// 🔧 Helper to calculate distance in km between two coordinates
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}


const CAMERA_CACHE_PATH = FileSystem.documentDirectory + 'cameraCache.json';

export const saveCameraCache = async (data: SpeedCamera[]) => {
  await FileSystem.writeAsStringAsync(CAMERA_CACHE_PATH, JSON.stringify(data));
};

export const loadCameraCache = async (): Promise<SpeedCamera[]> => {
  try {
    const str = await FileSystem.readAsStringAsync(CAMERA_CACHE_PATH);
    return JSON.parse(str);
  } catch {
    return [];
  }
};



export type SpeedCamera = {
    id: number;
    lat: number;
    lon: number;
  };
  