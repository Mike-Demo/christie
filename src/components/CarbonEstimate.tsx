import { useEffect, useState } from "react";

function totalTransferBytes(): number {
  const entries = [
    ...performance.getEntriesByType("navigation"),
    ...performance.getEntriesByType("resource"),
  ] as PerformanceResourceTiming[];
  return entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
}

export function CarbonEstimate() {
  const [grams, setGrams] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { co2 } = await import("@tgwf/co2");
          const bytes = totalTransferBytes();
          if (bytes <= 0) return;
          const estimate = new co2({ model: "swd", version: 4 }).perByte(bytes, false);
          const value = typeof estimate === "number" ? estimate : Number.NaN;
          if (!cancelled && Number.isFinite(value) && value > 0) setGrams(value);
        } catch {
          // Render nothing on failure.
        }
      })();
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (grams === null) return null;
  return (
    <p className="app-carbon">
      This visit ≈ {grams.toFixed(2)} g CO₂e · estimated with CO2.js (The Green Web Foundation)
    </p>
  );
}
