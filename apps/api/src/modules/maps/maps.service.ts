import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface ReverseGeocodingResult {
  address: string;
  city?: string;
  district?: string;
  village?: string;
}

export interface DirectionsResult {
  distance: number; // meters
  duration: number; // seconds
  polyline: string;
}

@Injectable()
export class MapsService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('GOOGLE_MAPS_API_KEY', '');
  }

  async geocode(address: string): Promise<GeocodingResult> {
    if (!this.apiKey) {
      throw new BadRequestException('Google Maps API Key 未設定');
    }

    const url = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}&language=zh-TW&region=tw`;

    try {
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.status !== 'OK' || !data.results?.length) {
        throw new BadRequestException('無法解析地址');
      }

      const result = data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Geocoding 服務錯誤');
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult> {
    if (!this.apiKey) {
      throw new BadRequestException('Google Maps API Key 未設定');
    }

    const url = `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}&language=zh-TW`;

    try {
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.status !== 'OK' || !data.results?.length) {
        throw new BadRequestException('無法解析座標');
      }

      const result = data.results[0];
      const components = result.address_components;

      let city: string | undefined;
      let district: string | undefined;
      let village: string | undefined;

      for (const component of components) {
        if (component.types.includes('administrative_area_level_1')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_2')) {
          district = component.long_name;
        }
        if (component.types.includes('administrative_area_level_3')) {
          village = component.long_name;
        }
      }

      return {
        address: result.formatted_address,
        city,
        district,
        village,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Reverse Geocoding 服務錯誤');
    }
  }

  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints?: Array<{ lat: number; lng: number }>,
  ): Promise<DirectionsResult> {
    if (!this.apiKey) {
      throw new BadRequestException('Google Maps API Key 未設定');
    }

    let url = `${this.baseUrl}/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${this.apiKey}&language=zh-TW&mode=driving`;

    if (waypoints?.length) {
      const waypointsStr = waypoints.map(w => `${w.lat},${w.lng}`).join('|');
      url += `&waypoints=optimize:true|${waypointsStr}`;
    }

    try {
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.status !== 'OK' || !data.routes?.length) {
        throw new BadRequestException('無法取得路線');
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.value,
        duration: leg.duration.value,
        polyline: route.overview_polyline.points,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Directions 服務錯誤');
    }
  }

  async getDistanceMatrix(
    origins: Array<{ lat: number; lng: number }>,
    destinations: Array<{ lat: number; lng: number }>,
  ): Promise<Array<Array<{ distance: number; duration: number }>>> {
    if (!this.apiKey) {
      throw new BadRequestException('Google Maps API Key 未設定');
    }

    const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
    const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');

    const url = `${this.baseUrl}/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${this.apiKey}&language=zh-TW&mode=driving`;

    try {
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.status !== 'OK') {
        throw new BadRequestException('無法取得距離矩陣');
      }

      return data.rows.map((row: any) =>
        row.elements.map((element: any) => ({
          distance: element.distance?.value ?? Infinity,
          duration: element.duration?.value ?? Infinity,
        })),
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Distance Matrix 服務錯誤');
    }
  }

  // 簡易距離計算（不需要 API）
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // 地球半徑（公尺）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
