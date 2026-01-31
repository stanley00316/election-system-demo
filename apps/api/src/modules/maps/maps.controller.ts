import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MapsService } from './maps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('maps')
@Controller('maps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('geocode')
  @ApiOperation({ summary: '地址轉座標' })
  async geocode(@Query('address') address: string) {
    return this.mapsService.geocode(address);
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: '座標轉地址' })
  async reverseGeocode(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
  ) {
    return this.mapsService.reverseGeocode(Number(lat), Number(lng));
  }

  @Post('directions')
  @ApiOperation({ summary: '取得路線' })
  async getDirections(
    @Body()
    body: {
      origin: { lat: number; lng: number };
      destination: { lat: number; lng: number };
      waypoints?: Array<{ lat: number; lng: number }>;
    },
  ) {
    return this.mapsService.getDirections(
      body.origin,
      body.destination,
      body.waypoints,
    );
  }

  @Post('distance-matrix')
  @ApiOperation({ summary: '取得距離矩陣' })
  async getDistanceMatrix(
    @Body()
    body: {
      origins: Array<{ lat: number; lng: number }>;
      destinations: Array<{ lat: number; lng: number }>;
    },
  ) {
    return this.mapsService.getDistanceMatrix(body.origins, body.destinations);
  }
}
