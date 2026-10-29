# 角色

你是一位資深前端架構師，同時具備車輛動力學與 CVT（無段變速）傳動系統的工程知識。請以「商業級產品」的標準，從零建立一個可維護、可擴充、可測試的專案，而非 demo 或單檔原型。

---

# 專案目標

建立一個 **速克達動力模擬器（Scooter Dyno Simulator）** Web App，結合三種儀表：

1. **馬力機（Dyno）**：即時繪製 馬力（PS）與扭力（kgf·m / N·m）對轉速曲線
2. **轉速表（Tachometer）**：類比指針 + 數字，含紅線區
3. **時速表（Speedometer）**：類比指針 + 數字，含 0–100 km/h、0–400m 計時

使用者可用 **鍵盤方向鍵** 操控模擬加速，選擇不同車款，並調整所有影響轉速／馬力／加速的改裝零件，**預設值一律為原廠設定**。

---

# 技術棧（必須遵守）

- **語言**：TypeScript（`strict: true`，禁止 `any`）
- **框架**：React 18 + Vite
- **狀態管理**：Zustand（UI 狀態與模擬狀態分開 store）
- **圖表**：儀表使用 SVG 或 Canvas 自繪；Dyno 曲線使用 Recharts 或 uPlot
- **樣式**：CSS Modules 或 Tailwind（擇一，全專案一致）
- **驗證**：Zod 驗證所有車款與零件設定檔
- **測試**：Vitest（單元）+ React Testing Library（元件）+ Playwright（E2E）
- **品質**：ESLint + Prettier + Husky + lint-staged + commitlint（Conventional Commits）
- **CI**：GitHub Actions（lint → typecheck → test → build）
- **未來擴充**：架構需能用 Capacitor 包成手機 App，不得依賴僅限桌面的 API

---

# 架構原則（核心要求：程式碼分離）

採用 **分層架構 + 依賴反轉**，依賴方向只能由外往內：

```
UI (React) ──► Application (hooks/stores) ──► Domain (物理引擎) ◄── Data (車款/零件設定)
```

- **Domain 層必須是純 TypeScript**，不得 import React、DOM、Zustand 或任何 UI 套件，可單獨在 Node 執行與測試。
- **物理計算、資料、UI、輸入控制** 四者完全分離。
- 車款與零件資料 **全部以設定檔（JSON/TS 常數）定義**，新增車款不需修改任何邏輯程式碼。
- 所有物理常數與單位使用具名常數，禁止魔術數字；單位換算集中在 `units.ts`。
- 使用 ESLint `import/no-restricted-paths`（或 eslint-plugin-boundaries）強制層與層之間的依賴規則。

---

# 目錄結構（請依此建立）

```
src/
├─ domain/                    # 純邏輯，零 UI 依賴
│  ├─ engine/
│  │  ├─ torqueCurve.ts       # 扭力曲線插值（轉速 → 扭力）
│  │  ├─ ecu.ts               # 斷油轉速、點火/噴油修正係數
│  │  └─ engine.ts
│  ├─ transmission/
│  │  ├─ variator.ts          # 普利盤：普利珠離心力 vs 大彈簧 → 變速比
│  │  ├─ clutch.ts            # 離合器：離合器彈簧 vs 離合器片離心力 → 接合轉速、打滑
│  │  ├─ clutchBell.ts        # 碗公：直徑、重量、轉動慣量
│  │  └─ finalDrive.ts        # 齒輪比
│  ├─ vehicle/
│  │  ├─ dynamics.ts          # F = ma、空氣阻力、滾動阻力、坡度
│  │  └─ tire.ts              # 輪胎周長 → 車速換算
│  ├─ simulation/
│  │  ├─ simulator.ts         # 固定時間步長（fixed timestep, 如 1/240s）主迴圈
│  │  └─ types.ts             # SimState、SimInput、SimConfig
│  ├─ dyno/
│  │  └─ dynoRun.ts           # 全油門掃轉速，產出 HP/扭力曲線資料
│  └─ units.ts
│
├─ data/                      # 純資料，無邏輯
│  ├─ schemas/                # Zod schema（BikeSpec、PartSpec）
│  ├─ bikes/
│  │  ├─ sym-jet-sl-125.ts
│  │  ├─ sym-drg-158.ts
│  │  ├─ sym-mmbcu-158.ts
│  │  └─ index.ts             # 車款註冊表
│  └─ parts/
│     ├─ rollers.ts           # 普利珠重量選項
│     ├─ clutchBells.ts       # 碗公選項
│     ├─ springs.ts           # 大彈簧 / 離合器彈簧
│     ├─ ecuMaps.ts           # ECU 程式選項
│     └─ index.ts
│
├─ application/               # 銜接層
│  ├─ stores/
│  │  ├─ configStore.ts       # 目前車款 + 改裝設定
│  │  └─ simStore.ts          # 即時模擬狀態
│  ├─ hooks/
│  │  ├─ useSimulationLoop.ts # requestAnimationFrame 驅動 domain simulator
│  │  └─ useKeyboardControls.ts
│  └─ services/
│     └─ presetService.ts     # 改裝組合儲存/讀取（localStorage，介面抽象化）
│
├─ ui/
│  ├─ components/
│  │  ├─ gauges/              # Tachometer、Speedometer（純展示元件，props 驅動）
│  │  ├─ dyno/                # DynoChart（可疊加多組曲線比較）
│  │  ├─ config/              # BikeSelector、PartsPanel
│  │  └─ common/
│  ├─ layouts/
│  └─ pages/
│     └─ SimulatorPage.tsx
│
├─ app/                       # App 進入點、Provider、路由
└─ tests/ 或與原始碼同層的 *.test.ts
```

---

# 功能需求

## 1. 車款選擇
預設內建（可擴充）：
- SYM JET SL 125
- SYM DRG 158
- SYM MMBCU 158
- 保留擴充：Yamaha BWS / Force 2.0、Kymco KRV / Racing S 等

每台車的設定檔需包含（Zod schema 定義）：
- 排氣量、壓縮比、原廠最大馬力與轉速、最大扭力與轉速
- 扭力曲線資料點（至少 15 點，1500 rpm ~ 斷油轉速）
- 斷油轉速、怠速轉速
- 原廠 CVT 參數：普利珠規格與重量（如 6 顆 × 某 g）、大彈簧強度、離合器彈簧強度、離合器接合轉速、碗公直徑
- 變速比範圍（最低速比、最高速比）、齒輪比
- 輪胎規格（如 120/70-12）
- 車重（含油）、預設騎士體重
- 空氣阻力係數 × 迎風面積、滾動阻力係數
- **`source` 與 `verified: boolean` 欄位**：數值若無法確認官方來源，請標記 `verified: false` 並在 UI 顯示「估計值」，**不要編造看似精確的數據**

## 2. 可調整的改裝零件（預設＝原廠）
| 零件 | 影響 |
|---|---|
| 普利珠重量（g，可逐顆設定或整組） | 越輕 → 換檔轉速越高、起步越猛、極速可能下降 |
| 普利盤（原廠 / 改裝角度） | 變速比範圍 |
| 大彈簧（開閉盤彈簧）強度 | 換檔轉速、後段拉轉 |
| 離合器彈簧強度 | 離合器接合轉速 |
| 碗公（直徑、重量） | 接合特性、轉動慣量 |
| ECU（原廠 / 一階 / 二階 / 自訂） | 扭力曲線修正比例、斷油轉速 |
| 齒輪比 | 加速 vs 極速 |
| 車重 + 騎士體重 | 加速度 |
| 進排氣（空濾、排氣管） | 扭力曲線修正（選配，進階） |

- 每個零件需有「重設為原廠」按鈕，以及「全部重設」
- 改裝組合可命名儲存、載入、比較

## 3. 操控
- `↑`：油門（按住漸增至全開，放開漸回；需模擬油門開度 0–100%，非瞬間 0/1）
- `↓`：煞車
- `R`：重置車速歸零
- `Space`：開始 / 停止 0–100 km/h、0–400 m 計時
- 手機版：提供觸控油門／煞車按鈕（共用同一套 input adapter）
- 輸入層以 `InputSource` 介面抽象化，鍵盤與觸控為不同實作

## 4. 儀表與顯示
- 轉速表、時速表：平滑動畫（指針做 lerp，不可跳動）
- 即時數據：轉速、時速、油門開度、目前變速比、離合器狀態（分離/半接合/接合）、目前馬力
- Dyno 模式：按「跑一次 Dyno」產生全油門曲線；可疊加「原廠 vs 目前改裝」比較
- 成績面板：0–60、0–100 km/h、0–400 m 秒數、極速

---

# 物理模型要求

請在 `domain/` 中實作，並在註解中寫明公式與假設：

1. **引擎**：扭力 = 曲線插值(rpm) × 油門開度 × ECU 修正；超過斷油轉速則扭力歸零
2. **普利盤（Variator）**：以普利珠離心力（∝ 質量 × ω² × 半徑）對抗大彈簧力，求出變速比，限制在最低/最高速比之間
3. **離合器**：離合器片離心力 vs 離合器彈簧 → 決定接合轉速；半接合區需模擬打滑（引擎轉速與傳動端轉速不同步）
4. **整車動力學**：
   `F_drive − F_aero(½ρCdAv²) − F_roll(Crr·m·g) − F_brake = m_eff · a`
   其中 m_eff 需包含旋轉慣量（碗公、輪胎）
5. **迴圈**：固定時間步長積分（不受 FPS 影響），渲染與物理分離
6. **校準**：原廠設定下的模擬結果（極速、0–100 時間）需接近真實車款公開數據，誤差目標 ±10%，並寫成測試案例

---

# 測試要求

- `domain/` 單元測試覆蓋率 ≥ 80%
- 必測項目：
  - 扭力曲線插值邊界值
  - 普利珠變輕 → 換檔轉速上升（性質測試）
  - 離合器彈簧變硬 → 接合轉速上升
  - 車重增加 → 0–100 時間變長
  - 超過斷油轉速扭力為 0
  - 所有車款設定檔通過 Zod 驗證
- E2E：選車 → 改普利珠 → 按住 ↑ → 時速表數值上升

---

# 交付物

1. 完整專案程式碼（依上方目錄結構）
2. `README.md`：安裝、執行、測試、新增車款教學
3. `docs/ARCHITECTURE.md`：分層說明與依賴圖（Mermaid）
4. `docs/PHYSICS.md`：所有物理公式、假設、限制
5. `docs/ADDING_A_BIKE.md`：只需新增一個資料檔即可加入新車款的步驟
6. GitHub Actions CI 設定
7. `.env.example`（若有需要）

---

# 開發流程（請依序進行，每階段完成後停下來讓我確認）

1. **Phase 1**：建立專案骨架、工具鏈、目錄結構、Zod schema、型別定義
2. **Phase 2**：Domain 物理引擎 + 單元測試（不碰 UI）
3. **Phase 3**：車款與零件資料檔
4. **Phase 4**：Application 層（store、模擬迴圈、輸入控制）
5. **Phase 5**：UI（儀表、Dyno 圖、設定面板），RWD 支援手機
6. **Phase 6**：E2E 測試、文件、CI

每個階段結束時，請列出：完成項目、檔案清單、已知限制、下一步。

---

# 禁止事項

- 禁止把物理計算寫在 React 元件或 hook 內
- 禁止單一檔案超過 300 行（超過請拆分）
- 禁止使用 `any`、`// @ts-ignore`
- 禁止編造車款規格數據而不標註來源與 `verified` 狀態
- 禁止使用 `setInterval` 驅動物理模擬
