/**
 * 共用圖表樣式 - 支援亮白/暗黑主題
 * 使用 CSS 變數確保主題切換時正確顯示
 */

// Tooltip 樣式
export const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))',
  },
  labelStyle: {
    color: 'hsl(var(--foreground))',
  },
  itemStyle: {
    color: 'hsl(var(--foreground))',
  },
};

// XAxis / YAxis 樣式
export const chartAxisStyle = {
  tick: { fill: 'hsl(var(--foreground))' },
  stroke: 'hsl(var(--border))',
  tickLine: { stroke: 'hsl(var(--border))' },
  axisLine: { stroke: 'hsl(var(--border))' },
};

// CartesianGrid 樣式
export const chartGridStyle = {
  stroke: 'hsl(var(--border))',
  strokeDasharray: '3 3',
};

// Legend 樣式
export const chartLegendStyle = {
  wrapperStyle: {
    color: 'hsl(var(--foreground))',
  },
};

// 政治傾向顏色（在兩種主題下皆清晰可見）
export const STANCE_COLORS: Record<string, string> = {
  STRONG_SUPPORT: '#16a34a',
  SUPPORT: '#22c55e',
  LEAN_SUPPORT: '#86efac',
  NEUTRAL: '#f59e0b',
  UNDECIDED: '#9ca3af',
  LEAN_OPPOSE: '#fca5a5',
  OPPOSE: '#ef4444',
  STRONG_OPPOSE: '#dc2626',
  UNKNOWN: '#9ca3af',
};

// 圖表主題色
export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  purple: '#8b5cf6',
  orange: '#f97316',
  cyan: '#06b6d4',
};

// 預設調色盤（用於多系列圖表）
export const DEFAULT_CHART_PALETTE = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
];
