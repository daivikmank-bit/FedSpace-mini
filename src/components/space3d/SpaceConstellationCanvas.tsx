// src/components/space3d/SpaceConstellationCanvas.tsx
// Photorealistic 3D Space Constellation & Hero Satellite Digital Twin with Actual Orbital Revolutions

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStationStore } from '../../store/useStationStore';
import {
  getEarthDayTexture,
  getEarthNightTexture,
  getEarthSpecularTexture,
  getEarthCloudsTexture,
  getKaptonFoilTexture,
  getSilverMliTexture,
  getSolarCellTexture
} from './proceduralSpaceTextures';

export type CameraPreset = 'HERO_CHASE' | 'EARTH_HORIZON' | 'GROUND_TRACK' | 'WHEEL_INSPECT';

interface SpaceConstellationCanvasProps {
  cameraPreset?: CameraPreset;
  onCameraPresetChange?: (preset: CameraPreset) => void;
}

export const SpaceConstellationCanvas: React.FC<SpaceConstellationCanvasProps> = ({
  cameraPreset = 'HERO_CHASE',
  onCameraPresetChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const store = useStationStore();
  const orbital = store.orbital;
  const fdirLayer = store.fdirLayer;
  const clipsF1 = store.clipsF1;

  // Active camera preset tracking
  const [activePreset, setActivePreset] = useState<CameraPreset>(cameraPreset);

  useEffect(() => {
    setActivePreset(cameraPreset);
  }, [cameraPreset]);

  // Three.js Scene References
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const satARootRef = useRef<THREE.Group | null>(null);
  const satBRootRef = useRef<THREE.Group | null>(null);
  const earthGlobeRef = useRef<THREE.Mesh | null>(null);
  const earthCloudsRef = useRef<THREE.Mesh | null>(null);
  const earthParentRef = useRef<THREE.Group | null>(null);
  const flywheelRef = useRef<THREE.Mesh | null>(null);
  const antennaAuraRef = useRef<THREE.Mesh | null>(null);
  const satBAuraRef = useRef<THREE.Mesh | null>(null);
  const islBeamRef = useRef<THREE.Line | null>(null);
  const islPacketsRef = useRef<THREE.Group | null>(null);
  const downlinkLineRef = useRef<THREE.Line | null>(null);
  const groundBeaconRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // =========================================================================
    // 1. SPACE LIGHTING & SOLAR CORONA
    // =========================================================================
    scene.add(new THREE.AmbientLight(0x050b18, 1.1));

    // Sun directional light (Harsh space sunlight)
    const sunLight = new THREE.DirectionalLight(0xfffaee, 4.4);
    sunLight.position.set(55, 32, 48);
    scene.add(sunLight);

    // Blue Earth-Shine albedo fill light
    const earthShine = new THREE.DirectionalLight(0x38bdf8, 1.6);
    earthShine.position.set(-18, -28, -18);
    scene.add(earthShine);

    // Optical Sun Corona Glare Sprite
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 128;
    sunCanvas.height = 128;
    const sCtx = sunCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    sGrad.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
    sGrad.addColorStop(0.15, 'rgba(255, 230, 160, 0.7)');
    sGrad.addColorStop(0.4, 'rgba(255, 180, 80, 0.25)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);
    const sunTex = new THREE.CanvasTexture(sunCanvas);

    const sunSpriteMat = new THREE.SpriteMaterial({
      map: sunTex,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    const sunSprite = new THREE.Sprite(sunSpriteMat);
    sunSprite.position.set(110, 64, 96);
    sunSprite.scale.set(48, 48, 1);
    scene.add(sunSprite);

    // Milky Way & Deep Space Starfield
    const starCount = 3500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColor = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 140 + Math.random() * 90;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i + 2] = r * Math.cos(phi);

      const t = Math.random();
      if (t > 0.8) {
        starColor[i] = 0.75; starColor[i + 1] = 0.88; starColor[i + 2] = 1.0;
      } else if (t < 0.15) {
        starColor[i] = 1.0; starColor[i + 1] = 0.78; starColor[i + 2] = 0.55;
      } else {
        starColor[i] = 0.96; starColor[i + 1] = 0.96; starColor[i + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColor, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.95
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // Shared realistic textures
    const goldFoilTex = getKaptonFoilTexture();
    const silverMliTex = getSilverMliTexture();
    const solarTex = getSolarCellTexture();

    // =========================================================================
    // 2. PHOTOREALISTIC DUAL-LAYER EARTH WITH OCEAN SPECULAR GLINT
    // =========================================================================
    const earthParent = new THREE.Group();
    scene.add(earthParent);
    earthParentRef.current = earthParent;
    earthParent.rotation.z = (-23.44 * Math.PI) / 180; // Earth 23.44 deg axial tilt

    const earthRadius = 15.0;

    // Layer A: Earth Globe with Day Albedo + Ocean Specular Glint + City Night Lights
    const dayTex = getEarthDayTexture();
    const nightTex = getEarthNightTexture();
    const specularTex = getEarthSpecularTexture();

    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: dayTex,
      specularMap: specularTex,
      specular: new THREE.Color(0xa5f3fc), // Brilliant cyan-white solar glint on oceans
      shininess: 48,
      emissiveMap: nightTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.55
    });
    const earthGlobe = new THREE.Mesh(earthGeo, earthMat);
    earthParent.add(earthGlobe);
    earthGlobeRef.current = earthGlobe;

    // Layer B: Semi-Transparent Dynamic Cloud Sphere (Drifts independently)
    const cloudsTex = getEarthCloudsTexture();
    const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.012, 64, 64);
    const cloudsMat = new THREE.MeshPhongMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    const earthClouds = new THREE.Mesh(cloudsGeo, cloudsMat);
    earthParent.add(earthClouds);
    earthCloudsRef.current = earthClouds;

    // Layer C: Atmospheric Rayleigh Scattering Rim (Fresnel outer shell)
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.028, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    earthParent.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Ground Station at Cape Canaveral / Kennedy Space Center (28.5 deg N, -80.5 deg W)
    const beaconRadius = earthRadius + 0.08;
    const phi = ((90 - 28.5) * Math.PI) / 180;
    const theta = ((-80.5 + 180) * Math.PI) / 180;
    const bx = -beaconRadius * Math.sin(phi) * Math.cos(theta);
    const by = beaconRadius * Math.cos(phi);
    const bz = beaconRadius * Math.sin(phi) * Math.sin(theta);

    const beaconGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const groundBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    groundBeacon.position.set(bx, by, bz);
    earthGlobe.add(groundBeacon);
    groundBeaconRef.current = groundBeacon;

    // Ground Station LoS Visibility Cone
    const coneGeo = new THREE.ConeGeometry(3.2, 5.5, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide
    });
    const groundCone = new THREE.Mesh(coneGeo, coneMat);
    groundCone.position.set(bx, by, bz);
    groundCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(bx, by, bz).normalize());
    earthGlobe.add(groundCone);
    earthParent.position.set(0, -18.0, -3.5);

    // =========================================================================
    // 3. SATELLITE A (DUT Payload Node) - GOLD KAPTON MLI BLANKET
    // =========================================================================
    const satARoot = new THREE.Group();
    scene.add(satARoot);
    satARootRef.current = satARoot;

    // 3U CubeSat CNC Frame
    const frameGeo = new THREE.BoxGeometry(1.5, 1.5, 4.0);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e2638,
      metalness: 0.85,
      roughness: 0.3
    });
    satARoot.add(new THREE.Mesh(frameGeo, frameMat));

    // Gold Kapton MLI Thermal Blanket Body
    const foilGeo = new THREE.BoxGeometry(1.46, 1.46, 3.92);
    const foilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      bumpMap: goldFoilTex,
      bumpScale: 0.08,
      metalness: 0.92,
      roughness: 0.22
    });
    satARoot.add(new THREE.Mesh(foilGeo, foilMat));

    // Corner Guide Rails (Standard P-POD Rails)
    const railMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    const cornerOffsets = [[-0.76, -0.76], [0.76, -0.76], [-0.76, 0.76], [0.76, 0.76]];
    cornerOffsets.forEach(([cx, cy]) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.08), railMat);
      rail.position.set(cx, cy, 0);
      satARoot.add(rail);
    });

    // Deployable Photovoltaic Solar Arrays
    const wingGeo = new THREE.BoxGeometry(3.2, 0.06, 2.4);
    const wingMat = new THREE.MeshStandardMaterial({
      map: solarTex,
      metalness: 0.88,
      roughness: 0.18
    });

    const leftWingA = new THREE.Mesh(wingGeo, wingMat);
    leftWingA.position.set(-2.45, 0, 0.3);
    satARoot.add(leftWingA);

    const rightWingA = new THREE.Mesh(wingGeo, wingMat);
    rightWingA.position.set(2.45, 0, 0.3);
    satARoot.add(rightWingA);

    // Reaction Wheel Inspection Bay & Flywheel
    const bayHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.28, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.25 })
    );
    bayHousing.position.set(0, 0.8, -0.7);
    satARoot.add(bayHousing);

    const flywheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.95, roughness: 0.12 })
    );
    flywheel.position.set(0, 0.16, 0);
    bayHousing.add(flywheel);
    flywheelRef.current = flywheel;

    // Star Tracker Camera Optics on Nadir Face
    const starTracker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 })
    );
    starTracker.rotation.x = Math.PI / 2;
    starTracker.position.set(0, 0, 2.1);
    satARoot.add(starTracker);

    // Deployable Telemetry Dipole Antenna Mast & RF Beacon
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.85 })
    );
    mast.position.set(0, 1.45, 1.4);
    satARoot.add(mast);

    const beaconTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    beaconTip.position.set(0, 0.8, 0);
    mast.add(beaconTip);

    // RF Telemetry Aura
    const auraMatA = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
      wireframe: true
    });
    const auraA = new THREE.Mesh(new THREE.SphereGeometry(2.0, 16, 16), auraMatA);
    auraA.position.set(0, 1.45, 1.4);
    satARoot.add(auraA);
    antennaAuraRef.current = auraA;

    // =========================================================================
    // 4. SATELLITE B (ISL Relay & EGSE Node) - HIGH-GAIN RELAY CUBESAT
    // =========================================================================
    const satBRoot = new THREE.Group();
    scene.add(satBRoot);
    satBRootRef.current = satBRoot;

    // Sat B Position in Formation: Clearly visible trailing Sat A over Earth horizon
    satBRoot.position.set(-8.2, 1.9, -6.5);
    // Orient Sat B so its ISL Dish points directly at Sat A
    satBRoot.rotation.set(0.1, 0.65, 0.05);

    // 3U+ Communications Relay Chassis
    const satBFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.3, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x1e2638, metalness: 0.85, roughness: 0.25 })
    );
    satBRoot.add(satBFrame);

    // Silver / Platinum Beta Cloth Thermal MLI Blanket
    const satBBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.26, 1.26, 3.32),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0, // High-specular aerospace silver/platinum
        bumpMap: silverMliTex,
        bumpScale: 0.07,
        metalness: 0.95,
        roughness: 0.18
      })
    );
    satBRoot.add(satBBody);

    // Silver Guide Rails on Sat B
    cornerOffsets.forEach(([cx, cy]) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 3.48), railMat);
      rail.position.set(cx * 0.86, cy * 0.86, 0);
      satBRoot.add(rail);
    });

    // Deployable Solar Array Wings on Sat B
    const wingGeoB = new THREE.BoxGeometry(2.6, 0.05, 1.9);
    const leftWingB = new THREE.Mesh(wingGeoB, wingMat);
    leftWingB.position.set(-1.95, 0, 0.1);
    satBRoot.add(leftWingB);

    const rightWingB = new THREE.Mesh(wingGeoB, wingMat);
    rightWingB.position.set(1.95, 0, 0.1);
    satBRoot.add(rightWingB);

    // High-Gain Parabolic Communications Dish (ISL Inter-Satellite Terminal)
    // Reflector dish aimed along line-of-sight toward Sat A
    const dishGroup = new THREE.Group();
    dishGroup.position.set(0, 0.9, 0.8);
    satBRoot.add(dishGroup);

    // Parabolic Dish Reflector Mesh
    const dishGeo = new THREE.CylinderGeometry(0.75, 0.15, 0.35, 32, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Gold mesh space communications reflector
      metalness: 0.96,
      roughness: 0.15,
      side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.rotation.x = -Math.PI / 3;
    dishGroup.add(dish);

    // Dish Central Sub-Reflector Feed Horn
    const feedHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1 })
    );
    feedHorn.rotation.x = Math.PI / 2;
    feedHorn.position.set(0, 0.25, 0.2);
    dishGroup.add(feedHorn);

    // Sub-reflector tripod struts
    for (let s = 0; s < 3; s++) {
      const strutAngle = (s * Math.PI * 2) / 3;
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.65, 8),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 })
      );
      strut.position.set(Math.cos(strutAngle) * 0.35, 0.1, Math.sin(strutAngle) * 0.35);
      strut.rotation.z = Math.PI / 4;
      dishGroup.add(strut);
    }

    // High-Gain S/X-Band Helical Downlink Antenna on Nadir Face (Pointed to Earth)
    const helixMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85 })
    );
    helixMast.position.set(0, -1.2, 0.4);
    satBRoot.add(helixMast);

    const helixCoil = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.03, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 })
    );
    helixCoil.position.set(0, -1.4, 0.4);
    satBRoot.add(helixCoil);

    // Attitude Thruster Quads on Sat B Corners
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
    const thrusterPositions = [
      [-0.6, -0.6, 1.6], [0.6, -0.6, 1.6], [-0.6, 0.6, 1.6], [0.6, 0.6, 1.6]
    ];
    thrusterPositions.forEach(([tx, ty, tz]) => {
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), thrusterMat);
      nozzle.rotation.x = Math.PI;
      nozzle.position.set(tx, ty, tz);
      satBRoot.add(nozzle);
    });

    // Sat B Cyan ISL Transceiver Beacon Aura
    const satBAuraMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.2,
      wireframe: true
    });
    const satBAura = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), satBAuraMat);
    satBAura.position.set(0, 0.9, 0.8);
    satBRoot.add(satBAura);
    satBAuraRef.current = satBAura;

    // =========================================================================
    // 5. ANIMATED INTER-SATELLITE LINK (ISL) PACKET BEAM & DOWNLINK
    // =========================================================================
    const islGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const islMat = new THREE.LineDashedMaterial({
      color: 0x00f0ff,
      dashSize: 0.5,
      gapSize: 0.25,
      transparent: true,
      opacity: 0.85
    });
    const islLine = new THREE.Line(islGeo, islMat);
    scene.add(islLine);
    islBeamRef.current = islLine;

    // Moving Optical Photon Packets along ISL beam
    const islPacketsGroup = new THREE.Group();
    scene.add(islPacketsGroup);
    islPacketsRef.current = islPacketsGroup;

    for (let p = 0; p < 4; p++) {
      const pMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff })
      );
      islPacketsGroup.add(pMesh);
    }

    // Downlink Beam from Sat B to Earth Ground Station
    const downGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const downMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      linewidth: 3,
      transparent: true,
      opacity: 0
    });
    const downLine = new THREE.Line(downGeo, downMat);
    scene.add(downLine);
    downlinkLineRef.current = downLine;

    // =========================================================================
    // 6. SPHERICAL MOUSE ORBIT & ZOOM CONTROLS
    // =========================================================================
    let targetRadius = 7.0;
    let targetTheta = 0.8;
    let targetPhi = 1.1;
    let targetLook = new THREE.Vector3(0, 0, 0);

    let curRadius = 7.0;
    let curTheta = 0.8;
    let curPhi = 1.1;
    let curLook = new THREE.Vector3(0, 0, 0);

    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      targetTheta -= dx * 0.005;
      targetPhi = Math.max(0.15, Math.min(Math.PI - 0.15, targetPhi - dy * 0.005));
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      targetRadius = Math.max(2.6, Math.min(48.0, targetRadius + e.deltaY * 0.015));
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);

    // =========================================================================
    // 7. ANIMATION LOOP: ACTUAL ORBITAL & PHYSICAL REVOLUTIONS
    // =========================================================================
    let animId = 0;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = (now - lastTime) / 1000.0;
      lastTime = now;

      // Actual Wheel Revolution: ω(t) = 2π * RPM / 60 rad/s
      const rpm = store.hk.rpmKalman;
      const wheelOmega = (rpm * 2 * Math.PI) / 60.0;
      if (flywheelRef.current) {
        flywheelRef.current.rotation.y += wheelOmega * dt;
      }

      // Actual Earth Rotation around its axial tilt
      if (earthGlobeRef.current) {
        earthGlobeRef.current.rotation.y += 0.02 * dt;
      }

      // Dynamic Cloud Layer Parallax
      if (earthCloudsRef.current) {
        earthCloudsRef.current.rotation.y += 0.026 * dt;
      }

      // Formation flying attitude oscillation for Sat B
      satBRoot.rotation.y = 0.65 + Math.sin(now * 0.001) * 0.05;
      satBRoot.rotation.z = 0.05 + Math.cos(now * 0.0012) * 0.03;

      // Actual Orbital Revolution & Attitude Wobble under F1 Mass Imbalance
      const orbitAngle = orbital.orbitFraction * 2 * Math.PI;
      satARoot.rotation.z = Math.sin(orbitAngle * 0.5) * 0.08;

      if (clipsF1 > 0 && rpm > 40) {
        const wobbleFreq = wheelOmega;
        const wobbleAmp = (clipsF1 * 0.015) * Math.min(1.5, rpm / 220);
        satARoot.position.x = Math.sin(now * 0.01) * wobbleAmp;
        satARoot.position.y = Math.cos(now * 0.01) * wobbleAmp;
        satARoot.rotation.x += Math.sin(wobbleFreq * dt * 4) * 0.003;
      } else {
        satARoot.position.set(0, 0, 0);
      }

      // Preset Camera Position Management
      if (activePreset === 'HERO_CHASE') {
        targetLook.set(0, 0, 0);
      } else if (activePreset === 'EARTH_HORIZON') {
        targetLook.set(0, -6, 0);
      } else if (activePreset === 'GROUND_TRACK') {
        targetLook.set(0, -10, 0);
      } else if (activePreset === 'WHEEL_INSPECT') {
        targetLook.set(0, 0.8, -0.7);
      }

      // Smooth camera interpolation
      curRadius += (targetRadius - curRadius) * 0.08;
      curTheta += (targetTheta - curTheta) * 0.08;
      curPhi += (targetPhi - curPhi) * 0.08;
      curLook.lerp(targetLook, 0.08);

      const cx = curLook.x + curRadius * Math.sin(curPhi) * Math.sin(curTheta);
      const cy = curLook.y + curRadius * Math.cos(curPhi);
      const cz = curLook.z + curRadius * Math.sin(curPhi) * Math.cos(curTheta);

      camera.position.set(cx, cy, cz);
      camera.lookAt(curLook);

      // Antenna RF Beacon state
      if (antennaAuraRef.current) {
        const isAwake = store.orbital.satARadioAwake;
        const auraMat = antennaAuraRef.current.material as THREE.MeshBasicMaterial;

        if (fdirLayer === 'L1_ALARM' || fdirLayer === 'L0_SAFE_TRIP') {
          auraMat.color.setHex(0xef4444);
          auraMat.opacity = 0.5 + Math.sin(now * 0.01) * 0.3;
        } else if (isAwake) {
          auraMat.color.setHex(0xf59e0b);
          auraMat.opacity = 0.3;
        } else {
          auraMat.opacity = 0.03;
        }
      }

      // Sat B Cyan Transceiver Beacon Pulse
      if (satBAuraRef.current) {
        const bAuraMat = satBAuraRef.current.material as THREE.MeshBasicMaterial;
        bAuraMat.opacity = 0.2 + Math.sin(now * 0.004) * 0.15;
      }

      // Update ISL Line between Sat A and Sat B
      if (islBeamRef.current) {
        const lineGeo = islBeamRef.current.geometry;
        const posA = satARoot.position;
        const posB = satBRoot.position;
        const positions = new Float32Array([
          posA.x, posA.y + 1.4, posA.z + 1.4,
          posB.x, posB.y + 0.9, posB.z + 0.8
        ]);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        lineGeo.attributes.position.needsUpdate = true;
      }

      // Animate Optical Photon Packets along ISL
      if (islPacketsRef.current) {
        const posA = satARoot.position.clone().add(new THREE.Vector3(0, 1.4, 1.4));
        const posB = satBRoot.position.clone().add(new THREE.Vector3(0, 0.9, 0.8));
        const packets = islPacketsRef.current.children;
        for (let i = 0; i < packets.length; i++) {
          const frac = (now * 0.0012 + (i / packets.length)) % 1.0;
          packets[i].position.lerpVectors(posA, posB, frac);
        }
      }

      // Downlink Beam from Sat B to Earth Ground Station
      if (downlinkLineRef.current && groundBeaconRef.current) {
        const isPass = store.orbital.isGroundPassActive;
        const downMat = downlinkLineRef.current.material as THREE.LineBasicMaterial;
        downMat.opacity = isPass ? 0.9 : 0.0;
        if (isPass) {
          const downGeo = downlinkLineRef.current.geometry;
          const posGround = earthParent.position.clone().add(groundBeaconRef.current.position);
          const positions = new Float32Array([
            satBRoot.position.x, satBRoot.position.y - 1.2, satBRoot.position.z + 0.4,
            posGround.x, posGround.y, posGround.z
          ]);
          downGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          downGeo.attributes.position.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [activePreset]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#020409] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
    </div>
  );
};
