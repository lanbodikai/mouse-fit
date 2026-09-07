"use client";

import { Suspense } from "react";
import CaseLayer from "../layers/CaseLayer";
import KeycapLayer from "../layers/KeycapLayer";
import PCBLayer from "../layers/PCBLayer";
import PlateLayer from "../layers/PlateLayer";
import SwitchLayer from "../layers/SwitchLayer";
import Wooting60HEAssembly from "./Wooting60HEAssembly";
import WootingPrintedCase from "./WootingPrintedCase";
import GateronGT60Case from "./GateronGT60Case";
import { useKeyboardVisualizer } from "../store/KeyboardVisualizerStore";

export default function KeyboardAssembly() {
  const { selectedCasePresetId } = useKeyboardVisualizer();
  const isGateronCase = selectedCasePresetId === "gateron-gt60";

  return (
    <group rotation={[0, -0.08, 0]}>
      {!isGateronCase ? (
        <Suspense fallback={<CaseLayer />}>
          <WootingPrintedCase />
        </Suspense>
      ) : (
        <Suspense fallback={<CaseLayer />}>
          <GateronGT60Case />
        </Suspense>
      )}
      <group position={[0, isGateronCase ? 0.1 : 0, 0]}>
        <Wooting60HEAssembly
          includeCase={false}
          fallback={
            <>
              <PCBLayer />
              <PlateLayer />
            </>
          }
        />
        <SwitchLayer />
        <KeycapLayer />
      </group>
    </group>
  );
}
