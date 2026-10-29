// src/components/space3d/SpaceConstellationCanvas.tsx
// Photorealistic 3D Space Constellation & Hero Satellite Digital Twin with Actual Orbital Revolutions

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStationStore } from '../../store/useStationStore';
import {
  getEarthDayTexture,
  getEarthNightTexture,
  getEarthCloudsTexture,
  getKaptonFoilTexture,
  getSolarCellTexture
} from './proceduralSpaceTextures';

interface SpaceConstellationCanvasProps {
  cameraMode?: 'SAT_HERO' | 'LEO_ORBIT';
  onToggleCameraMode?: () => void;
}

export const SpaceConstellationCanvas: React.FC<SpaceConstellationCanvasProps> = ({
  cameraMode: externalCameraMode,
  onToggleCameraMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const store = useStationStore();
  const orbital = store.orbital;
  const fdirLayer = store.fdirLayer;
  const clipsF1 = store.clipsF1;

  // Local camera mode toggle if not controlled externally
  const [internalCameraMode, setInternalCameraMode] = useState<'SAT_HERO' | 'LEO_ORBIT'>('SAT_HERO');
  const currentMode = externalCameraMode || internalCameraMode;

  // Three.js Scene References
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const satARootRef = useRef<THREE.Group | null>(null);
  const satBGroupRef = useRef<THREE.Group | null>(null);
  const earthGlobeRef = useRef<THREE.Mesh | null>(null);
  const earthCloudsRef = useRef<THREE.Mesh | null>(null);
  const earthParentRef = useRef<THREE.Group | null>(null);
  const flywheelRef = useRef<THREE.Mesh | null>(null);
  const antennaAuraRef = useRef<THREE.Mesh | null>(null);
  const groundBeaconRef = useRef<THREE.Mesh | null>(null);
  const groundConeRef = useRef<THREE.Mesh | null>(null);

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
    renderer.toneMappingExposure = 1.25;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // =========================================================================
    // 1. SPACE LIGHTING (Harsh high-contrast space sunlight + Earth shine)
    // =========================================================================
    // Ambient cosmic background light
    scene.add(new THREE.AmbientLight(0x0a1224, 0.9));

    // Harsh Solar Directional Light (Sun in space has zero atmospheric diffusion)
    const sunLight = new THREE.DirectionalLight(0xfffaed, 3.4);
    sunLight.position.set(45, 25, 40);
    scene.add(sunLight);

    // Blue Earth-Shine Albedo Light (Reflected light from Earth oceans)
    const earthShine = new THREE.DirectionalLight(0x38bdf8, 1.4);
    earthShine.position.set(-15, -25, -15);
    scene.add(earthShine);

    // Milky Way & Deep Space Starfield
    const starCount = 2800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColor = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 120 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i + 2] = r * Math.cos(phi);

      // Star color temperatures (blue-white to warm orange)
      const t = Math.random();
      if (t > 0.8) {
        starColor[i] = 0.7; starColor[i + 1] = 0.85; starColor[i + 2] = 1.0; // Blue-white
      } else if (t < 0.15) {
        starColor[i] = 1.0; starColor[i + 1] = 0.75; starColor[i + 2] = 0.5; // Amber
      } else {
        starColor[i] = 0.95; starColor[i + 1] = 0.95; starColor[i + 2] = 1.0; // White
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColor, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // =========================================================================
    // 2. PHOTOREALISTIC DUAL-LAYER EARTH (Rotating Globe + Clouds + Atmosphere)
    // =========================================================================
    const earthParent = new THREE.Group();
    scene.add(earthParent);
    earthParentRef.current = earthParent;

    // Earth axial tilt of 23.44 degrees
    earthParent.rotation.z = (-23.44 * Math.PI) / 180;

    const earthRadius = 15.0;

    // Layer A: Earth Globe with Day Albedo + City Night Lights Emissive
    const dayTex = getEarthDayTexture();
    const nightTex = getEarthNightTexture();

    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: dayTex,
      emissiveMap: nightTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.65,
      specular: new THREE.Color(0x38bdf8),
      shininess: 35
    });
    const earthGlobe = new THREE.Mesh(earthGeo, earthMat);
    earthParent.add(earthGlobe);
    earthGlobeRef.current = earthGlobe;

    // Layer B: Semi-Transparent Dynamic Cloud Sphere (Orbits at independent speed)
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

    // Layer C: Atmospheric Rayleigh Scattering Rim Glow (Fresnel outer shell)
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

    // Ground Station LoS Visibility Cone (Green translucent frustum into LEO)
    const coneHeight = 5.5;
    const coneRadius = 3.2;
    const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 24, 1, true);
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
    groundConeRef.current = groundCone;

    // Position Earth nicely in the viewport background beneath the spacecraft
    earthParent.position.set(0, -18.0, -3.5);

    // =========================================================================
    // 3. PHOTOREALISTIC 3U CUBESAT (Sat A - DUT Payload Node) BIG IN THE MIDDLE
    // =========================================================================
    const satARoot = new THREE.Group();
    scene.add(satARoot);
    satARootRef.current = satARoot;

    // Textures for realistic aerospace materials
    const foilTex = getKaptonFoilTexture();
    const solarTex = getSolarCellTexture();

    // 3U CubeSat CNC-Machined Anodized Skeleton Frame
    const frameGeo = new THREE.BoxGeometry(1.5, 1.5, 4.0);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e2638,
      metalness: 0.85,
      roughness: 0.3
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    satARoot.add(frame);

    // Wrinkled Gold Kapton Multi-Layer Insulation (MLI) Thermal Blanket
    const foilGeo = new THREE.BoxGeometry(1.46, 1.46, 3.92);
    const foilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Real radiant aerospace gold
      bumpMap: foilTex,
      bumpScale: 0.08,
      metalness: 0.92,
      roughness: 0.22
    });
    const foilMesh = new THREE.Mesh(foilGeo, foilMat);
    satARoot.add(foilMesh);

    // Silver Aluminum Corner Guide Rails (Standard CubeSat P-POD deployment rails)
    const railMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    const cornerOffsets = [
      [-0.76, -0.76], [0.76, -0.76], [-0.76, 0.76], [0.76, 0.76]
    ];
    cornerOffsets.forEach(([cx, cy]) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.08), railMat);
      rail.position.set(cx, cy, 0);
      satARoot.add(rail);
    });

    // Deployable Photovoltaic Solar Arrays (Left & Right Wings with authentic silicon cells)
    const wingGeo = new THREE.BoxGeometry(3.2, 0.06, 2.4);
    const wingMat = new THREE.MeshStandardMaterial({
      map: solarTex,
      metalness: 0.88,
      roughness: 0.18
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-2.45, 0, 0.3);
    satARoot.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(2.45, 0, 0.3);
    satARoot.add(rightWing);

    // Gold-Plated PCB Edge Busbars & Deployment Hinges
    const hingeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 });
    const leftHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12), hingeMat);
    leftHinge.position.set(-0.82, 0, 0.3);
    satARoot.add(leftHinge);

    const rightHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12), hingeMat);
    rightHinge.position.set(0.82, 0, 0.3);
    satARoot.add(rightHinge);

    // Open Payload Bay: Active Stainless Steel Reaction Wheel Flywheel
    const bayHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.28, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.25 })
    );
    bayHousing.position.set(0, 0.8, -0.7);
    satARoot.add(bayHousing);

    // Precision Tuned Brass/Steel Flywheel
    const flywheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.12, 32),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.95,
        roughness: 0.12
      })
    );
    flywheel.position.set(0, 0.16, 0);
    bayHousing.add(flywheel);
    flywheelRef.current = flywheel;

    // Star Tracker Camera Optics on Nadir Face (Anti-reflective purple/cyan glare)
    const starTracker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 })
    );
    starTracker.rotation.x = Math.PI / 2;
    starTracker.position.set(0, 0, 2.1);
    satARoot.add(starTracker);

    const lensAperture = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    lensAperture.position.set(0, 0, 2.31);
    satARoot.add(lensAperture);

    // S-Band Patch Antenna (Ceramic patch with brass feed pin)
    const patchAnt = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
    );
    patchAnt.position.set(0, -0.76, 0.5);
    satARoot.add(patchAnt);

    // Deployable Telemetry Dipole Antenna Mast & RF Beacon
    const mastGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.85 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, 1.45, 1.4);
    satARoot.add(mast);

    const beaconTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    beaconTip.position.set(0, 0.8, 0);
    mast.add(beaconTip);

    // RF Telemetry Aura (visualizes esp_wifi_stop sleep cycling and alarm pulses)
    const auraGeo = new THREE.SphereGeometry(2.0, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
      wireframe: true
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.set(0, 1.45, 1.4);
    satARoot.add(aura);
    antennaAuraRef.current = aura;

    // =========================================================================
    // 4. SAT B (ISL Relay CubeSat) in the Distance
    // =========================================================================
    const satBGroup = new THREE.Group();
    scene.add(satBGroup);
    satBGroupRef.current = satBGroup;

    const satBChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 })
    );
    satBGroup.add(satBChassis);
    satBGroup.position.set(-16, 3, -12);

    // =========================================================================
    // 5. MOUSE DRAG & ORBIT CONTROLS
    // =========================================================================
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

      if (currentMode === 'SAT_HERO') {
        // Orbit 360 around the satellite
        satARoot.rotation.y += dx * 0.005;
        satARoot.rotation.x += dy * 0.005;
      } else {
        scene.rotation.y += dx * 0.004;
        scene.rotation.x += dy * 0.004;
      }
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(3.5, Math.min(50, camera.position.z + e.deltaY * 0.02));
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);

    // =========================================================================
    // 6. ANIMATION LOOP: ACTUAL ORBITAL & PHYSICAL REVOLUTIONS
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

      // Actual Earth Revolution around its spin axis
      if (earthGlobeRef.current) {
        earthGlobeRef.current.rotation.y += 0.02 * dt; // Earth rotates underneath spacecraft
      }

      // Dynamic Cloud Layer Parallax (Clouds drift slightly faster than the crust)
      if (earthCloudsRef.current) {
        earthCloudsRef.current.rotation.y += 0.026 * dt;
      }

      // Actual Orbital Revolution of Sat A & Sat B:
      // In Hero Mode (SAT_HERO):
      // Sat A stays in the center stage while the Earth, continents, and cloud layers roll past underneath in genuine orbital revolution!
      if (currentMode === 'SAT_HERO') {
        const orbitAngle = orbital.orbitFraction * 2 * Math.PI;
        // Pitch satellite slightly along its velocity vector
        satARoot.rotation.z = Math.sin(orbitAngle * 0.5) * 0.08;

        // Realistic attitude vibration / precession during F1 imbalance
        if (clipsF1 > 0 && rpm > 40) {
          const wobbleFreq = wheelOmega;
          const wobbleAmp = (clipsF1 * 0.015) * Math.min(1.5, rpm / 220);
          satARoot.position.x = Math.sin(now * 0.01) * wobbleAmp;
          satARoot.position.y = Math.cos(now * 0.01) * wobbleAmp;
          satARoot.rotation.x += Math.sin(wobbleFreq * dt * 4) * 0.003;
        } else {
          satARoot.position.set(0, 0, 0);
        }
      }

      // Camera Smooth Interpolation between modes
      const targetCamPos = currentMode === 'SAT_HERO'
        ? new THREE.Vector3(4.5, 2.6, 6.8)
        : new THREE.Vector3(0, 24, 38);

      camera.position.lerp(targetCamPos, 0.05);
      camera.lookAt(0, 0, 0);

      // Antenna RF Beacon state
      if (antennaAuraRef.current) {
        const isAwake = store.orbital.satARadioAwake;
        const auraMat = antennaAuraRef.current.material as THREE.MeshBasicMaterial;

        if (fdirLayer === 'L1_ALARM' || fdirLayer === 'L0_SAFE_TRIP') {
          auraMat.color.setHex(0xef4444); // Crimson pulse
          auraMat.opacity = 0.5 + Math.sin(now * 0.01) * 0.3;
        } else if (isAwake) {
          auraMat.color.setHex(0xf59e0b); // Amber Wi-Fi active
          auraMat.opacity = 0.3;
        } else {
          auraMat.opacity = 0.03; // Sleep
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
  }, [currentMode]);

  return (
    <div className="relative w-full h-full bg-[#050914] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Hero Satellite Telemetry Overlay Tags */}
      <div className="absolute top-3 left-4 flex items-center space-x-2 pointer-events-none z-10 font-mono text-xs">
        <div className="px-2.5 py-1 bg-[#0b1325]/90 backdrop-blur-md border border-slate-700/70 rounded-md text-slate-200 flex items-center space-x-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-white">Sat A (DUT CubeSat)</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-300 font-bold">{store.hk.rpmKalman.toFixed(0)} RPM</span>
        </div>

        <div className="px-2 py-1 bg-[#0b1325]/80 backdrop-blur-md border border-slate-800 rounded-md text-[11px] text-slate-400">
          LEO Alt: <strong className="text-slate-200">520 km</strong>
        </div>

        <div className="px-2 py-1 bg-[#0b1325]/80 backdrop-blur-md border border-slate-800 rounded-md text-[11px] text-slate-400">
          Winding: <strong className="text-amber-300">{store.hk.windingTempEstC.toFixed(1)}°C</strong>
        </div>
      </div>

      {/* Orbit & Pass Info Badge (Top Right) */}
      <div className="absolute top-3 right-4 flex items-center space-x-2 pointer-events-none z-10 font-mono text-xs">
        <div className="px-2.5 py-1 bg-[#0b1325]/90 backdrop-blur-md border border-slate-700/70 rounded-md text-slate-300 flex items-center space-x-2 shadow-lg">
          <span>Orbital Revolution:</span>
          <span className="text-cyan-400 font-bold">576.0s (10x LEO)</span>
        </div>

        <div className={`px-2.5 py-1 rounded-md border backdrop-blur-md text-xs font-mono font-medium ${
          orbital.isGroundPassActive
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold animate-pulse'
            : 'bg-[#0b1325]/90 border-slate-800 text-slate-400'
        }`}>
          <span>LoS Pass: </span>
          <span>{orbital.isGroundPassActive ? `ACTIVE (${orbital.passCountdownSec}s)` : `IN ${orbital.passCountdownSec}s`}</span>
        </div>
      </div>

      {/* Camera Mode Switch Button (Floating Top Left) */}
      <div className="absolute top-12 left-4 z-20 font-mono text-[11px]">
        <button
          onClick={() => {
            const next = currentMode === 'SAT_HERO' ? 'LEO_ORBIT' : 'SAT_HERO';
            setInternalCameraMode(next);
            if (onToggleCameraMode) onToggleCameraMode();
          }}
          className="px-2.5 py-1 bg-[#0d1629]/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 rounded-md text-slate-200 shadow-md flex items-center space-x-1.5 transition"
        >
          <span>Camera:</span>
          <strong className="text-cyan-400">
            {currentMode === 'SAT_HERO' ? 'Satellite Orbit Chase POV' : 'Full Earth Constellation'}
          </strong>
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-2 left-4 text-[10px] text-slate-500 font-mono pointer-events-none">
        Drag to Orbit 360° around Satellite • Earth Rotates in Real Orbital Revolution Below
      </div>
    </div>
  );
};
