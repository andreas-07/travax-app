import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { listTrips } from '@/utils/storage';
import * as Haptics from 'expo-haptics';


export default function HistoryScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  
    const latest = await listTrips(); // get more just in case
    const latestIds = latest.map((t) => t.id);
    const currentIds = trips.map((t) => t.id);
  
    const newOnes = latest.filter(t => !currentIds.includes(t.id));
  
    if (newOnes.length > 0) {
      setTrips([...newOnes, ...trips]);
    }
  
    setRefreshing(false);
  };

  useEffect(() => {
    (async () => {
      const data = await listTrips();
      console.log(JSON.stringify(data))
      setTrips(data);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topShelf}>
        <Text style={styles.title}>Trips</Text>
      </View>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id.toString() } })}
          >
            <Text style={styles.date}>
              {new Date(item.startTime).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Apple-style dark mode
  },
  topShelf: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#f5f5f7',
    letterSpacing: 0.5,
  },
  item: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#1c1c1e',
    borderBottomColor: '#2c2c2e',
    borderBottomWidth: 1,
  },
  date: {
    color: '#f5f5f7',
    fontSize: 16,
    fontWeight: '500',
  },
});