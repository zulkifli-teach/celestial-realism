import { memo, useCallback, useEffect, useRef, useState } from "react";
import solarUI from "./solar-ui.html?raw";
import { replaceIconText } from '@/lib/solar-icons';
import { Assessment } from "./Assessment";

const solarMarkup = replaceIconText(solarUI);

// React must not replace the simulator-owned DOM when the assessment changes.
const SimulatorScene = memo(function SimulatorScene({ onAssessment }: { onAssessment: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    import("@/lib/solar-simulator.js").then(({ mountSolarSimulator }) => {
      if (disposed || !container.current) return;
      cleanup = mountSolarSimulator();
    });
    const btn = document.getElementById("btn-assessment");
    btn?.addEventListener("click", onAssessment);
    return () => { disposed = true; cleanup?.(); btn?.removeEventListener("click", onAssessment); };
  }, [onAssessment]);
  return <div ref={container} className="solar-lab" dangerouslySetInnerHTML={{ __html: solarMarkup }} />;
});

export function SolarLab() {
  const [quiz, setQuiz] = useState(false);
  const openAssessment = useCallback(() => setQuiz(true), []);
  return (
    <>
      <SimulatorScene onAssessment={openAssessment} />
      {quiz && <div className="fixed inset-0 z-50"><Assessment onClose={() => setQuiz(false)} /></div>}
    </>
  );
}
