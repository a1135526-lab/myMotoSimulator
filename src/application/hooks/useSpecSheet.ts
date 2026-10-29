import { useMemo } from 'react';
import type { BikeSpec, Provenance } from '@/domain';
import { KIND_LABELS, LICENSE_LABELS } from './useCatalog';
import { useCurrentBike } from './useSimConfig';

export interface SpecRow {
  readonly label: string;
  readonly value: string;
}

export interface SpecSection {
  readonly title: string;
  readonly provenance: Provenance;
  readonly rows: readonly SpecRow[];
}

const fixed = (n: number, digits = 3) => Number(n.toFixed(digits)).toString();

function drivetrainSection(bike: BikeSpec): SpecSection {
  if (bike.kind === 'scooter') {
    const { cvt } = bike;
    return {
      title: '傳動（CVT）',
      provenance: cvt.provenance,
      rows: [
        {
          label: '普利珠',
          value: `${cvt.rollers.count} × ${cvt.rollers.massG} g（${cvt.rollers.diameterMm}×${cvt.rollers.widthMm}）`,
        },
        { label: '變速比', value: `${cvt.variator.lowRatio} → ${cvt.variator.highRatio}` },
        { label: '全油門換檔', value: `${cvt.stockShiftRpm} → ${cvt.stockShiftEndRpm} rpm` },
        { label: '離合器接合', value: `${cvt.clutch.engageRpm} rpm` },
        { label: '齒輪比', value: fixed(cvt.finalDriveRatio) },
      ],
    };
  }
  const { gearbox } = bike;
  return {
    title: `變速箱（${gearbox.gearRatios.length} 速）`,
    provenance: gearbox.provenance,
    rows: [
      { label: '一次減速', value: fixed(gearbox.primaryRatio) },
      ...gearbox.gearRatios.map((r, i) => ({ label: `${i + 1} 檔`, value: fixed(r) })),
      { label: '最終減速', value: fixed(gearbox.finalDriveRatio) },
    ],
  };
}

/** Stock spec sheet of the selected bike, grouped with each section's data source. */
export function useBikeSpecSheet(): { title: string; subtitle: string; sections: SpecSection[] } {
  const bike = useCurrentBike();
  return useMemo(() => {
    const { engine, chassis } = bike;
    const tire = chassis.rearTire;
    return {
      title: `${bike.brand} ${bike.model}`,
      subtitle: `${LICENSE_LABELS[bike.licenseClass]}${KIND_LABELS[bike.kind]}`,
      sections: [
        {
          title: '引擎',
          provenance: engine.provenance,
          rows: [
            { label: '排氣量', value: `${engine.displacementCc} cc・${engine.cylinders} 缸` },
            { label: '最大馬力', value: `${engine.peakPower.ps} ps / ${engine.peakPower.rpm} rpm` },
            {
              label: '最大扭力',
              value: `${engine.peakTorque.nm} N·m / ${engine.peakTorque.rpm} rpm`,
            },
            { label: '斷油轉速', value: `${engine.revLimitRpm} rpm` },
          ],
        },
        drivetrainSection(bike),
        {
          title: '車體',
          provenance: chassis.provenance,
          rows: [
            { label: '整備重量', value: `${chassis.curbMassKg} kg` },
            { label: '後輪', value: `${tire.widthMm}/${tire.aspectRatio}-${tire.rimDiameterInch}` },
          ],
        },
      ],
    };
  }, [bike]);
}
