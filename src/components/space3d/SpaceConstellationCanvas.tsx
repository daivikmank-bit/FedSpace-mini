// src/components/space3d/SpaceConstellationCanvas.tsx
// High-Fidelity Three.js 3D Space Constellation & Hero Satellite Digital Twin

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStationStore } from '../../store/useStationStore';

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

  // Three.js References
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const satARootRef = useRef<THREE.Group | null>(null);
  const satBGroupRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const earthGroupRef = useRef<THREE.Group | null>(null);
  const antennaAuraRef = useRef<THREE.Mesh | null>(null);
  const islBeamRef = useRef<THREE.Line | null>(null);
  const downlinkLineRef = useRef<THREE.Line | null>(null);

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

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // Set initial position based on mode
    if (currentMode === 'SAT_HERO') {
      camera.position.set(4.2, 2.5, 6.2);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(0, 22, 36);
      camera.lookAt(0, 0, 0);
    }

    // Studio & Space Lighting
    scene.add(new THREE.AmbientLight(0x1a2642, 1.4));

    // Sun Directional Light
    const sunLight = new THREE.DirectionalLight(0xfff7e6, 2.8);
    sunLight.position.set(25, 18, 30);
    scene.add(sunLight);

    // Subtle blue rim light from Earth
    const earthGlow = new THREE.DirectionalLight(0x38bdf8, 1.2);
    earthGlow.position.set(-15, -20, -10);
    scene.add(earthGlow);

    // Deep Space Starfield
    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 90 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x94b8e6, size: 0.9, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(starGeo, starMat));

    // =========================================================================
    // 1. HERO SATELLITE (Sat A - DUT CubeSat) AT THE CENTER OF THE STAGE
    // =========================================================================
    const satARoot = new THREE.Group();
    scene.add(satARoot);
    satARootRef.current = satARoot;

    // 3U CubeSat Chassis Frame (Silver Anodized Aluminum Rails)
    const chassisGeo = new THREE.BoxGeometry(1.4, 1.4, 3.8);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    satARoot.add(chassis);

    // Gold Kapton Foil Thermal Blanket Body Panels
    const foilGeo = new THREE.BoxGeometry(1.36, 1.36, 3.72);
    const foilMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Amber gold Kapton foil
      metalness: 0.95,
      roughness: 0.15
    });
    const foil = new THREE.Mesh(foilGeo, foilMat);
    satARoot.add(foil);

    // Solar Panel Arrays (Left and Right Wings with blue photovoltaic cells)
    const panelWingGeo = new THREE.BoxGeometry(2.8, 0.05, 2.2);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Silicon solar cell deep blue
      metalness: 0.9,
      roughness: 0.15
    });

    const leftWing = new THREE.Mesh(panelWingGeo, panelMat);
    leftWing.position.set(-2.15, 0, 0.2);
    satARoot.add(leftWing);

    const rightWing = new THREE.Mesh(panelWingGeo, panelMat);
    rightWing.position.set(2.15, 0, 0.2);
    satARoot.add(rightWing);

    // Solar Cell Grid Lines on Wings (Subtle Wireframe overlay)
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.35 });
    const leftGrid = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.06, 2.22), gridMat);
    leftWing.add(leftGrid);
    const rightGrid = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.06, 2.22), gridMat);
    rightWing.add(rightGrid);

    // Antenna Mast & Telemetry Beacon
    const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.8 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, 1.25, 1.4);
    satARoot.add(mast);

    const tipGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(0, 0.7, 0);
    mast.add(tip);

    // Antenna Aura (Visualizes esp_wifi_stop sleep cycling and alarm pulses)
    const auraGeo = new THREE.SphereGeometry(1.8, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
      wireframe: true
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.set(0, 1.25, 1.4);
    satARoot.add(aura);
    antennaAuraRef.current = aura;

    // Visible Reaction Wheel Module on Top Face
    const wheelHousingGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.25, 24);
    const wheelHousingMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });
    const wheelHousing = new THREE.Mesh(wheelHousingGeo, wheelHousingMat);
    wheelHousing.position.set(0, 0.75, -0.6);
    satARoot.add(wheelHousing);

    const rotorDiscGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.1, 24);
    const rotorDiscMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6 });
    const rotorDisc = new THREE.Mesh(rotorDiscGeo, rotorDiscMat);
    rotorDisc.position.set(0, 0.15, 0);
    wheelHousing.add(rotorDisc);

    // Optical Sensor / Star Tracker Aperture
    const lensGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 0, 1.95);
    lens.rotation.x = Math.PI / 2;
    satARoot.add(lens);

    // =========================================================================
    // 2. EARTH & LEO ORBIT BACKGROUND
    // =========================================================================
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);
    earthGroupRef.current = earthGroup;

    // In SAT_HERO mode, Earth is a grand curved horizon positioned in the background
    const earthRadius = 16.0;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x1d4ed8,
      emissive: 0x071b3e,
      specular: 0x38bdf8,
      shininess: 25
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earthMeshRef.current = earth;
    earthGroup.add(earth);

    // Atmosphere Fresnel Rim
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.025, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide
    });
    earthGroup.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Ground Station Beacon Marker (Cape Canaveral)
    const beaconGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, earthRadius + 0.1, 0);
    earthGroup.add(beacon);

    // Position Earth nicely below/behind Sat A in Hero mode
    earthGroup.position.set(0, -18.5, -4.0);

    // =========================================================================
    // 3. SAT B (ISL RELAY) IN THE DISTANCE
    // =========================================================================
    const satBGroup = new THREE.Group();
    scene.add(satBGroup);
    satBGroupRef.current = satBGroup;

    const satBChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 })
    );
    satBGroup.add(satBChassis);
    satBGroup.position.set(-14, 2, -10);

    // ESP-NOW Particle Link Line
    const linkGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const linkMat = new THREE.LineDashedMaterial({
      color: 0x00f0ff,
      dashSize: 0.4,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.75
    });
    const islLine = new THREE.Line(linkGeo, linkMat);
    scene.add(islLine);
    islBeamRef.current = islLine;

    // Downlink Beam Line
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
    // MOUSE DRAG & ORBIT CONTROLS
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
        // Orbit around the satellite
        satARoot.rotation.y += dx * 0.006;
        satARoot.rotation.x += dy * 0.006;
      } else {
        scene.rotation.y += dx * 0.005;
        scene.rotation.x += dy * 0.005;
      }
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(3.5, Math.min(45, camera.position.z + e.deltaY * 0.02));
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);

    // =========================================================================
    // ANIMATION LOOP
    // =========================================================================
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Rotate Internal Rotor Disc at live Kalman speed
      rotorDisc.rotation.y += (store.hk.rpmKalman * 2 * Math.PI / 60) * 0.016;

      // Slowly rotate Earth in the background
      if (earthMeshRef.current) {
        earthMeshRef.current.rotation.y += 0.0008;
      }

      // Smooth satellite attitude jitter during F1 imbalance
      if (clipsF1 > 0 && store.hk.rpmKalman > 50) {
        const jitter = (clipsF1 * 0.012) * Math.sin(Date.now() * 0.018);
        satARoot.position.x = Math.sin(Date.now() * 0.015) * jitter;
        satARoot.position.y = Math.cos(Date.now() * 0.015) * jitter;
      } else {
        satARoot.position.set(0, 0, 0);
      }

      // Camera position transition between SAT_HERO and LEO_ORBIT
      const targetCamPos = currentMode === 'SAT_HERO'
        ? new THREE.Vector3(4.2, 2.5, 6.2)
        : new THREE.Vector3(0, 22, 36);

      camera.position.lerp(targetCamPos, 0.04);
      camera.lookAt(0, 0, 0);

      // Antenna RF Beacon state
      if (antennaAuraRef.current) {
        const isAwake = store.orbital.satARadioAwake;
        const auraMat = antennaAuraRef.current.material as THREE.MeshBasicMaterial;

        if (fdirLayer === 'L1_ALARM' || fdirLayer === 'L0_SAFE_TRIP') {
          auraMat.color.setHex(0xef4444); // Crimson pulse
          auraMat.opacity = 0.5 + Math.sin(Date.now() * 0.012) * 0.3;
        } else if (isAwake) {
          auraMat.color.setHex(0xf59e0b); // Amber Wi-Fi active
          auraMat.opacity = 0.3;
        } else {
          auraMat.opacity = 0.03; // Sleep
        }
      }

      // Update ISL Line between Sat A and Sat B
      if (islBeamRef.current) {
        const lineGeo = islBeamRef.current.geometry;
        const posA = satARoot.position;
        const posB = satBGroup.position;
        const positions = new Float32Array([
          posA.x, posA.y + 1.2, posA.z + 1.4,
          posB.x, posB.y, posB.z
        ]);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        lineGeo.attributes.position.needsUpdate = true;
      }

      // Downlink Beam during active contact pass
      if (downlinkLineRef.current) {
        const isPass = store.orbital.isGroundPassActive;
        const downMat = downlinkLineRef.current.material as THREE.LineBasicMaterial;
        downMat.opacity = isPass ? 0.9 : 0.0;
        if (isPass) {
          const downGeo = downlinkLineRef.current.geometry;
          const posGround = earthGroup.position.clone().add(beacon.position);
          const positions = new Float32Array([
            satBGroup.position.x, satBGroup.position.y, satBGroup.position.z,
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
  }, [currentMode]);

  return (
    <div className="relative w-full h-full bg-[#070c18] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Hero Satellite Telemetry Overlay Tags */}
      <div className="absolute top-3 left-4 flex items-center space-x-2 pointer-events-none z-10 font-mono text-xs">
        <div className="px-2.5 py-1 bg-[#0b1325]/90 backdrop-blur-md border border-slate-700/70 rounded-md text-slate-200 flex items-center space-x-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-white">Sat A (DUT Node)</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-300 font-bold">{store.hk.rpmKalman.toFixed(0)} RPM</span>
        </div>

        <div className="px-2 py-1 bg-[#0b1325]/80 backdrop-blur-md border border-slate-800 rounded-md text-[11px] text-slate-400">
          Alt: <strong className="text-slate-200">520 km</strong>
        </div>

        <div className="px-2 py-1 bg-[#0b1325]/80 backdrop-blur-md border border-slate-800 rounded-md text-[11px] text-slate-400">
          Winding: <strong className="text-amber-300">{store.hk.windingTempEstC.toFixed(1)}°C</strong>
        </div>
      </div>

      {/* Orbit & Pass Info Badge (Top Right) */}
      <div className="absolute top-3 right-4 flex items-center space-x-2 pointer-events-none z-10 font-mono text-xs">
        <div className="px-2.5 py-1 bg-[#0b1325]/90 backdrop-blur-md border border-slate-700/70 rounded-md text-slate-300 flex items-center space-x-2 shadow-lg">
          <span>Orb Period:</span>
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
            {currentMode === 'SAT_HERO' ? 'Satellite Hero POV' : 'Full Constellation'}
          </strong>
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-2 left-4 text-[10px] text-slate-500 font-mono pointer-events-none">
        Click & Drag to Orbit 360° around Satellite • Scroll to Zoom
      </div>
    </div>
  );
};
