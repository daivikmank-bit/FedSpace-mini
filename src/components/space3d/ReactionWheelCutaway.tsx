// src/components/space3d/ReactionWheelCutaway.tsx
// Interactive 3D Reaction Wheel Digital Twin with Real Physics Revolutions & 1x Phasors

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStationStore } from '../../store/useStationStore';
import { globalRingBuffers } from '../../store/ringBuffers';

export const ReactionWheelCutaway: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const store = useStationStore();

  const wheelGroupRef = useRef<THREE.Group | null>(null);
  const motorMeshRef = useRef<THREE.Mesh | null>(null);
  const clipsGroupRef = useRef<THREE.Group | null>(null);
  const wiperArmRef = useRef<THREE.Group | null>(null);
  const z0ArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const z1xArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const irLedRef = useRef<THREE.Mesh | null>(null);
  const harnessWireRef = useRef<THREE.Mesh | null>(null);

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
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 3.4, 8.2);
    camera.lookAt(0, 0, 0);

    // Studio Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(6, 8, 7);
    scene.add(dirLight);

    // Spring Base Plate (Simulating school-level foam tape mount)
    const baseGeo = new THREE.BoxGeometry(4.6, 0.2, 4.6);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 });
    const basePlate = new THREE.Mesh(baseGeo, baseMat);
    basePlate.position.set(0, -1.8, 0);
    scene.add(basePlate);

    // Motor Root Group (Oscillates radially under F1 Imbalance)
    const motorRoot = new THREE.Group();
    scene.add(motorRoot);

    // TT Gearmotor Yellow Body (₹45 component with realistic injection-molded finish)
    const motorGeo = new THREE.BoxGeometry(1.4, 2.2, 1.0);
    const motorMat = new THREE.MeshStandardMaterial({
      color: 0xeab308, // Yellow casing
      roughness: 0.28,
      metalness: 0.15
    });
    const motorBody = new THREE.Mesh(motorGeo, motorMat);
    motorBody.position.set(0, -0.4, 0);
    motorRoot.add(motorBody);
    motorMeshRef.current = motorBody;

    // Motor Output Shaft (White plastic TT shaft)
    const shaftGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.2 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0.2, 0.6);
    motorRoot.add(shaft);

    // Spinning Wheel & Disc Assembly Group
    const wheelAssembly = new THREE.Group();
    wheelAssembly.position.set(0, 0.2, 1.0);
    motorRoot.add(wheelAssembly);
    wheelGroupRef.current = wheelAssembly;

    // 65mm Wheel Rim & Rubber Tire (Realistic matte synthetic rubber)
    const tireGeo = new THREE.TorusGeometry(1.9, 0.36, 16, 48);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Black rubber tire
      roughness: 0.92,
      metalness: 0.05
    });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    wheelAssembly.add(tire);

    // Wheel Yellow Spokes Hub
    const hubGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.22, 16);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    wheelAssembly.add(hub);

    // 20-Slot Optical Disc (₹25 Plastic Encoder Disc with realistic slot cutouts)
    const discGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.04, 32);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.2,
      wireframe: true
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, 0, -0.4);
    wheelAssembly.add(disc);

    // LM393 Optical Interrupter U-Slot Sensor
    const lm393Geo = new THREE.BoxGeometry(0.5, 0.8, 0.6);
    const lm393Mat = new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.4 });
    const lm393 = new THREE.Mesh(lm393Geo, lm393Mat);
    lm393.position.set(-1.18, 0.2, 0.6);
    motorRoot.add(lm393);

    // Flashing IR LED Indicator
    const ledGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const irLed = new THREE.Mesh(ledGeo, ledMat);
    irLed.position.set(-1.18, 0.65, 0.6);
    motorRoot.add(irLed);
    irLedRef.current = irLed;

    // F1: Metallic Snap-On Binder Clips Group
    const clipsGroup = new THREE.Group();
    wheelAssembly.add(clipsGroup);
    clipsGroupRef.current = clipsGroup;

    for (let i = 0; i < 3; i++) {
      const clipGeo = new THREE.BoxGeometry(0.32, 0.45, 0.25);
      const clipMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.95,
        roughness: 0.15
      });
      const clip = new THREE.Mesh(clipGeo, clipMat);
      const angle = i * 0.28;
      clip.position.set(Math.cos(angle) * 1.9, Math.sin(angle) * 1.9, 0);
      clip.rotation.z = angle;
      clip.visible = false;
      clipsGroup.add(clip);
    }

    // F2: SG90 Micro Servo & Wiper Arm
    const sg90Root = new THREE.Group();
    sg90Root.position.set(2.4, 0.2, 1.0);
    scene.add(sg90Root);

    const sg90BodyGeo = new THREE.BoxGeometry(0.6, 1.1, 0.5);
    const sg90BodyMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 }); // Blue plastic SG90
    const sg90Body = new THREE.Mesh(sg90BodyGeo, sg90BodyMat);
    sg90Root.add(sg90Body);

    const wiperArm = new THREE.Group();
    wiperArm.position.set(0, 0.5, 0);
    sg90Root.add(wiperArm);
    wiperArmRef.current = wiperArm;

    const armGeo = new THREE.BoxGeometry(1.2, 0.14, 0.14);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(-0.6, 0, 0);
    wiperArm.add(arm);

    // Friction Contact Pad on Wiper
    const padGeo = new THREE.BoxGeometry(0.2, 0.25, 0.2);
    const padMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(-1.15, 0, 0);
    wiperArm.add(pad);

    // F3: Virtual Harness Power Wires
    const wireGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8);
    const wireMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(-1.4, -0.6, -0.2);
    wire.rotation.z = Math.PI / 4;
    scene.add(wire);
    harnessWireRef.current = wire;

    // 3D Phasor Arrows:
    // Z0 Baseline (White)
    const z0Dir = new THREE.Vector3(0.35, 0.12, 0).normalize();
    const z0Arrow = new THREE.ArrowHelper(z0Dir, new THREE.Vector3(0, 0, 1.1), 1.2, 0xffffff, 0.22, 0.16);
    wheelAssembly.add(z0Arrow);
    z0ArrowRef.current = z0Arrow;

    // Z1x - Z0 Imbalance Vector (Neon Magenta)
    const z1xDir = new THREE.Vector3(0.01, 0.01, 0).normalize();
    const z1xArrow = new THREE.ArrowHelper(z1xDir, new THREE.Vector3(0, 0, 1.1), 0.1, 0xff007f, 0.22, 0.16);
    wheelAssembly.add(z1xArrow);
    z1xArrowRef.current = z1xArrow;

    // =========================================================================
    // ANIMATION LOOP: ACTUAL PHYSICAL REVOLUTIONS
    // =========================================================================
    let animId = 0;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = (now - lastTime) / 1000.0;
      lastTime = now;

      const rpm = store.hk.rpmKalman;
      // Actual Angular Velocity: ω = 2π * RPM / 60 rad/s
      const omega = (rpm * 2 * Math.PI) / 60.0;

      // Rotate Wheel at actual physical angular velocity
      if (wheelGroupRef.current) {
        wheelGroupRef.current.rotation.z += omega * dt;
      }

      // Flash LM393 Optical IR LED at pulse rate (f_slot = 20 * RPM / 60 Hz)
      if (irLedRef.current) {
        const pulseRate = (rpm * 20) / 60.0;
        const isOn = Math.sin(now * 0.001 * pulseRate * 2 * Math.PI) > 0;
        const ledMat = irLedRef.current.material as THREE.MeshBasicMaterial;
        ledMat.color.setHex(isOn ? 0x22c55e : 0x1e293b);
      }

      // Motor Base Radial Oscillation under F1 Imbalance
      const clips = store.clipsF1;
      if (clips > 0 && rpm > 30) {
        const vibAmp = clips * 0.02 * (rpm / 200.0);
        motorRoot.position.x = Math.sin(now * 0.02 * omega) * vibAmp;
        motorRoot.position.y = Math.cos(now * 0.02 * omega) * vibAmp;
      } else {
        motorRoot.position.set(0, 0, 0);
      }

      // Show / Hide F1 Binder Clips
      if (clipsGroupRef.current) {
        clipsGroupRef.current.children.forEach((c, idx) => {
          c.visible = idx < clips;
        });
      }

      // SG90 Servo Wiper Arm Rotation for F2
      if (wiperArmRef.current) {
        const friction = store.frictionF2;
        let targetAngle = 0.45; // Retracted
        if (friction === 'L1_10PCT') targetAngle = 0.15;
        if (friction === 'L2_25PCT') targetAngle = 0.05;
        if (friction === 'L3_50PCT') targetAngle = -0.05; // Pressing hard
        wiperArmRef.current.rotation.z = targetAngle;
      }

      // Motor Casing Thermal Shader Glow (25C blue -> 60C red)
      if (motorMeshRef.current) {
        const temp = store.hk.windingTempEstC;
        const tFrac = Math.max(0, Math.min(1, (temp - 25.0) / 35.0));
        const color = new THREE.Color().lerpColors(
          new THREE.Color(0xeab308), // Normal yellow
          new THREE.Color(0xef4444), // Critical thermal red
          tFrac
        );
        (motorMeshRef.current.material as THREE.MeshStandardMaterial).color = color;
      }

      // Virtual Harness Glow for F3
      if (harnessWireRef.current) {
        const ohms = store.harnessF3;
        const wireMat = harnessWireRef.current.material as THREE.MeshStandardMaterial;
        if (ohms > 0) {
          wireMat.color.setHex(0xf97316); // Glowing orange
          wireMat.emissive.setHex(0x9a3412);
        } else {
          wireMat.color.setHex(0x475569);
          wireMat.emissive.setHex(0x000000);
        }
      }

      // 3D Phasor Vector Scaling
      if (z1xArrowRef.current) {
        const [dx, dy] = globalRingBuffers.zImbalance;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0.01) {
          z1xArrowRef.current.visible = true;
          const dir = new THREE.Vector3(dx, dy, 0).normalize();
          z1xArrowRef.current.setDirection(dir);
          z1xArrowRef.current.setLength(Math.min(2.5, mag * 5.0), 0.25, 0.15);
        } else {
          z1xArrowRef.current.visible = false;
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
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#080f1e] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Phasor Legend */}
      <div className="absolute bottom-1.5 left-2.5 flex items-center space-x-2 pointer-events-none text-[9px] font-mono bg-[#080f1e]/85 backdrop-blur px-2 py-0.5 rounded border border-slate-800">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-0.5 bg-white inline-block" />
          <span className="text-slate-300">Z₀ Runout</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-0.5 bg-[#ff007f] inline-block" />
          <span className="text-[#ff007f]">Z₁ₓ Imbalance</span>
        </div>
      </div>

      {/* Active Fault Tags on Twin */}
      <div className="absolute top-1.5 right-2 flex flex-col items-end space-y-0.5 pointer-events-none text-[9px] font-mono">
        {store.clipsF1 > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
            F1: {store.clipsF1} Clips
          </span>
        )}
        {store.frictionF2 !== 'NONE' && (
          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
            F2: {store.frictionF2}
          </span>
        )}
        {store.harnessF3 > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            F3: {store.harnessF3}Ω
          </span>
        )}
      </div>
    </div>
  );
};
