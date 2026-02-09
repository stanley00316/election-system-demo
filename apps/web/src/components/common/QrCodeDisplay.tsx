'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * QR Code 顯示元件
 * 使用 Canvas API 產生 QR Code（內建簡易 QR 編碼器）
 * 不依賴外部套件
 */
export function QrCodeDisplay({ value, size = 256, className }: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    try {
      generateQR(canvasRef.current, value, size);
      setLoaded(true);
      setError(false);
    } catch {
      setError(true);
    }
  }, [value, size]);

  if (error) {
    // 若內建產生器失敗，使用 Google Charts API 做 fallback
    return (
      <img
        src={`https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(value)}&choe=UTF-8`}
        alt="QR Code"
        width={size}
        height={size}
        className={className}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    </div>
  );
}

// ============================================================
// 以下為內建簡易 QR Code 產生器（支援最多 URL 長度的 QR Code）
// 基於 QR Code Model 2，支援 byte mode 編碼
// ============================================================

function generateQR(canvas: HTMLCanvasElement, text: string, size: number) {
  const modules = encode(text);
  const moduleCount = modules.length;
  const ctx = canvas.getContext('2d')!;
  const cellSize = size / moduleCount;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#000000';
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules[row][col]) {
        ctx.fillRect(
          Math.round(col * cellSize),
          Math.round(row * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize),
        );
      }
    }
  }
}

// 簡化的 QR Code 編碼器
// 支援 Byte mode, Error Correction Level L
function encode(text: string): boolean[][] {
  const data = new TextEncoder().encode(text);
  // 根據資料長度選擇版本
  const version = getMinVersion(data.length);
  const size = version * 4 + 17;

  // 初始化模組矩陣
  const modules: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  // 放置功能圖案
  placeFinderPatterns(modules, isFunction, size);
  placeAlignmentPatterns(modules, isFunction, version);
  placeTimingPatterns(modules, isFunction, size);
  placeDarkModule(modules, isFunction, version);
  reserveFormatInfo(modules, isFunction, size);
  if (version >= 7) {
    reserveVersionInfo(modules, isFunction, size);
  }

  // 編碼資料
  const encoded = encodeData(data, version);

  // 放置資料位元
  placeDataBits(modules, isFunction, encoded, size);

  // 套用遮罩
  const best = applyBestMask(modules, isFunction, size);

  // 寫入格式資訊
  writeFormatInfo(best, size, 0); // mask 0 預設

  return best.map((row) => row.map((cell) => cell === true));
}

function getMinVersion(byteLen: number): number {
  // Byte mode capacities for EC Level L
  const capacities = [
    0, 17, 32, 53, 78, 106, 134, 154, 192, 230, 271,
    321, 367, 425, 458, 520, 586, 644, 718, 792, 858,
  ];
  for (let v = 1; v <= 20; v++) {
    if (byteLen <= capacities[v]) return v;
  }
  return 20; // max we support
}

function placeFinderPatterns(
  m: (boolean | null)[][],
  f: boolean[][],
  size: number,
) {
  const positions = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];
  for (const [row, col] of positions) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inOuter =
          r === 0 || r === 6 || c === 0 || c === 6;
        const inInner =
          r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[rr][cc] = inOuter || inInner ? true : r === -1 || r === 7 || c === -1 || c === 7 ? false : false;
        f[rr][cc] = true;
      }
    }
  }
}

function getAlignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const positions: number[][] = [
    [],
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
    [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
    [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
    [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
  ];
  return positions[version] || [];
}

function placeAlignmentPatterns(
  m: (boolean | null)[][],
  f: boolean[][],
  version: number,
) {
  const positions = getAlignmentPositions(version);
  for (const row of positions) {
    for (const col of positions) {
      if (f[row][col]) continue; // skip if overlaps with finder
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const val =
            Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
          m[row + r][col + c] = val;
          f[row + r][col + c] = true;
        }
      }
    }
  }
}

function placeTimingPatterns(
  m: (boolean | null)[][],
  f: boolean[][],
  size: number,
) {
  for (let i = 8; i < size - 8; i++) {
    if (!f[6][i]) {
      m[6][i] = i % 2 === 0;
      f[6][i] = true;
    }
    if (!f[i][6]) {
      m[i][6] = i % 2 === 0;
      f[i][6] = true;
    }
  }
}

function placeDarkModule(
  m: (boolean | null)[][],
  f: boolean[][],
  version: number,
) {
  m[version * 4 + 9][8] = true;
  f[version * 4 + 9][8] = true;
}

function reserveFormatInfo(
  m: (boolean | null)[][],
  f: boolean[][],
  size: number,
) {
  for (let i = 0; i <= 8; i++) {
    if (!f[8][i]) {
      m[8][i] = false;
      f[8][i] = true;
    }
    if (!f[i][8]) {
      m[i][8] = false;
      f[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    if (!f[8][size - 1 - i]) {
      m[8][size - 1 - i] = false;
      f[8][size - 1 - i] = true;
    }
    if (!f[size - 1 - i][8]) {
      m[size - 1 - i][8] = false;
      f[size - 1 - i][8] = true;
    }
  }
}

function reserveVersionInfo(
  m: (boolean | null)[][],
  f: boolean[][],
  size: number,
) {
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      if (!f[i][size - 11 + j]) {
        m[i][size - 11 + j] = false;
        f[i][size - 11 + j] = true;
      }
      if (!f[size - 11 + j][i]) {
        m[size - 11 + j][i] = false;
        f[size - 11 + j][i] = true;
      }
    }
  }
}

// EC Level L data encoding
function encodeData(data: Uint8Array, version: number): number[] {
  const totalCodewords = getTotalCodewords(version);
  const ecCodewords = getECCodewords(version);
  const dataCodewords = totalCodewords - ecCodewords;

  // Mode indicator (4 bits): 0100 = Byte mode
  const bits: number[] = [0, 1, 0, 0];

  // Character count (8 or 16 bits depending on version)
  const countBits = version <= 9 ? 8 : 16;
  for (let i = countBits - 1; i >= 0; i--) {
    bits.push((data.length >> i) & 1);
  }

  // Data bits
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }

  // Terminator (up to 4 zeros)
  const maxBits = dataCodewords * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) {
    bits.push(0);
  }

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad with alternating bytes
  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (bits.length < maxBits) {
    const b = padBytes[padIndex % 2];
    for (let i = 7; i >= 0; i--) {
      bits.push((b >> i) & 1);
    }
    padIndex++;
  }

  // Convert to codewords
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] || 0);
    }
    codewords.push(byte);
  }

  // Generate EC codewords using Reed-Solomon
  const ecWords = generateEC(codewords.slice(0, dataCodewords), ecCodewords);

  // Interleave (simplified for single block)
  const allCodewords = [...codewords.slice(0, dataCodewords), ...ecWords];

  // Convert to bit array
  const result: number[] = [];
  for (const cw of allCodewords) {
    for (let i = 7; i >= 0; i--) {
      result.push((cw >> i) & 1);
    }
  }

  return result;
}

function getTotalCodewords(version: number): number {
  const table = [
    0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
    404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  ];
  return table[version] || 26;
}

function getECCodewords(version: number): number {
  // EC Level L
  const table = [
    0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18,
    20, 24, 26, 30, 22, 24, 28, 30, 28, 28,
  ];
  return table[version] || 7;
}

// GF(256) arithmetic for Reed-Solomon
const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x * 2;
    if (x >= 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function generateEC(data: number[], ecCount: number): number[] {
  // Generate generator polynomial
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const newGen = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      newGen[j] ^= gen[j];
      newGen[j + 1] ^= gfMul(gen[j], GF_EXP[i]);
    }
    gen = newGen;
  }

  // Divide
  const result = new Array(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.shift();
    result.push(0);
    for (let i = 0; i < ecCount; i++) {
      result[i] ^= gfMul(gen[i + 1], factor);
    }
  }

  return result;
}

function placeDataBits(
  m: (boolean | null)[][],
  f: boolean[][],
  bits: number[],
  size: number,
) {
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const col of [right, right - 1]) {
        if (!f[row][col]) {
          m[row][col] = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
          bitIndex++;
        }
      }
    }
    upward = !upward;
  }
}

function applyBestMask(
  modules: (boolean | null)[][],
  isFunction: boolean[][],
  size: number,
): (boolean | null)[][] {
  // 使用 mask 0 (row + col) % 2 == 0
  const result = modules.map((row) => [...row]);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c]) {
        if ((r + c) % 2 === 0) {
          result[r][c] = !result[r][c];
        }
      }
    }
  }
  return result;
}

function writeFormatInfo(
  m: (boolean | null)[][],
  size: number,
  mask: number,
) {
  // EC Level L = 01, mask pattern
  const formatBits = getFormatBits(0b01, mask);

  // Around top-left finder
  for (let i = 0; i <= 5; i++) m[8][i] = ((formatBits >> (14 - i)) & 1) === 1;
  m[8][7] = ((formatBits >> 8) & 1) === 1;
  m[8][8] = ((formatBits >> 7) & 1) === 1;
  m[7][8] = ((formatBits >> 6) & 1) === 1;
  for (let i = 0; i <= 5; i++) m[5 - i][8] = ((formatBits >> (i)) & 1) === 1;

  // Around other finders
  for (let i = 0; i < 8; i++) m[size - 1 - i][8] = ((formatBits >> (14 - i)) & 1) === 1;
  for (let i = 0; i < 7; i++) m[8][size - 7 + i] = ((formatBits >> (6 - i)) & 1) === 1;
}

function getFormatBits(ecLevel: number, mask: number): number {
  let data = (ecLevel << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  }
  const bits = ((data << 10) | rem) ^ 0x5412;
  return bits;
}
