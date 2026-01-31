'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 台灣縣市邊界的簡化資料（中心點和大致範圍）
const TAIWAN_CITIES_DATA: Record<string, {
  center: [number, number];
  bounds: [[number, number], [number, number]];
  districts: string[];
}> = {
  '台北市': {
    center: [25.0330, 121.5654],
    bounds: [[24.96, 121.45], [25.21, 121.67]],
    districts: ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'],
  },
  '新北市': {
    center: [25.0169, 121.4627],
    bounds: [[24.67, 121.28], [25.30, 122.01]],
    districts: ['板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區', '土城區', '蘆洲區', '汐止區', '樹林區', '鶯歌區', '三峽區', '淡水區', '瑞芳區', '五股區', '泰山區', '林口區', '深坑區', '石碇區', '坪林區', '三芝區', '石門區', '八里區', '平溪區', '雙溪區', '貢寮區', '金山區', '萬里區', '烏來區'],
  },
  '桃園市': {
    center: [24.9936, 121.3010],
    bounds: [[24.73, 120.98], [25.13, 121.47]],
    districts: ['桃園區', '中壢區', '平鎮區', '八德區', '楊梅區', '蘆竹區', '大溪區', '龜山區', '大園區', '觀音區', '新屋區', '龍潭區', '復興區'],
  },
  '台中市': {
    center: [24.1477, 120.6736],
    bounds: [[23.99, 120.47], [24.47, 121.45]],
    districts: ['中區', '東區', '南區', '西區', '北區', '北屯區', '西屯區', '南屯區', '太平區', '大里區', '霧峰區', '烏日區', '豐原區', '后里區', '石岡區', '東勢區', '和平區', '新社區', '潭子區', '大雅區', '神岡區', '大肚區', '沙鹿區', '龍井區', '梧棲區', '清水區', '大甲區', '外埔區', '大安區'],
  },
  '台南市': {
    center: [22.9998, 120.2270],
    bounds: [[22.85, 120.04], [23.41, 120.66]],
    districts: ['中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區', '歸仁區', '新化區', '左鎮區', '玉井區', '楠西區', '南化區', '仁德區', '關廟區', '龍崎區', '官田區', '麻豆區', '佳里區', '西港區', '七股區', '將軍區', '學甲區', '北門區', '新營區', '後壁區', '白河區', '東山區', '六甲區', '下營區', '柳營區', '鹽水區', '善化區', '大內區', '山上區', '新市區', '安定區'],
  },
  '高雄市': {
    center: [22.6273, 120.3014],
    bounds: [[22.47, 120.17], [23.47, 121.05]],
    districts: ['楠梓區', '左營區', '鼓山區', '三民區', '鹽埕區', '前金區', '新興區', '苓雅區', '前鎮區', '旗津區', '小港區', '鳳山區', '大寮區', '鳥松區', '林園區', '仁武區', '大樹區', '大社區', '岡山區', '路竹區', '橋頭區', '梓官區', '彌陀區', '永安區', '燕巢區', '田寮區', '阿蓮區', '茄萣區', '湖內區', '旗山區', '美濃區', '內門區', '杉林區', '甲仙區', '六龜區', '茂林區', '桃源區', '那瑪夏區'],
  },
  '基隆市': {
    center: [25.1276, 121.7392],
    bounds: [[25.08, 121.67], [25.19, 121.82]],
    districts: ['中正區', '七堵區', '暖暖區', '仁愛區', '中山區', '安樂區', '信義區'],
  },
  '新竹市': {
    center: [24.8138, 120.9675],
    bounds: [[24.73, 120.90], [24.86, 121.05]],
    districts: ['東區', '北區', '香山區'],
  },
  '嘉義市': {
    center: [23.4801, 120.4491],
    bounds: [[23.44, 120.40], [23.51, 120.50]],
    districts: ['東區', '西區'],
  },
  '新竹縣': {
    center: [24.8387, 121.0178],
    bounds: [[24.39, 120.85], [24.95, 121.35]],
    districts: ['竹北市', '竹東鎮', '新埔鎮', '關西鎮', '湖口鄉', '新豐鄉', '芎林鄉', '橫山鄉', '北埔鄉', '寶山鄉', '峨眉鄉', '尖石鄉', '五峰鄉'],
  },
  '苗栗縣': {
    center: [24.5602, 120.8214],
    bounds: [[24.28, 120.62], [24.73, 121.26]],
    districts: ['苗栗市', '頭份市', '竹南鎮', '後龍鎮', '通霄鎮', '苑裡鎮', '卓蘭鎮', '造橋鄉', '西湖鄉', '頭屋鄉', '公館鄉', '銅鑼鄉', '三義鄉', '大湖鄉', '獅潭鄉', '三灣鄉', '南庄鄉', '泰安鄉'],
  },
  '彰化縣': {
    center: [24.0518, 120.5161],
    bounds: [[23.82, 120.26], [24.20, 120.66]],
    districts: ['彰化市', '員林市', '鹿港鎮', '和美鎮', '北斗鎮', '溪湖鎮', '田中鎮', '二林鎮', '線西鄉', '伸港鄉', '福興鄉', '秀水鄉', '花壇鄉', '芬園鄉', '大村鄉', '埔鹽鄉', '埔心鄉', '永靖鄉', '社頭鄉', '二水鄉', '田尾鄉', '埤頭鄉', '芳苑鄉', '大城鄉', '竹塘鄉', '溪州鄉'],
  },
  '南投縣': {
    center: [23.9609, 120.9718],
    bounds: [[23.42, 120.70], [24.27, 121.45]],
    districts: ['南投市', '埔里鎮', '草屯鎮', '竹山鎮', '集集鎮', '名間鄉', '鹿谷鄉', '中寮鄉', '魚池鄉', '國姓鄉', '水里鄉', '信義鄉', '仁愛鄉'],
  },
  '雲林縣': {
    center: [23.7092, 120.4313],
    bounds: [[23.52, 120.06], [23.87, 120.74]],
    districts: ['斗六市', '斗南鎮', '虎尾鎮', '西螺鎮', '土庫鎮', '北港鎮', '古坑鄉', '大埤鄉', '莿桐鄉', '林內鄉', '二崙鄉', '崙背鄉', '麥寮鄉', '東勢鄉', '褒忠鄉', '台西鄉', '元長鄉', '四湖鄉', '口湖鄉', '水林鄉'],
  },
  '嘉義縣': {
    center: [23.4519, 120.2553],
    bounds: [[23.16, 120.04], [23.61, 120.72]],
    districts: ['太保市', '朴子市', '布袋鎮', '大林鎮', '民雄鄉', '溪口鄉', '新港鄉', '六腳鄉', '東石鄉', '義竹鄉', '鹿草鄉', '水上鄉', '中埔鄉', '竹崎鄉', '梅山鄉', '番路鄉', '大埔鄉', '阿里山鄉'],
  },
  '屏東縣': {
    center: [22.5519, 120.5487],
    bounds: [[21.90, 120.36], [22.88, 121.06]],
    districts: ['屏東市', '潮州鎮', '東港鎮', '恆春鎮', '萬丹鄉', '長治鄉', '麟洛鄉', '九如鄉', '里港鄉', '鹽埔鄉', '高樹鄉', '萬巒鄉', '內埔鄉', '竹田鄉', '新埤鄉', '枋寮鄉', '新園鄉', '崁頂鄉', '林邊鄉', '南州鄉', '佳冬鄉', '琉球鄉', '車城鄉', '滿州鄉', '枋山鄉', '三地門鄉', '霧台鄉', '瑪家鄉', '泰武鄉', '來義鄉', '春日鄉', '獅子鄉', '牡丹鄉'],
  },
  '宜蘭縣': {
    center: [24.7021, 121.7378],
    bounds: [[24.30, 121.35], [24.88, 122.00]],
    districts: ['宜蘭市', '羅東鎮', '蘇澳鎮', '頭城鎮', '礁溪鄉', '壯圍鄉', '員山鄉', '冬山鄉', '五結鄉', '三星鄉', '大同鄉', '南澳鄉'],
  },
  '花蓮縣': {
    center: [23.9871, 121.6015],
    bounds: [[23.05, 121.15], [24.38, 121.70]],
    districts: ['花蓮市', '鳳林鎮', '玉里鎮', '新城鄉', '吉安鄉', '壽豐鄉', '秀林鄉', '光復鄉', '豐濱鄉', '瑞穗鄉', '萬榮鄉', '富里鄉', '卓溪鄉'],
  },
  '台東縣': {
    center: [22.7583, 121.1444],
    bounds: [[22.00, 120.74], [23.45, 121.55]],
    districts: ['台東市', '成功鎮', '關山鎮', '長濱鄉', '海端鄉', '池上鄉', '東河鄉', '鹿野鄉', '延平鄉', '卑南鄉', '金峰鄉', '大武鄉', '達仁鄉', '綠島鄉', '蘭嶼鄉', '太麻里鄉'],
  },
  '澎湖縣': {
    center: [23.5711, 119.5793],
    bounds: [[23.20, 119.30], [23.80, 119.72]],
    districts: ['馬公市', '湖西鄉', '白沙鄉', '西嶼鄉', '望安鄉', '七美鄉'],
  },
  '金門縣': {
    center: [24.4493, 118.3767],
    bounds: [[24.38, 118.20], [24.52, 118.50]],
    districts: ['金城鎮', '金湖鎮', '金沙鎮', '金寧鄉', '烈嶼鄉', '烏坵鄉'],
  },
  '連江縣': {
    center: [26.1505, 119.9499],
    bounds: [[25.94, 119.88], [26.38, 120.50]],
    districts: ['南竿鄉', '北竿鄉', '莒光鄉', '東引鄉'],
  },
};

interface DistrictMapInnerProps {
  selectedCity?: string;
  selectedDistrict?: string;
  onSelect: (city: string, district?: string) => void;
}

// 地圖視角控制
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export default function DistrictMapInner({
  selectedCity,
  selectedDistrict,
  onSelect,
}: DistrictMapInnerProps) {
  const [viewLevel, setViewLevel] = useState<'country' | 'city'>('country');
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // 台灣中心點
  const taiwanCenter: [number, number] = [23.7, 120.9];

  // 當前地圖中心和縮放
  const getMapView = () => {
    if (selectedCity && TAIWAN_CITIES_DATA[selectedCity]) {
      return {
        center: TAIWAN_CITIES_DATA[selectedCity].center,
        zoom: 11,
      };
    }
    return {
      center: taiwanCenter,
      zoom: 7,
    };
  };

  const { center, zoom } = getMapView();

  // 點擊縣市
  const handleCityClick = (cityName: string) => {
    if (selectedCity === cityName) {
      // 已選擇此縣市，清除選擇
      onSelect('', undefined);
      setViewLevel('country');
    } else {
      onSelect(cityName, undefined);
      setViewLevel('city');
    }
  };

  // 點擊區
  const handleDistrictClick = (districtName: string) => {
    if (selectedCity) {
      onSelect(selectedCity, districtName);
    }
  };

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '400px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} zoom={zoom} />
      </MapContainer>

      {/* 縣市選擇器覆蓋層 */}
      <div className="absolute top-2 left-2 right-2 z-[1000] flex flex-wrap gap-1 max-h-[120px] overflow-y-auto bg-background/95 backdrop-blur rounded-lg p-2 border shadow-sm">
        {Object.keys(TAIWAN_CITIES_DATA).map((cityName) => (
          <button
            key={cityName}
            onClick={() => handleCityClick(cityName)}
            onMouseEnter={() => setHoveredCity(cityName)}
            onMouseLeave={() => setHoveredCity(null)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedCity === cityName
                ? 'bg-primary text-primary-foreground'
                : hoveredCity === cityName
                ? 'bg-muted'
                : 'bg-background hover:bg-muted'
            } border`}
          >
            {cityName}
          </button>
        ))}
      </div>

      {/* 區選擇器（當選擇縣市後顯示） */}
      {selectedCity && TAIWAN_CITIES_DATA[selectedCity] && (
        <div className="absolute bottom-2 left-2 right-2 z-[1000] bg-background/95 backdrop-blur rounded-lg p-2 border shadow-sm">
          <p className="text-xs text-muted-foreground mb-2">
            選擇 {selectedCity} 的行政區：
          </p>
          <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
            {TAIWAN_CITIES_DATA[selectedCity].districts.map((districtName) => (
              <button
                key={districtName}
                onClick={() => handleDistrictClick(districtName)}
                onMouseEnter={() => setHoveredDistrict(districtName)}
                onMouseLeave={() => setHoveredDistrict(null)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedDistrict === districtName
                    ? 'bg-primary text-primary-foreground'
                    : hoveredDistrict === districtName
                    ? 'bg-muted'
                    : 'bg-background hover:bg-muted'
                } border`}
              >
                {districtName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
