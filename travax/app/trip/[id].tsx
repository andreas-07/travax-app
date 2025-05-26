import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Polyline } from 'react-native-maps';
import { listTrips, deleteTrip, exportTrip } from '@/utils/storage';
import { useNavigation } from 'expo-router';
import { Menu, Provider } from 'react-native-paper';


export default function TripDetailScreen() {
  const { id } = useLocalSearchParams();
  const [trip, setTrip] = useState<any>(null);
  const router = useRouter();

  const navigation = useNavigation();

  const menuAnchorRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openMenu} style={styles.headerActionButton}>
        <Text style={styles.headerActionText}>⋯</Text>
      </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (trip) {
      const dateStr = new Date(trip.startTime).toLocaleDateString();
      navigation.setOptions({ title: dateStr });
    }
  }, [trip]);

  useEffect(() => {
    (async () => {
      const data = await listTrips();
      const found = data.find(t => t.id.toString() === id);
      setTrip(found);
      console.log("foundTrip:" + JSON.stringify(found))

    })();
  }, [id]);

  if (!trip) return <Text style={{ color: '#fff', padding: 20 }}>Loading...</Text>;

  const onDelete = async () => {
    Alert.alert('Delete Trip', 'Are you sure you want to delete this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTrip(trip.id);
          router.back();
        },
      },
    ]);
  };

  const onExport = async () => {
    const path = await exportTrip(trip);
    Alert.alert('Trip exported to:', path);
  };

  return (
    <Provider>
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={{ x: 400, y: -20 }} // manually adjust if needed
        contentStyle={{ backgroundColor: '#1c1c1e',     
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#2c2c2e', }}
      >
        <Menu.Item onPress={() => { closeMenu(); onExport(); }} title="Export" titleStyle={{ color: '#fff' }} />
        <Menu.Item onPress={() => { closeMenu(); onDelete(); }} title="Delete" titleStyle={{ color: 'red' }} />
      </Menu>

      <ScrollView contentContainerStyle={styles.container}>
        <MapView
          style={styles.map}
          userInterfaceStyle='dark'
          initialRegion={{
            latitude: trip.points[0].latitude,
            longitude: trip.points[0].longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.0121,
          }}
        >
          <Polyline
            coordinates={trip.points}
            strokeColor="#39FF14"
            strokeWidth={4}
          />
        </MapView>

        <Text style={styles.heading}>Trip Summary</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Date</Text>
            <Text style={styles.statValue}>{new Date(trip.startTime).toLocaleString()}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{trip.duration}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{trip.distanceKm} km</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Max Speed</Text>
            <Text style={styles.statValue}>{trip.maxSpeed} km/h</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Avg Speed</Text>
            <Text style={styles.statValue}>{trip.avgSpeed} km/h</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Max G-Force</Text>
            <Text style={styles.statValue}>{trip.maxG}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Avg G-Force</Text>
            <Text style={styles.statValue}>{trip.avgG}</Text>
          </View>
        </View>

      </ScrollView>
    </Provider>

  );
}

const styles = StyleSheet.create({
  statsContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },

  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },

  statLabel: {
    color: '#9a9a9a',
    fontSize: 15,
    fontWeight: '500',
  },

  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  container: {
    backgroundColor: '#000',
    padding: 20,
    flexGrow: 1,
  },
  map: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heading: {
    color: '#f5f5f7',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailBox: {
    backgroundColor: '#1c1c1e',
    padding: 16,
    borderRadius: 12,
    borderColor: '#2c2c2e',
    borderWidth: 1,
    marginBottom: 30,
  },
  label: {
    color: '#f5f5f7',
    fontSize: 16,
    marginVertical: 4,
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    gap: 4,
  },
  
  headerActionText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 22,
  },
  
  headerArrow: {
    fontSize: 10,
    color: '#fff',
    marginTop: 2,
  },  
});
