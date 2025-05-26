import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import MapView, { Polyline, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import RecordButton from '@/components/RecordingButton';
import Toast from 'react-native-toast-message';
import { fetchSpeedCameras, SpeedCamera } from '@/utils/fetchSpeedCameras';
import { checkCameraProximity } from '@/utils/checkCameraProximity';

//micro ddd, solid, api, grpc services, rabbit mq, 
//queue message, why use them, 
//rest api best practies, 
//identity proviedr identity service, 
//observables, flow uri, trigger, proceduri stocate

export default function HomeScreen() {
  const [recording, setRecording] = useState(false);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [tripData, setTripData] = useState<Location.LocationObjectCoords[]>([]);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [speedCameras, setSpeedCameras] = useState<SpeedCamera[]>([]);
  const [tripStartTime, setTripStartTime] = useState<number | null>(null);
  const mapRef = useRef<MapView>(null);

  const toggleRecording = async () => {
    setTripData([]);
    if (!recording) {
      setTripStartTime(Date.now());

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => {
          if (loc?.coords) {
            setTripData((prev) => [...prev, loc.coords]);
            setLocation(loc.coords);
            setSpeed(loc.coords.speed ?? 0);
          }
        }
      );
      setLocationSubscription(subscription);
    } 
    else {
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }
      const computedTripData = computeTripData(tripData);

      console.log("computed" + JSON.stringify(computedTripData))

      await saveTripLocally(computedTripData);

      setTripStartTime(null);

      setTripData([]); // Clear the line after saving
    }

    setRecording(!recording);
  };

  const computeTripData = (tripData: any) => {
    if (tripData.length > 1) {
      const speeds = tripData.map((p: { speed: any; }) => p.speed ?? 0);
      const maxSpeed = Math.max(...speeds);
      const avgSpeed = speeds.reduce((a: any, b: any) => a + b, 0) / speeds.length;

      // G-force: Δv / Δt (rough estimate)
      const gForces: number[] = [];
      for (let i = 1; i < tripData.length; i++) {
        const v1 = tripData[i - 1].speed ?? 0;
        const v2 = tripData[i].speed ?? 0;
        const dt = 1; // assuming 1 sec between points
        const a = (v2 - v1) / dt;
        const g = Math.abs(a / 9.81);
        gForces.push(g);
      }
      const maxG = Math.max(...gForces);
      const avgG = gForces.reduce((a, b) => a + b, 0) / gForces.length;

      // Time
      const startTime = tripStartTime!;
      const endTime = Date.now();
      const timeElapsedMs = endTime - startTime;
      const h = Math.floor(timeElapsedMs / 3600000);
      const m = Math.floor((timeElapsedMs % 3600000) / 60000);
      const s = Math.floor((timeElapsedMs % 60000) / 1000);
      const timeElapsedFormatted = `${h}h ${m}m ${s}s`;

      // Distance
      const toRad = (value: number) => (value * Math.PI) / 180;

      const calcDistance = (p1: Location.LocationObjectCoords, p2: Location.LocationObjectCoords) => {
        const R = 6371; // km
        const dLat = toRad(p2.latitude - p1.latitude);
        const dLon = toRad(p2.longitude - p1.longitude);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(p1.latitude)) *
          Math.cos(toRad(p2.latitude)) *
          Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      let totalDistance = 0;
      for (let i = 1; i < tripData.length; i++) {
        totalDistance += calcDistance(tripData[i - 1], tripData[i]);
      }

      const tripStats = {
        id: Date.now(),
        date: new Date(startTime).toISOString(),
        startTime,
        endTime,
        duration: timeElapsedFormatted,
        maxSpeed: (maxSpeed * 3.6).toFixed(1), // km/h
        avgSpeed: (avgSpeed * 3.6).toFixed(1),
        maxG: maxG.toFixed(2),
        avgG: avgG.toFixed(2),
        distanceKm: totalDistance.toFixed(2),
        points: tripData,
      };

      return tripStats;
    }
  }

  const recenterMap = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
      });
    }
  };

  const saveTripLocally = async (tripData: any) => {
    const filename = `${Date.now()}.json`;
    const path = FileSystem.documentDirectory + filename;

    try {
      await FileSystem.writeAsStringAsync(path, JSON.stringify(tripData));
      console.log('Trip saved to:', path);
      Toast.show({
        type: 'success',
        text1: 'Trip saved!',
        text2: 'Your trip has been recorded and saved locally.',
        position: 'top',
      });
    } catch (error) {
      console.error('Error saving trip:', error);
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Permission result:', status);

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'You must enable location permissions in settings to use Travax.',
        );
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({});
        if (currentLocation?.coords) {
          setLocation(currentLocation.coords);
        } else {
          Alert.alert('Location Error', 'Unable to fetch current location.');
        }
      } catch (error) {
        console.error('Location fetch error:', error);
        Alert.alert('Location Error', 'An error occurred while fetching location.');
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => {
          if (loc?.coords) {
            setTripData((prev) => [...prev, loc.coords]);
            setLocation(loc.coords);
            setSpeed(loc.coords.speed ?? 0);

            checkCameraProximity(loc.coords.latitude, loc.coords.longitude, speedCameras);// your state that holds camera data

            // 👇 Center the map
            mapRef.current?.animateCamera({
              center: {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              },
              heading: loc.coords.heading ?? 0,
              zoom: 17,
              pitch: 30,
              altitude: 5000,
            }, { duration: 1000 });

          }
        }
      );
    })();
  }, []);

  useEffect(() => {
    if (!location) return;

    const loadCameras = async () => {
      const cameras = await fetchSpeedCameras(location.latitude, location.longitude);
      setSpeedCameras(cameras);
    };

    loadCameras();
  }, [location]);

  const defaultRegion = {
    latitude: 46.766667,
    longitude: 23.6,
    latitudeDelta: 0.015,
    longitudeDelta: 0.0121,
  };

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={true}
        userInterfaceStyle='dark'
        initialRegion={location ? { ...location, latitudeDelta: 0.015, longitudeDelta: 0.0121 } : defaultRegion}
      >
        <UrlTile
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {tripData.length > 1 && recording && (
          <>
            {/* Outer "glow" line (fatter and semi-transparent using alpha in color) */}
            <Polyline
              coordinates={tripData}
              strokeColor="rgba(57, 255, 20, 0.3)" // neon green glow
              strokeWidth={10}
            />

            {/* Inner solid line */}
            <Polyline
              coordinates={tripData}
              strokeColor="#39FF14"
              strokeWidth={4}
            />
          </>
        )}
      </MapView>
      {speed !== null && (
        <View style={styles.speedBox}>
          <Text style={styles.speedText}>{(speed * 3.6).toFixed(1)}</Text>
          <Text style={styles.kmText}>km/h</Text>
        </View>
      )}
      <Pressable
        style={({ pressed }) => [styles.recenterIcon, { opacity: pressed ? 0.7 : 0.9 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
          recenterMap();
        }}
      >
        <FontAwesome name="crosshairs" size={32} color="#39FF14" />
      </Pressable>
      <Pressable
        style={() => [styles.recordIcon]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
          toggleRecording();
        }}>
        <RecordButton onPress={toggleRecording} active={recording} />
      </Pressable>
      <View style={styles.tripStats}>
              <View style={styles.statItem}>
                <Ionicons name="speedometer-outline" size={24} color="#3498db" />
                <Text style={styles.statValue}>{speed}</Text>
                <Text style={styles.statLabel}>Avg Speed</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="map-outline" size={24} color="#3498db" />
                <Text style={styles.statValue}>{}</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={24} color="#3498db" />
                <Text style={styles.statValue}>
                  x
                </Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
            </View>
    </View>
    
    
  );
}

const styles = StyleSheet.create({
  speedBox: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: '#121212',
    width: 75,
    height: 75,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#FF00FF',
    borderWidth: 2,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    opacity: 0.9
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  speedText: {
    color: '#fff',
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 24,
  },
  kmText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 12,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  recenterIcon: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    backgroundColor: '#2c2c2c',
    padding: 16,
    borderRadius: 50,
    zIndex: 10,
    opacity: 0.9
  },
  recordIcon: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    zIndex: 10,
  }
});

