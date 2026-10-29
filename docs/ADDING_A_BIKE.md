# 新增車款

只要新增一個資料檔並註冊，不需要修改任何邏輯程式碼。

## 1. 建立資料檔

複製 [src/data/bikes/sym-drg-158.ts](../src/data/bikes/sym-drg-158.ts) 為 `src/data/bikes/<品牌>-<車型>-<排氣量>.ts`，例如 `kymco-krv-180.ts`。

```ts
import type { BikeSpec } from '@/domain';

export const KYMCO_KRV_180: BikeSpec = {
  id: 'kymco-krv-180',           // kebab-case，全域唯一
  brand: 'KYMCO',
  model: 'KRV 180',
  engine: { ... },
  cvt: { ... },
  chassis: { ... },
  referencePerformance: { ... }, // 選填，有的話會自動加入校準測試
};
```

## 2. 填寫數值

| 欄位                              | 說明                                                                   | 通常來源                       |
| --------------------------------- | ---------------------------------------------------------------------- | ------------------------------ |
| `engine.peakPower` / `peakTorque` | 最大馬力、扭力與轉速                                                   | 官網規格表                     |
| `engine.torqueCurve`              | 全油門扭力曲線，**至少 15 點**，從 ≤1500 rpm 到 ≥ 斷油轉速，轉速需遞增 | 馬力機實測；沒有的話依峰值推估 |
| `engine.revLimitRpm`              | 斷油轉速                                                               | 實測或推估                     |
| `cvt.rollers`                     | 普利珠顆數、原廠克數、尺寸                                             | 零件目錄、車友資料             |
| `cvt.variator`                    | 低速比 > 高速比                                                        | 推估                           |
| `cvt.stockShiftRpm`               | 全油門起步，轉速停住、開始換檔時的轉速                                 | 實車轉速表                     |
| `cvt.stockShiftEndRpm`            | 換到最高速比時的轉速（> stockShiftRpm），決定換檔中轉速爬升多少        | 實車轉速表                     |
| `cvt.clutch`                      | 接合轉速 < 完全接合轉速                                                | 推估或實測                     |
| `chassis.curbMassKg` / `rearTire` | 整備重量、後輪規格                                                     | 官網                           |
| `chassis.dragAreaM2`              | 風阻係數 × 迎風面積（含騎士）                                          | 速克達約 0.5–0.65              |

**扭力曲線要和峰值一致**：測試會檢查曲線算出的最大扭力是否等於 `peakTorque`，最大馬力是否在 `peakPower` 的 ±2% 以內，而且出現在同一個轉速。小技巧：`峰值馬力轉速的扭力 = 峰值功率(W) ÷ (rpm × 2π / 60)`。

## 3. 標註資料來源（必填）

每個區塊（`engine`、`cvt`、`chassis`、`referencePerformance`）都要有 `provenance`：

```ts
provenance: {
  verified: false,            // 只有 official / measured 且整區都可查證時才能 true
  kind: 'official',           // official | measured | community | estimated
  sources: ['https://...'],   // 非 estimated 時至少一個
  note: '峰值為官網數據；曲線形狀為估計',
},
```

Schema 會擋下以下錯誤：`estimated` 或 `community` 標成 `verified: true`，以及非 `estimated` 卻沒有附來源。只要 `verified` 為 false，畫面上就會顯示「估計值」。

## 打檔車

打檔車用 `kind: 'manual'` 加上 `gearbox`，取代速克達的 `cvt`：

```ts
gearbox: {
  primaryRatio: 2.219,                                  // 一次減速
  gearRatios: [2.929, 2.056, 1.619, 1.333, 1.154, 1.037], // 1 檔 → 6 檔，必須遞減
  finalDriveRatio: 41 / 14,                             // 大齒 / 小齒
  launchRpm: 6500,                                      // 馬力機自動騎士的起步轉速
  provenance: { ... },
},
```

範例：[src/data/bikes/manual/kawasaki-ninja-400.ts](../src/data/bikes/manual/kawasaki-ninja-400.ts)。

## 牌照

`licenseClass` 必須與排氣量一致（schema 會檢查）：白牌 < 250 cc、黃牌 250–550 cc、紅牌 > 550 cc。

## 只有峰值、沒有馬力機曲線？

用 `synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction })` 從官方峰值產生曲線。它保證兩個峰值完全吻合，中間形狀為推估，provenance 請註明。`lowEndFraction` 越低代表引擎越「尖」（跑車約 0.55，大扭力三缸 / 四缸約 0.7）。

## 4. 註冊

速克達放 `src/data/bikes/scooters/`、打檔車放 `src/data/bikes/manual/`，然後在 [src/data/bikes/index.ts](../src/data/bikes/index.ts) 的 `RAW_BIKES` 加入（順序即選單順序）：

```ts
import { KYMCO_KRV_180 } from './kymco-krv-180';
const RAW_BIKES = [SYM_JET_SL_125, SYM_DRG_158, SYM_MMBCU_158, KYMCO_KRV_180];
```

## 5. 驗證

```bash
npm test -- src/data
```

`bikes.test.ts` 會自動對新車款跑以下檢查：Zod 驗證、峰值一致性、極速與 0–100 m 是否落在合理範圍，以及（有參考成績時）±10% 校準。測試沒過時，最常要調的是 `cvt.stockShiftRpm`、`cvt.finalDriveRatio`、`chassis.dragAreaM2`。

## 新增零件

零件放在 [src/data/parts/](../src/data/parts/)，以「相對原廠」描述（例如 `stiffnessFactor: 1.1` 表示 +10%），所以同一個零件可以套用到所有車款。如果只適用特定車款，把 `compatibleBikeIds` 改成車款 id 陣列即可。
