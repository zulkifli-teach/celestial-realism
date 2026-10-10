import { useEffect, useRef } from "react";
import solarUI from "./solar-ui.html?raw";

export function SolarLab() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    import("@/lib/solar-simulator.js").then(({ mountSolarSimulator }) => {
      if (disposed || !container.current) return;
      cleanup = mountSolarSimulator();
    });
    return () => { disposed = true; cleanup?.(); };
  }, []);
  return <div ref={container} className="solar-lab" dangerouslySetInnerHTML={{ __html: solarUI }} />;
}