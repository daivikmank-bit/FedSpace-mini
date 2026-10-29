// src/App.tsx
// FedSpace-Mini v2-School Ground Station & Digital Twin
// UI Architecture inspired by the Vidyut Drishti / Simulation Lab layout

import React, { useEffect, useState } from 'react';
import { useStationStore, stationStore } from './store/useStationStore';
import { MockSpacePhysicsAdapter } from './adapters/MockSpacePhysicsAdapter';
import { WebSerialCobsAdapter } from './adapters/WebSerialCobsAdapter';
import { TopNavBar } from './components/v2/TopNavBar';
import { LeftTreeSidebar } from './components/v2/LeftTreeSidebar';
import { Center3DView } from './components/v2/Center3DView';
import { RightInvestigationPanel } from './components/v2/RightInvestigationPanel';
import { HypothesesEvidenceModal } from './components/v2/HypothesesEvidenceModal';

export const App: React.FC = () => {
  const store = useStationStore();

  const [activeUnit, setActiveUnit] = useState<string>('wheel-assembly');
  const [showPlots, setShowPlots] = useState<boolean>(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);

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
          // Fallback to mock
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

    return () => {
      mock.disconnect();
      window.removeEventListener('switch-adapter', handleSwitch);
    };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#070c18] text-slate-100 font-sans overflow-hidden select-none">
      {/* 1. Top Navigation Bar */}
      <TopNavBar
        showPlots={showPlots}
        onTogglePlots={() => setShowPlots(!showPlots)}
        onOpenHypothesesModal={() => setIsEvidenceModalOpen(true)}
      />

      {/* 2. Main Three-Column Cockpit Layout */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Column: Subsystems Tree & Energy Balance */}
        <LeftTreeSidebar
          activeUnit={activeUnit}
          onSelectUnit={(unit) => setActiveUnit(unit)}
        />

        {/* Center Hero Viewport: 3D Scene + Floating Banners & Callout Pins */}
        <Center3DView
          showPlots={showPlots}
          onTogglePlots={() => setShowPlots(!showPlots)}
        />

        {/* Right Column: Investigation & Diagnostics Panel */}
        <RightInvestigationPanel
          onOpenHypothesesModal={() => setIsEvidenceModalOpen(true)}
        />
      </main>

      {/* Evidence & Provenance Modal */}
      <HypothesesEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
      />
    </div>
  );
};

export default App;
