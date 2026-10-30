// src/App.tsx
// FedSpace-Mini v2-School Ground Station & Digital Twin
// Full-Screen Cinematic SpaceX Mission Control Cockpit with Dropdown Drawers

import React, { useEffect, useState } from 'react';
import { useStationStore, stationStore } from './store/useStationStore';
import { MockSpacePhysicsAdapter } from './adapters/MockSpacePhysicsAdapter';
import { WebSerialCobsAdapter } from './adapters/WebSerialCobsAdapter';
import { SpaceConstellationCanvas, CameraPreset } from './components/space3d/SpaceConstellationCanvas';
import { ReactionWheelCutaway } from './components/space3d/ReactionWheelCutaway';
import { TopNavBar, ActiveDrawer } from './components/v2/TopNavBar';
import { SubsystemsDrawer } from './components/v2/SubsystemsDrawer';
import { FdirDrawer } from './components/v2/FdirDrawer';
import { EgseDrawer } from './components/v2/EgseDrawer';
import { EnergyDrawer } from './components/v2/EnergyDrawer';
import { WaveformsDrawer } from './components/v2/WaveformsDrawer';
import { BottomTelemetryStrip } from './components/v2/BottomTelemetryStrip';
import { HypothesesEvidenceModal } from './components/v2/HypothesesEvidenceModal';
import { HardwareConnectModal } from './components/v2/HardwareConnectModal';
import { Check, AlertTriangle, Eye, EyeOff, Maximize2, Minimize2, X } from 'lucide-react';

export const App: React.FC = () => {
  const store = useStationStore();
  const { hk, fdirLayer, activeFault } = store;

  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('HERO_CHASE');
  const [isPipVisible, setIsPipVisible] = useState<boolean>(true);
  const [isPipExpanded, setIsPipExpanded] = useState<boolean>(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState<boolean>(false);

  // Initialize Default Simulator on Mount ("Simulate Now")
  useEffect(() => {
    const mock = new MockSpacePhysicsAdapter();
    mock.connect().then(() => {
      mock.onHousekeeping((hk) => stationStore.updateHk(hk));
      mock.onFdirEvent((evt) => stationStore.updateFdir(evt));
      mock.onStageProfile((stg) => stationStore.updateStage(stg));
      mock.onOrbitalTick((orb) => stationStore.updateOrbital(orb));
      stationStore.setAdapter(mock, true);
      stationStore.setConnectionMode('MOCK_SIMULATOR');
    });

    const handleSwitch = async (e: any) => {
      const mode = e.detail;
      if (store.adapter) {
        store.adapter.disconnect();
      }

      if (mode === 'WEBSERIAL_COBS') {
        try {
          const serial = new WebSerialCobsAdapter();
          await serial.connect();
          serial.onHousekeeping((hk) => stationStore.updateHk(hk));
          serial.onFdirEvent((evt) => stationStore.updateFdir(evt));
          serial.onStageProfile((stg) => stationStore.updateStage(stg));
          serial.onOrbitalTick((orb) => stationStore.updateOrbital(orb));
          stationStore.setAdapter(serial, true);
          stationStore.setConnectionMode('WEBSERIAL_COBS');
        } catch (err: any) {
          alert(`WebSerial connection error: ${err.message}`);
          const fallback = new MockSpacePhysicsAdapter();
          await fallback.connect();
          fallback.onHousekeeping((hk) => stationStore.updateHk(hk));
          fallback.onFdirEvent((evt) => stationStore.updateFdir(evt));
          fallback.onStageProfile((stg) => stationStore.updateStage(stg));
          fallback.onOrbitalTick((orb) => stationStore.updateOrbital(orb));
          stationStore.setAdapter(fallback, true);
          stationStore.setConnectionMode('MOCK_SIMULATOR');
        }
      } else {
        const fallback = new MockSpacePhysicsAdapter();
        await fallback.connect();
        fallback.onHousekeeping((hk) => stationStore.updateHk(hk));
        fallback.onFdirEvent((evt) => stationStore.updateFdir(evt));
        fallback.onStageProfile((stg) => stationStore.updateStage(stg));
        fallback.onOrbitalTick((orb) => stationStore.updateOrbital(orb));
        stationStore.setAdapter(fallback, true);
        stationStore.setConnectionMode('MOCK_SIMULATOR');
      }
    };

    window.addEventListener('switch-adapter', handleSwitch);

    // Keyboard shortcut: ESC closes open dropdown drawer
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDrawer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      mock.disconnect();
      window.removeEventListener('switch-adapter', handleSwitch);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isAlarm = fdirLayer !== 'NOMINAL';

  return (
    <div className="relative w-screen h-screen bg-black text-white font-mono overflow-hidden select-none">
      {/* 1. FULL-SCREEN 3D SIMULATION BACKDROP (Edge to Edge) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <SpaceConstellationCanvas
          cameraPreset={cameraPreset}
          onCameraPresetChange={setCameraPreset}
        />
      </div>

      {/* 2. TOP MISSION CONTROL NAVIGATION BAR */}
      <TopNavBar
        activeDrawer={activeDrawer}
        onToggleDrawer={setActiveDrawer}
        onOpenHypothesesModal={() => setIsEvidenceModalOpen(true)}
        onOpenHardwareModal={() => setIsHardwareModalOpen(true)}
        cameraPreset={cameraPreset}
        onCameraPresetChange={setCameraPreset}
      />

      {/* 3. DROPDOWN FEATURE DRAWERS (Slide down directly from header upon clicking) */}
      {activeDrawer && (
        <div className="fixed top-14 left-0 right-0 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          {activeDrawer === 'subsystems' && (
            <SubsystemsDrawer onClose={() => setActiveDrawer(null)} />
          )}
          {activeDrawer === 'fdir' && (
            <FdirDrawer
              onClose={() => setActiveDrawer(null)}
              onOpenHypothesesModal={() => {
                setActiveDrawer(null);
                setIsEvidenceModalOpen(true);
              }}
            />
          )}
          {activeDrawer === 'egse' && (
            <EgseDrawer onClose={() => setActiveDrawer(null)} />
          )}
          {activeDrawer === 'energy' && (
            <EnergyDrawer
              onClose={() => setActiveDrawer(null)}
              onOpenHypothesesModal={() => {
                setActiveDrawer(null);
                setIsEvidenceModalOpen(true);
              }}
            />
          )}
          {activeDrawer === 'waveforms' && (
            <WaveformsDrawer onClose={() => setActiveDrawer(null)} />
          )}
        </div>
      )}

      {/* 4. FLOATING SUBTLE SATELLITE STATUS TAG (Top-Center) */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className={`px-3 py-1 bg-black/75 backdrop-blur-md border text-[11px] font-mono tracking-widest uppercase flex items-center space-x-2 shadow-2xl ${
          isAlarm
            ? 'border-red-500 text-red-300'
            : 'border-white/20 text-white'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isAlarm ? 'bg-red-400 animate-ping' : 'bg-white'}`} />
          <span className="font-bold">SAT A (DUT CUBESAT)</span>
          <span className="text-zinc-600">|</span>
          <span>{isAlarm ? `ANOMALY: ${activeFault}` : 'FLIGHT ENVELOPE: NOMINAL'}</span>
        </div>
      </div>

      {/* 5. FLOATING REACTION WHEEL DIGITAL TWIN (Bottom-Right Aerospace PiP) */}
      {isPipVisible && (
        <div className={`fixed bottom-14 right-5 z-20 bg-black/90 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col font-mono transition-all duration-200 ${
          isPipExpanded ? 'w-96 h-72' : 'w-72 h-48'
        }`}>
          {/* PiP Header */}
          <div className="px-3 py-1.5 bg-zinc-950/90 border-b border-white/10 flex items-center justify-between text-[10px] tracking-widest text-zinc-300">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="font-bold text-white uppercase">CAM 02 // RW-01 CUTAWAY</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setIsPipExpanded(!isPipExpanded)}
                className="text-zinc-400 hover:text-white p-0.5"
                title={isPipExpanded ? 'Collapse' : 'Expand'}
              >
                {isPipExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setIsPipVisible(false)}
                className="text-zinc-400 hover:text-white p-0.5"
                title="Hide Digital Twin"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 3D Wheel Canvas */}
          <div className="flex-1 relative">
            <ReactionWheelCutaway />
          </div>
        </div>
      )}

      {/* 6. SPACEX BOTTOM TELEMETRY STRIP */}
      <BottomTelemetryStrip
        onTogglePip={() => setIsPipVisible(!isPipVisible)}
        isPipVisible={isPipVisible}
        onOpenWaveforms={() => setActiveDrawer('waveforms')}
        onOpenFdir={() => setActiveDrawer('fdir')}
      />

      {/* 7. MODALS */}
      <HypothesesEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
      />

      <HardwareConnectModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
      />
    </div>
  );
};

export default App;
