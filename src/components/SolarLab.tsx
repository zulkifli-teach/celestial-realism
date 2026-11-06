import { useEffect, useRef, useState } from "react";
import solarUI from "./solar-ui.html?raw";
import { replaceIconText } from '@/lib/solar-icons';
import { Assessment } from "./Assessment";

const solarMarkup = replaceIconText(solarUI);

export function SolarLab() {
  const container = useRef<HTMLDivElement>(null);
  const [quiz, setQuiz] = useState(false);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    import("@/lib/solar-simulator.js").then(({ mountSolarSimulator }) => {
      if (disposed || !container.current) return;
      cleanup = mountSolarSimulator();
    });
    const btn = document.getElementById("btn-assessment");
    const open = () => setQuiz(true);
    btn?.addEventListener("click", open);
    return () => { disposed = true; cleanup?.(); btn?.removeEventListener("click", open); };
  }, []);
  return (
    <>
      <div ref={container} className="solar-lab" dangerouslySetInnerHTML={{ __html: solarMarkup }} />
      {quiz && <div className="fixed inset-0 z-50"><Assessment onClose={() => setQuiz(false)} /></div>}
    </>
  );
}
