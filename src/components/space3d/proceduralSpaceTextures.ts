// src/components/space3d/proceduralSpaceTextures.ts
// Photorealistic Procedural Space Textures for Earth & Aerospace CubeSats (Zero-Asset, Pure Canvas Generation)

import * as THREE from 'three';

// Cache generated textures so they are created once
let cachedDayTexture: THREE.CanvasTexture | null = null;
let cachedNightTexture: THREE.CanvasTexture | null = null;
let cachedCloudTexture: THREE.CanvasTexture | null = null;
let cachedFoilTexture: THREE.CanvasTexture | null = null;
let cachedSolarTexture: THREE.CanvasTexture | null = null;

/**
 * 1. High-Resolution Earth Albedo / Day Texture (2048 x 1024)
 * Generates realistic oceans, coastal shelves, major continent landmasses,
 * green vegetation, Sahara/Australian deserts, and white polar ice caps.
 */
export function getEarthDayTexture(): THREE.CanvasTexture {
  if (cachedDayTexture) return cachedDayTexture;

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Deep Ocean Base with subtle depth gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#09152b'); // North ocean
  oceanGrad.addColorStop(0.3, '#0b1d3a');
  oceanGrad.addColorStop(0.5, '#0d2347'); // Equatorial tropical ocean
  oceanGrad.addColorStop(0.7, '#0b1d3a');
  oceanGrad.addColorStop(1, '#09152b'); // South ocean
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Helper to map lat/lon degrees (-180..180, 90..-90) to canvas (x, y)
  const mapCoord = (lon: number, lat: number): [number, number] => {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
  };

  // Helper to draw continent polygons with soft coastal shelf halo
  const drawLandmass = (
    coords: [number, number][],
    landColor: string,
    shelfColor: string = '#145369'
  ) => {
    if (coords.length < 3) return;

    // Coastal shallow water shelf glow
    ctx.beginPath();
    let [sx, sy] = mapCoord(coords[0][0], coords[0][1]);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < coords.length; i++) {
      const [px, py] = mapCoord(coords[i][0], coords[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = shelfColor;
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Solid landmass fill
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let i = 1; i < coords.length; i++) {
      const [px, py] = mapCoord(coords[i][0], coords[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = landColor;
    ctx.fill();
    ctx.strokeStyle = '#1b381e';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // 1. North America
  drawLandmass([
    [-165, 68], [-140, 70], [-120, 72], [-85, 74], [-60, 60], [-55, 48],
    [-70, 42], [-80, 32], [-80, 25], [-97, 26], [-90, 30], [-105, 20],
    [-85, 15], [-77, 8], [-83, 10], [-92, 16], [-105, 23], [-117, 32],
    [-124, 40], [-125, 50], [-135, 58], [-160, 58], [-168, 65]
  ], '#2a4425');

  // 2. South America
  drawLandmass([
    [-77, 8], [-60, 10], [-50, 0], [-35, -5], [-37, -15], [-45, -24],
    [-55, -34], [-65, -45], [-70, -54], [-75, -50], [-72, -35], [-80, -5],
    [-77, 8]
  ], '#21401d');

  // 3. Eurasia
  drawLandmass([
    [-10, 36], [0, 43], [10, 45], [20, 40], [30, 42], [40, 40], [55, 25],
    [65, 25], [70, 22], [80, 13], [85, 22], [90, 24], [100, 15], [105, 10],
    [108, 22], [120, 25], [122, 32], [128, 38], [130, 45], [140, 52],
    [160, 55], [170, 65], [180, 68], [170, 72], [100, 75], [60, 70],
    [30, 71], [15, 65], [5, 58], [-5, 50], [-10, 42]
  ], '#2f4226');

  // 4. Africa
  drawLandmass([
    [-17, 15], [-5, 36], [10, 37], [25, 32], [32, 31], [43, 12], [51, 11],
    [40, -5], [35, -20], [28, -33], [18, -34], [12, -18], [9, 4], [0, 6],
    [-15, 11]
  ], '#364026');

  // Deserts: Sahara, Arabian, Gobi (Warm sand ochre overlays)
  const drawDesert = (coords: [number, number][]) => {
    ctx.beginPath();
    const [sx, sy] = mapCoord(coords[0][0], coords[0][1]);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < coords.length; i++) {
      const [px, py] = mapCoord(coords[i][0], coords[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#9e7d47';
    ctx.fill();
  };

  // Sahara
  drawDesert([[-12, 28], [5, 32], [30, 30], [33, 22], [25, 16], [5, 18], [-10, 20]]);
  // Arabian Desert
  drawDesert([[35, 28], [55, 26], [54, 18], [42, 16], [38, 22]]);
  // Gobi Desert
  drawDesert([[85, 45], [110, 44], [112, 38], [90, 38]]);

  // 5. Australia
  drawLandmass([
    [114, -22], [125, -15], [136, -12], [142, -11], [147, -20], [153, -28],
    [150, -37], [140, -38], [130, -32], [115, -34], [113, -26]
  ], '#9c6f3b');

  // 6. Polar Ice Caps: Greenland & Antarctica (Crisp White)
  drawLandmass([
    [-55, 60], [-40, 62], [-20, 70], [-25, 80], [-45, 83], [-55, 75]
  ], '#f1f5f9', '#93c5fd');

  // Antarctica
  ctx.beginPath();
  const [ax0, ay0] = mapCoord(-180, -70);
  ctx.moveTo(ax0, ay0);
  for (let lon = -180; lon <= 180; lon += 10) {
    const lat = -70 - Math.sin((lon * Math.PI) / 60) * 8;
    const [px, py] = mapCoord(lon, lat);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = '#e2e8f0';
  ctx.fill();

  // Subtle terrain noise texture for realistic ruggedness
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 16) {
    const noise = (Math.random() - 0.5) * 8;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cachedDayTexture = texture;
  return texture;
}

/**
 * 2. Earth Night Lights / City Clusters Texture (2048 x 1024)
 * Generates golden/amber urban city clusters glowing on the dark side of Earth.
 */
export function getEarthNightTexture(): THREE.CanvasTexture {
  if (cachedNightTexture) return cachedNightTexture;

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Pitch black base
  ctx.fillStyle = '#010204';
  ctx.fillRect(0, 0, width, height);

  const mapCoord = (lon: number, lat: number): [number, number] => {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
  };

  const drawCityCluster = (lon: number, lat: number, intensity: number, spread: number) => {
    const [cx, cy] = mapCoord(lon, lat);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread);
    grad.addColorStop(0, `rgba(255, 200, 110, ${intensity})`);
    grad.addColorStop(0.4, `rgba(230, 150, 60, ${intensity * 0.6})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, spread, 0, Math.PI * 2);
    ctx.fill();

    // Hot center pinpoints
    for (let i = 0; i < 4; i++) {
      const px = cx + (Math.random() - 0.5) * spread * 0.8;
      const py = cy + (Math.random() - 0.5) * spread * 0.8;
      ctx.fillStyle = '#ffe082';
      ctx.fillRect(px, py, 1.5, 1.5);
    }
  };

  // Major global metropolitan clusters
  // North America
  drawCityCluster(-74, 40.7, 0.95, 32); // New York / East Coast
  drawCityCluster(-87.6, 41.8, 0.85, 24); // Chicago / Great Lakes
  drawCityCluster(-118.2, 34.0, 0.9, 28); // Los Angeles
  drawCityCluster(-122.4, 37.7, 0.85, 20); // San Francisco
  drawCityCluster(-95.3, 29.7, 0.8, 20); // Texas
  drawCityCluster(-80.2, 25.7, 0.75, 16); // Florida

  // Europe
  drawCityCluster(0, 51.5, 0.95, 30); // London / UK
  drawCityCluster(2.3, 48.8, 0.9, 28); // Paris
  drawCityCluster(10, 51, 0.95, 38); // Germany / Benelux
  drawCityCluster(12.5, 41.9, 0.8, 22); // Italy
  drawCityCluster(37.6, 55.7, 0.85, 24); // Moscow

  // Asia & India
  drawCityCluster(77.2, 28.6, 0.95, 35); // Delhi
  drawCityCluster(72.8, 19.0, 0.95, 32); // Mumbai
  drawCityCluster(80.2, 13.0, 0.85, 28); // Chennai / South India
  drawCityCluster(121.4, 31.2, 0.95, 40); // Shanghai / East China
  drawCityCluster(116.4, 39.9, 0.9, 30); // Beijing
  drawCityCluster(139.6, 35.6, 1.0, 42); // Tokyo / Japan
  drawCityCluster(126.9, 37.5, 0.9, 22); // Seoul
  drawCityCluster(100.5, 13.7, 0.8, 20); // Bangkok

  // Australia, Africa, S. America
  drawCityCluster(151.2, -33.8, 0.8, 22); // Sydney
  drawCityCluster(144.9, -37.8, 0.75, 18); // Melbourne
  drawCityCluster(31.2, 30.0, 0.85, 20); // Cairo / Nile
  drawCityCluster(-46.6, -23.5, 0.9, 30); // Sao Paulo
  drawCityCluster(-58.3, -34.6, 0.8, 24); // Buenos Aires

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cachedNightTexture = texture;
  return texture;
}

/**
 * 3. Dynamic Atmospheric Clouds Texture (2048 x 1024)
 * Generates equatorial ITCZ bands, cyclonic vortexes, and wispy cirrus.
 */
export function getEarthCloudsTexture(): THREE.CanvasTexture {
  if (cachedCloudTexture) return cachedCloudTexture;

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Transparent base
  ctx.clearRect(0, 0, width, height);

  // Cloud bands
  const drawCloudSwirl = (cx: number, cy: number, radiusX: number, radiusY: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((Math.random() - 0.5) * 0.4);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.5, `rgba(240, 248, 255, ${alpha * 0.6})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.scale(1, radiusY / radiusX);
    ctx.beginPath();
    ctx.arc(0, 0, radiusX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Equatorial tropical cloud band
  for (let x = 0; x < width; x += 40) {
    const y = height * 0.5 + Math.sin(x * 0.01) * 45 + (Math.random() - 0.5) * 30;
    drawCloudSwirl(x, y, 70 + Math.random() * 50, 25 + Math.random() * 20, 0.55);
  }

  // Northern Mid-Latitude Storm Fronts (40-60 deg N)
  for (let x = 0; x < width; x += 60) {
    const y = height * 0.28 + Math.cos(x * 0.008) * 50;
    drawCloudSwirl(x, y, 90 + Math.random() * 60, 40 + Math.random() * 25, 0.45);
  }

  // Southern Storm Belts (45-65 deg S)
  for (let x = 0; x < width; x += 55) {
    const y = height * 0.72 + Math.sin(x * 0.009) * 40;
    drawCloudSwirl(x, y, 85 + Math.random() * 50, 35 + Math.random() * 20, 0.48);
  }

  // Tropical Cyclones (Hurricanes / Typhoons)
  const drawCyclone = (cx: number, cy: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    for (let arm = 0; arm < 3; arm++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(30, 20, 60, 50, 80, 20);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    // Eye of the storm
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    ctx.restore();
  };

  drawCyclone(width * 0.22, height * 0.38); // Atlantic
  drawCyclone(width * 0.74, height * 0.35); // Western Pacific

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  cachedCloudTexture = texture;
  return texture;
}

/**
 * 4. Aerospace Gold Kapton Multi-Layer Insulation (MLI) Foil Texture
 * Generates wrinkled space-grade gold thermal blanket texture with realistic creases.
 */
export function getKaptonFoilTexture(): THREE.CanvasTexture {
  if (cachedFoilTexture) return cachedFoilTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Gold base
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 0, size, size);

  // Wrinkles and crinkle folds
  for (let i = 0; i < 400; i++) {
    const x1 = Math.random() * size;
    const y1 = Math.random() * size;
    const len = 15 + Math.random() * 45;
    const angle = Math.random() * Math.PI * 2;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;

    // Specular crease highlight
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = Math.random() > 0.5 ? '#fde68a' : '#78350f';
    ctx.lineWidth = 0.8 + Math.random() * 1.5;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  cachedFoilTexture = texture;
  return texture;
}

/**
 * 5. Monocrystalline Photovoltaic Silicon Solar Array Texture
 * Generates iridescent dark navy solar cells with fine silver busbars and grid wires.
 */
export function getSolarCellTexture(): THREE.CanvasTexture {
  if (cachedSolarTexture) return cachedSolarTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep aerospace silicon blue/indigo
  ctx.fillStyle = '#061329';
  ctx.fillRect(0, 0, size, size);

  // Draw 2x4 solar cells grid
  const cols = 2;
  const rows = 4;
  const cellW = size / cols;
  const cellH = size / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = c * cellW + 3;
      const y = r * cellH + 3;
      const w = cellW - 6;
      const h = cellH - 6;

      // Dark cell background
      ctx.fillStyle = '#0c234a';
      ctx.fillRect(x, y, w, h);

      // Fine silver grid contact fingers (vertical)
      ctx.strokeStyle = 'rgba(180, 210, 245, 0.45)';
      ctx.lineWidth = 1;
      for (let gx = x + 8; gx < x + w - 4; gx += 8) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
      }

      // Main silver busbars (horizontal)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.33);
      ctx.lineTo(x + w, y + h * 0.33);
      ctx.moveTo(x, y + h * 0.67);
      ctx.lineTo(x + w, y + h * 0.67);
      ctx.stroke();

      // Chamfered corners of wafer
      ctx.fillStyle = '#061329';
      const ch = 10;
      ctx.fillRect(x, y, ch, ch);
      ctx.fillRect(x + w - ch, y, ch, ch);
      ctx.fillRect(x, y + h - ch, ch, ch);
      ctx.fillRect(x + w - ch, y + h - ch, ch, ch);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  cachedSolarTexture = texture;
  return texture;
}

