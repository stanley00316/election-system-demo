// Google Maps 版本（需要 API Key）
export { default as VoterMapGoogle } from './VoterMap';
export { default as HeatmapLayerGoogle } from './HeatmapLayer';

// Leaflet 版本（免費，不需要 API Key）
export { default as LeafletMap } from './LeafletMap';
export { default as LeafletHeatmap } from './LeafletHeatmap';

// 默認使用 Leaflet 版本
export { default as VoterMap } from './LeafletMap';
export { default as HeatmapLayer } from './LeafletHeatmap';
