// src/components/space3d/SpaceConstellationCanvas.tsx
// High-Fidelity Three.js 3D Space Constellation & Orbital Mechanics Simulation

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStationStore } from '../../store/useStationStore';

export const SpaceConstellationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const store = useStationStore();
  const orbital = store.orbital;
  const policy = store.telemetryPolicy;
  const fdirLayer = store.fdirLayer;

  // Keep animated Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const satAMeshRef = useRef<THREE.Group | null>(null);
  const satBMeshRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const beamLineRef = useRef<THREE.Line | null>(null);
  const downlinkLineRef = useRef<THREE.Line | null>(null);
  const antennaAuraRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 32);
    camera.lookAt(0, 0, 0);

    // Ambient & Directional Sun Lighting
    const ambientLight = new THREE.AmbientLight(0x1a233a, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7e6, 2.5);
    sunLight.position.set(40, 20, 30);
    scene.add(sunLight);

    // Deep Space Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1800;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 80 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x88bbff, size: 0.8, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 3D Earth (Radius = 10)
    const earthRadius = 10;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 48, 48);
    
    // Procedural Earth shader / material
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x1d4ed8,
      emissive: 0x051b3b,
      specular: 0x38bdf8,
      shininess: 25,
      wireframe: false
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earthMeshRef.current = earth;
    scene.add(earth);

    // Earth Atmosphere Rim Glow
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.03, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Inclined 10x LEO Orbit Ring (Inclination 51.6 deg)
    const orbitRadius = 14.5;
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, 2 * Math.PI, false, 0);
    const orbitPoints = orbitCurve.getPoints(120);
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y)));
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.35 });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.rotation.x = Math.PI / 2;
    orbitLine.rotation.y = (51.6 * Math.PI) / 180;
    scene.add(orbitLine);

    // Ground Station Visibility Cone (Cape Canaveral approx lat 28.5)
    const coneHeight = 6.0;
    const coneRadius = 3.5;
    const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    });
    const groundCone = new THREE.Mesh(coneGeo, coneMat);
    groundCone.position.set(8.5, 4.8, 0);
    groundCone.rotation.z = -Math.PI / 3.2;
    scene.add(groundCone);

    // Ground Station Beacon Marker
    const beaconGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(8.7, 4.9, 0);
    scene.add(beacon);

    // Helper: Create 3U CubeSat Mesh
    const createCubeSatMesh = (color: number, name: string) => {
      const group = new THREE.Group();
      
      // Chassis (1U x 1U x 3U)
      const bodyGeo = new THREE.BoxGeometry(0.7, 0.7, 1.8);
      const bodyMat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.85,
        roughness: 0.25
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      // Solar Panels
      const panelGeo = new THREE.BoxGeometry(1.6, 0.04, 1.4);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.9,
        roughness: 0.2
      });
      const panelL = new THREE.Mesh(panelGeo, panelMat);
      panelL.position.set(-1.15, 0, 0);
      group.add(panelL);

      const panelR = new THREE.Mesh(panelGeo, panelMat);
      panelR.position.set(1.15, 0, 0);
      group.add(panelR);

      // Antenna
      const antGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8);
      const antMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(0, 0.6, 0.7);
      group.add(ant);

      return group;
    };

    // Sat A (DUT Node)
    const satA = createCubeSatMesh(0xd97706, 'Sat A (DUT)');
    satAMeshRef.current = satA;
    scene.add(satA);

    // Sat A Antenna Aura (Pulsing / Sleep state)
    const auraGeo = new THREE.SphereGeometry(1.1, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
      wireframe: true
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.set(0, 0.6, 0.7);
    satA.add(aura);
    antennaAuraRef.current = aura;

    // Sat B (Relay Node)
    const satB = createCubeSatMesh(0x0284c7, 'Sat B (ISL Relay)');
    satBMeshRef.current = satB;
    scene.add(satB);

    // Sat A <-> Sat B ESP-NOW Link Line
    const linkGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const linkMat = new THREE.LineDashedMaterial({
      color: 0x00f0ff,
      dashSize: 0.5,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.7
    });
    const linkLine = new THREE.Line(linkGeo, linkMat);
    scene.add(linkLine);
    beamLineRef.current = linkLine;

    // Ground Pass Downlink Beam Line
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

    // Mouse drag rotation controls
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
      scene.rotation.y += dx * 0.005;
      scene.rotation.x += dy * 0.005;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(16, Math.min(60, camera.position.z + e.deltaY * 0.03));
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Slowly rotate Earth
      if (earthMeshRef.current) {
        earthMeshRef.current.rotation.y += 0.001;
      }

      // Update Sat A & Sat B Positions from Orbital State
      const currentOrbitTime = store.orbital.orbitTimeSec;
      const fracA = (currentOrbitTime / 576.0);
      const fracB = ((currentOrbitTime - 12.0) / 576.0); // Sat B trails Sat A

      const thetaA = fracA * 2 * Math.PI;
      const thetaB = fracB * 2 * Math.PI;

      // Orbit plane transform
      const inc = (51.6 * Math.PI) / 180;
      const getPos = (theta: number) => {
        const x = orbitRadius * Math.cos(theta);
        const z = orbitRadius * Math.sin(theta);
        // Tilt around X axis
        const yRot = z * Math.sin(inc);
        const zRot = z * Math.cos(inc);
        return new THREE.Vector3(x, yRot, zRot);
      };

      const posA = getPos(thetaA);
      const posB = getPos(thetaB);

      if (satAMeshRef.current) {
        satAMeshRef.current.position.copy(posA);
        satAMeshRef.current.lookAt(posA.clone().multiplyScalar(1.2));
      }

      if (satBMeshRef.current) {
        satBMeshRef.current.position.copy(posB);
        satBMeshRef.current.lookAt(posB.clone().multiplyScalar(1.2));
      }

      // Update ISL Link Line
      if (beamLineRef.current) {
        const lineGeo = beamLineRef.current.geometry;
        const positions = new Float32Array([
          posA.x, posA.y, posA.z,
          posB.x, posB.y, posB.z
        ]);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        lineGeo.attributes.position.needsUpdate = true;
      }

      // Update Ground Station Downlink Beam
      if (downlinkLineRef.current) {
        const isPass = store.orbital.isGroundPassActive;
        const downMat = downlinkLineRef.current.material as THREE.LineBasicMaterial;
        downMat.opacity = isPass ? 0.9 : 0.0;
        if (isPass) {
          const downGeo = downlinkLineRef.current.geometry;
          const posGround = new THREE.Vector3(8.7, 4.9, 0);
          const positions = new Float32Array([
            posB.x, posB.y, posB.z,
            posGround.x, posGround.y, posGround.z
          ]);
          downGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          downGeo.attributes.position.needsUpdate = true;
        }
      }

      // Antenna Aura State (P2 Wi-Fi sleep cycling)
      if (antennaAuraRef.current) {
        const isAwake = store.orbital.satARadioAwake;
        const auraMat = antennaAuraRef.current.material as THREE.MeshBasicMaterial;
        if (fdirLayer === 'L1_ALARM' || fdirLayer === 'L0_SAFE_TRIP') {
          auraMat.color.setHex(0xef4444); // Crimson alarm pulse
          auraMat.opacity = 0.6 + Math.sin(Date.now() * 0.01) * 0.3;
        } else if (isAwake) {
          auraMat.color.setHex(0xf59e0b); // Amber active Wi-Fi
          auraMat.opacity = 0.35;
        } else {
          auraMat.opacity = 0.04; // Dormant / esp_wifi_stop sleep
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
  }, []);

  return (
    <div className="relative w-full h-full bg-space-950 overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* 3D Space HUD Overlay */}
      <div className="absolute top-3 left-4 flex items-center space-x-3 pointer-events-none">
        <div className="px-2.5 py-1 bg-space-900/80 backdrop-blur border border-slate-700/60 rounded-md text-xs font-mono flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-space-accent animate-ping" />
          <span className="text-slate-300">10x LEO Orbit:</span>
          <span className="text-space-accent font-bold">{(orbital.orbitTimeSec).toFixed(1)}s / 576.0s</span>
        </div>

        <div className={`px-2.5 py-1 rounded-md text-xs font-mono border backdrop-blur flex items-center space-x-2 ${
          orbital.isGroundPassActive
            ? 'bg-space-success/20 border-space-success text-space-success font-bold animate-pulse'
            : 'bg-space-900/80 border-slate-700/60 text-slate-400'
        }`}>
          <span>LoS Ground Pass:</span>
          <span>{orbital.isGroundPassActive ? `ACTIVE (${orbital.passCountdownSec}s)` : `IN ${orbital.passCountdownSec}s`}</span>
        </div>
      </div>

      {/* Sat Telemetry & ISL Store-and-Forward Queue Badge */}
      <div className="absolute top-3 right-4 flex items-center space-x-2 pointer-events-none text-xs font-mono">
        <div className="px-2.5 py-1 bg-space-900/80 backdrop-blur border border-slate-700/60 rounded-md text-slate-300 flex items-center space-x-2">
          <span>ISL Queue (Sat B):</span>
          <span className="text-space-accent font-bold">{orbital.islQueueDepthPackets} pkts</span>
        </div>

        <div className={`px-2.5 py-1 rounded-md border backdrop-blur flex items-center space-x-1.5 ${
          orbital.satARadioAwake
            ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
            : 'bg-slate-900/80 border-slate-700 text-slate-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${orbital.satARadioAwake ? 'bg-amber-400' : 'bg-slate-600'}`} />
          <span>{orbital.satARadioAwake ? 'Sat A Radio AWAKE' : 'esp_wifi_stop() SLEEP'}</span>
        </div>
      </div>

      {/* Viewport Control Tip */}
      <div className="absolute bottom-2 left-4 text-[10px] text-slate-500 font-mono pointer-events-none">
        Drag to Rotate Scene • Scroll to Zoom
      </div>
    </div>
  );
};
