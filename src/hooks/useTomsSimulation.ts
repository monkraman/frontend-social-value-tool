import { useState, useEffect, useCallback } from 'react';
import type { TOMsMetric, PackageCalculation } from '../types';
import { calculatePackageSimulation, fetchTomsMetrics } from '../api/client';

export interface TunerInitiative {
  name: string;
  toms_metric_code: string;
  annual_volume: number;
}

export function useTomsSimulation(initialContractValue = 10000000, initialYears = 3, initialWeighting = 10) {
  const [metrics, setMetrics] = useState<TOMsMetric[]>([]);
  const [contractValue, setContractValue] = useState<number>(initialContractValue);
  const [durationYears, setDurationYears] = useState<number>(initialYears);
  const [weightingPercent, setWeightingPercent] = useState<number>(initialWeighting);
  const [activeInitiatives, setActiveInitiatives] = useState<TunerInitiative[]>([
    { name: 'Digital Skills & Literacy Clinics', toms_metric_code: 'NT8', annual_volume: 8 },
    { name: 'Apprenticeships (16-24 yrs)', toms_metric_code: 'NT1', annual_volume: 52 },
    { name: 'Refurbished IT Hardware Donations', toms_metric_code: 'NT45', annual_volume: 60 },
    { name: 'Local SME & VCSE Supply Chain Spend', toms_metric_code: 'NT31', annual_volume: 180000 }
  ]);
  const [result, setResult] = useState<PackageCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetchTomsMetrics().then((m) => {
      if (active) setMetrics(m);
    });
    return () => {
      active = false;
    };
  }, []);

  const runCalculation = useCallback(async () => {
    setIsCalculating(true);
    try {
      const calc = await calculatePackageSimulation(
        'Interactive Custom Model',
        contractValue,
        durationYears,
        weightingPercent,
        activeInitiatives
      );
      setResult(calc);
    } finally {
      setIsCalculating(false);
    }
  }, [contractValue, durationYears, weightingPercent, activeInitiatives]);

  useEffect(() => {
    let active = true;
    calculatePackageSimulation(
      'Interactive Custom Model',
      contractValue,
      durationYears,
      weightingPercent,
      activeInitiatives
    ).then((calc) => {
      if (active) setResult(calc);
    });

    return () => {
      active = false;
    };
  }, [contractValue, durationYears, weightingPercent, activeInitiatives]);

  const updateVolume = useCallback((index: number, newVol: number) => {
    setActiveInitiatives((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], annual_volume: Math.max(0, newVol) };
      return updated;
    });
  }, []);

  const addInitiative = useCallback(
    (code: string) => {
      const m = metrics.find((metric) => metric.code === code);
      if (!m) return;
      setActiveInitiatives((prev) => [
        ...prev,
        {
          name: m.name,
          toms_metric_code: m.code,
          annual_volume: m.code === 'NT31' ? 50000 : 10
        }
      ]);
    },
    [metrics]
  );

  const removeInitiative = useCallback((index: number) => {
    setActiveInitiatives((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    metrics,
    contractValue,
    setContractValue,
    durationYears,
    setDurationYears,
    weightingPercent,
    setWeightingPercent,
    activeInitiatives,
    result,
    isCalculating,
    updateVolume,
    addInitiative,
    removeInitiative,
    runCalculation
  };
}
