import * as FileSystem from 'expo-file-system';

export const TRIP_DIR = FileSystem.documentDirectory || '';

export const listTrips = async () => {
  console.log("dir" + TRIP_DIR)
  const files = await FileSystem.readDirectoryAsync(TRIP_DIR);
  const tripFiles = files.filter(f => f.endsWith('.json'));
  const trips = await Promise.all(
    tripFiles.map(async (file) => {
      const content = await FileSystem.readAsStringAsync(TRIP_DIR + file);
      const parsed = JSON.parse(content);
      return { ...parsed, file };
    })
  );

  // Sort by newest first
  return trips.sort((a, b) => b.startTime - a.startTime);
};

export const deleteTrip = async (file: string) => {
  await FileSystem.deleteAsync(TRIP_DIR + file);
};

export const exportTrip = async (trip: any) => {
  const path = `${TRIP_DIR}export-${trip.id}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(trip, null, 2));
  return path;
};