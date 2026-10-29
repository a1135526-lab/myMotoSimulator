# 物理模型

內部一律使用 SI 單位（m、kg、s、N、N·m、W、rad/s），顯示時才換算成 rpm、km/h、ps、kgf·m（[units.ts](../src/domain/units.ts)）。

## 傳動路徑

```
速克達：曲軸 ──(皮帶 / 普利盤, ratio)──► 離合器片 ──(離心式離合器)──► 碗公 ──(齒輪比 fd)──► 後輪
打檔車：曲軸 ──(一次減速)──► 手動濕式離合器 ──(檔位齒比)──► ──(大小齒 fd)──► 後輪
```

兩者在求解器裡統一用「曲軸端」表示：`G` = 每 m/s 車速對應的引擎角速度，離合器容量也換算成曲軸扭力（[coupling.ts](../src/domain/simulation/coupling.ts)）。

## 1. 引擎（[engine.ts](../src/domain/engine/engine.ts)）

```
T = T_wot(rpm) · throttle · G_ecu(rpm) · G_intake(rpm)      （斷油時為 0）
  − T_friction(rpm) · (1 − throttle)                          （引擎煞車）
  + T_idle                                                    （怠速控制，≥ 0）

T_friction = 0.55 N·m / 1000 rpm
T_idle     = clamp(0.01 · (idle − rpm) + T_friction(idle), 0, 6)
```

- `T_wot`：車款資料的全油門扭力曲線，線性插值；範圍外取端點值。
- 斷油（[ecu.ts](../src/domain/engine/ecu.ts)）：rpm ≥ 斷油轉速時斷油，降到斷油轉速 − 200 rpm 才恢復（遲滯）。

## 2. 普利盤（[variator.ts](../src/domain/transmission/variator.ts)）

驅動盤上的力平衡：普利珠離心力 `F_r = Σm · ω² · r` 推向高速比，大彈簧 + 扭力凸輪推向低速比。普利盤開始移動時 `F_r = F_s`，所以：

```
holdRpm_full = stockShiftRpm · √( k_spring · Σm_stock / Σm )
holdRpm(θ)   = holdRpm_full · √( 1 − 0.45 · (1 − θ) )         θ = 油門
```

- 普利珠變輕、大彈簧變硬 → 換檔轉速提高。
- 扭力凸輪的力和傳遞扭力成正比，所以半油門時會較早換檔（佔比 0.45）。
- 普利珠沿斜面往外爬時，大彈簧會被壓得更緊，所以換檔過程中轉速會持續上升。上升幅度由每台車的資料決定：`shiftRise = stockShiftEndRpm / stockShiftRpm − 1`，兩個數字都能直接從實車轉速表讀到。
- 普利盤位置 `x ∈ [0, 1]`：平衡位置為 `(rpm / holdRpm − 1) / shiftRise`。改普利珠或大彈簧時，整段換檔轉速會等比例平移，上升幅度維持不變。
- 位置以一階延遲追蹤平衡點（τ = 0.12 s）。
- 速比 `ratio = low · (high / low)^x`（幾何插值）。

## 3. 離合器（[clutch.ts](../src/domain/transmission/clutch.ts)）

```
C(ω) = C_lock · (ω² − ω_e²) / (ω_l² − ω_e²)     C ≥ 0，ω 為離合器片轉速
```

- 市售離合器彈簧以「靜止時的引擎接合轉速」標示，因此 `ω_e = engageRpm / lowRatio`。
- `C_lock` 依「原廠引擎在原廠完全接合轉速時的全油門扭力 × lowRatio × 1.05」決定。所以 ECU 加扭力時，打滑轉速會跟著變高。
- 碗公直徑：容量 × (d / d_stock)。
- 碗公慣量（[clutchBell.ts](../src/domain/transmission/clutchBell.ts)）：`I = 0.8 · m · r²`。

## 4. 整車（[dynamics.ts](../src/domain/vehicle/dynamics.ts)）

```
F_drive − ½ρC_dA·v² − C_rr·m·g·cosθ − m·g·sinθ − F_brake = m_eff · a

m_eff = m + I_wheels / r² + I_bell · fd² / r²   （離合器接合時再加 I_engine · (ratio·fd)² / r²）
F_brake = brake · 8 m/s² · m
```

- 滾阻與煞車只會阻止運動，靜止時不會讓車倒退（沒有倒車）。
- **抓地力上限**：驅動力最多 1.0 G × m·g（後輪打滑 / 翹孤輪的極限）。超過時視為騎士或循跡系統收油：接合狀態下推力被截在上限；打滑狀態下引擎輸出與離合器傳遞扭力都以「抓地力換算到曲軸的扭力」為上限，所以大馬力車在高轉放離合不會拖到熄火，也不會一路空轉到斷油。
- 輪胎半徑（[tire.ts](../src/domain/vehicle/tire.ts)）：`r = (輪圈 / 2 + 胎寬 × 扁平比) × 0.97`（負載下的滾動半徑）。
- 傳動效率：皮帶 0.88 × 齒輪箱 0.97。

## 5. 雙自由度積分（[simulator.ts](../src/domain/simulation/simulator.ts)）

**打滑 / 分離時**，引擎端與車輪端分開積分（半隱式 Euler），全部以曲軸端表示：

```
I_e · dω_e/dt = T_engine − T_clutch
m_eff · dv/dt = T_clutch · G · η − F_resist
T_clutch      = C · sign(ω_e − v·G)
```

當曲軸端轉速差變號，或小於 3 rad/s 時，即進入接合。

**接合時**視為剛體，`ω_e = v · G`，用合併慣量求加速度。每一步都會檢查離合器需要傳遞的扭力 `T − I_e·G·a` 是否超過容量；超過就退回打滑狀態。

**熄火**：引擎轉速被拖到怠速的 50% 以下就熄火，之後沒有燃燒扭力，只剩摩擦。發動（[controls.ts](../src/domain/simulation/controls.ts)）只在空檔或拉著離合時有效，模擬實車的安全開關。

## 5b. 打檔車（手動離合 + 變速箱）

- 總減速比：`一次減速 × 檔位齒比 × 大小齒`；空檔時 G = 0，引擎與後輪完全分離。
- 離合器容量：`1.8 × 原廠峰值扭力 × 接合度(拉桿)`。拉桿 0–15% 為自由行程、85–100% 完全分離，中間用 smoothstep 讓「咬合點」漸進。
- 鍵盤離合：按下立即分離，放開時 0.6 s 漸進接合（等於自動半離合）。按下是立即的，因為玩家常同時按 Shift 與 →，拉桿還在行程中就入檔會直接熄火。
- 換檔：N ↔ 1 ↔ 2 … 依序（實車 N 在 1、2 檔之間，鍵盤上線性比較好操作）。離合器未拉時換檔，視為無離合換檔：離合器進入打滑，引擎轉速透過摩擦被拉到新檔位，而不是瞬間跳過去。

## 6. 時間步長（[fixedStep.ts](../src/domain/simulation/fixedStep.ts)）

- 物理以固定 1/240 s 步長前進，用累加器吸收畫面幀時間的誤差，因此不受 FPS 影響。
- 每次呼叫最多 240 步，避免切回分頁時一次補算太多而卡住。
- 油門開度 0 → 100% 需 0.35 s，100 → 0% 需 0.2 s（[inputShaping.ts](../src/domain/simulation/inputShaping.ts)）。

## 7. 馬力機（[dynoRun.ts](../src/domain/dyno/dynoRun.ts)）

- **引擎曲線**：2000 rpm 到斷油轉速，每 50 rpm 計算一次穩態全油門扭力 / 馬力（含 ECU、進排氣修正）。50 rpm 是為了讓 5,250、7,250 rpm 這類公開峰值剛好落在取樣點上。
- **後輪 vs 車速**：從靜止全油門跑到極速，經過完整傳動系統，每 1 km/h 取一個樣本。加速度連續 1.5 秒小於 0.03 m/s² 時，視為到達極速。這也是台灣速克達馬力機常見的圖表格式。
- **自動騎士**（[autoRider.ts](../src/domain/dyno/autoRider.ts)）：打檔車由程式騎乘。拉離合催到 launchRpm，0.8 s 放離合，之後在「下一檔後輪推力 ≥ 目前檔」時升檔（或接近斷油時）。
- 換檔瞬間飛輪慣性會在幾毫秒內灌進後輪，報表上的後輪馬力以「引擎馬力 × 傳動效率」為上限，相當於實機馬力機的平均化。

## 校準

| 車款         | 參考                                              | 模擬                     | 誤差     |
| ------------ | ------------------------------------------------- | ------------------------ | -------- |
| JET SL 125   | 0–100 m ≈ 8.0 s（車友實測，TVBS 整理）            | 8.60 s                   | +7.5%    |
| JET SL 125   | 車主轉速表：換檔約 7,400 起、極速 8,750–9,000 rpm | 7,400 起、極速 8,843 rpm | 符合     |
| DRGBT 158    | DRGBT R 版官方 0–100 m 7.7 s（馬力較大的版本）    | 8.11 s                   | 一致方向 |
| MT-09 / Z900 | 媒體實測 0–100 km/h 約 3.2–3.5 s                  | 3.22 / 3.23 s            | 符合     |
| Ninja 400    | 媒體實測 0–100 km/h 約 4.8 s                      | 4.99 s                   | +4%      |

`src/data/bikes/bikes.test.ts` 會檢查：凡有 `referencePerformance` 的車款，模擬結果都必須在 ±10% 以內；JET SL 另有回歸測試，鎖定車主觀察到的轉速行為。DRG 與 MMBCU 的換檔爬升幅度比照 JET SL 推估。

## 已知限制

- 換檔過程中，轉速對普利盤位置採線性近似，無法反映斜面角度變化的細節；改裝普利盤目前只改變速比範圍，不改變換檔爬升幅度。
- 皮帶效率為常數，沒有隨負載與溫度變化。
- 輪胎打滑與翹孤輪只用「1.0 G 推力上限」近似，沒有模擬輪胎滑移率與前輪離地；也沒有氣溫與海拔（空氣密度固定為海平面）。
- 新增車款的扭力曲線由 [synthesizeTorqueCurve.ts](../src/data/bikes/synthesizeTorqueCurve.ts) 依官方峰值推估形狀，峰值準確，但曲線形狀不是實測。
- 打檔車的風阻面積、斷油轉速為估計，極速會受影響；齒比來源見各車資料檔的 provenance。
- 引擎煞車方向的效率與驅動方向相同。
- CVT 內部原廠參數未公開，皆為估計值。只要有實測轉速 / 車速資料，就能大幅提高準度。
