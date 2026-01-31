// 地理相關工具函數

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * 計算兩點之間的距離（Haversine 公式）
 * @returns 距離（公尺）
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371000; // 地球半徑（公尺）
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLng = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 轉換為弧度
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 檢查座標是否在台灣範圍內
 */
export function isInTaiwan(coords: Coordinates): boolean {
  // 台灣大致範圍
  const bounds = {
    north: 25.5,
    south: 21.5,
    east: 122.5,
    west: 119.0,
  };

  return (
    coords.latitude >= bounds.south &&
    coords.latitude <= bounds.north &&
    coords.longitude >= bounds.west &&
    coords.longitude <= bounds.east
  );
}

/**
 * 計算多個點的中心點
 */
export function calculateCenter(points: Coordinates[]): Coordinates | null {
  if (points.length === 0) {
    return null;
  }

  let totalLat = 0;
  let totalLng = 0;

  for (const point of points) {
    totalLat += point.latitude;
    totalLng += point.longitude;
  }

  return {
    latitude: totalLat / points.length,
    longitude: totalLng / points.length,
  };
}

/**
 * 計算邊界框
 */
export function calculateBounds(points: Coordinates[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} | null {
  if (points.length === 0) {
    return null;
  }

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const point of points) {
    if (point.latitude > north) north = point.latitude;
    if (point.latitude < south) south = point.latitude;
    if (point.longitude > east) east = point.longitude;
    if (point.longitude < west) west = point.longitude;
  }

  return { north, south, east, west };
}

/**
 * 按距離排序位置
 */
export function sortByDistance<T extends { location?: Coordinates }>(
  items: T[],
  origin: Coordinates
): T[] {
  return [...items]
    .filter(item => item.location)
    .sort((a, b) => {
      const distA = calculateDistance(origin, a.location!);
      const distB = calculateDistance(origin, b.location!);
      return distA - distB;
    });
}

/**
 * 篩選指定範圍內的位置
 * @param radius 半徑（公尺）
 */
export function filterByRadius<T extends { location?: Coordinates }>(
  items: T[],
  center: Coordinates,
  radius: number
): T[] {
  return items.filter(item => {
    if (!item.location) return false;
    const distance = calculateDistance(center, item.location);
    return distance <= radius;
  });
}

/**
 * 台灣主要城市中心座標
 */
export const TAIWAN_CITY_CENTERS: Record<string, Coordinates> = {
  台北市: { latitude: 25.0330, longitude: 121.5654 },
  新北市: { latitude: 25.0169, longitude: 121.4627 },
  桃園市: { latitude: 24.9936, longitude: 121.3010 },
  台中市: { latitude: 24.1477, longitude: 120.6736 },
  台南市: { latitude: 22.9998, longitude: 120.2270 },
  高雄市: { latitude: 22.6273, longitude: 120.3014 },
  基隆市: { latitude: 25.1276, longitude: 121.7392 },
  新竹市: { latitude: 24.8138, longitude: 120.9675 },
  嘉義市: { latitude: 23.4801, longitude: 120.4491 },
  新竹縣: { latitude: 24.8387, longitude: 121.0178 },
  苗栗縣: { latitude: 24.5602, longitude: 120.8214 },
  彰化縣: { latitude: 24.0518, longitude: 120.5161 },
  南投縣: { latitude: 23.9609, longitude: 120.9718 },
  雲林縣: { latitude: 23.7092, longitude: 120.4313 },
  嘉義縣: { latitude: 23.4519, longitude: 120.2553 },
  屏東縣: { latitude: 22.5519, longitude: 120.5487 },
  宜蘭縣: { latitude: 24.7021, longitude: 121.7378 },
  花蓮縣: { latitude: 23.9871, longitude: 121.6015 },
  台東縣: { latitude: 22.7583, longitude: 121.1444 },
  澎湖縣: { latitude: 23.5711, longitude: 119.5793 },
  金門縣: { latitude: 24.4493, longitude: 118.3767 },
  連江縣: { latitude: 26.1505, longitude: 119.9499 },
};
