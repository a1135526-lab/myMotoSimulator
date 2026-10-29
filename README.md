# Scooter Dyno Simulator

機車動力模擬器：結合 **馬力機、轉速表、時速表**，用鍵盤模擬加速。分成 **速克達（CVT）** 和 **打檔車（手動離合 + 換檔）** 兩類，可調整普利珠、普利盤、大彈簧、離合器彈簧、碗公、ECU、齒輪比 / 齒盤比、進排氣、車重。所有設定預設為原廠。

## 內建車款

| 牌照 | 速克達                                                                                      | 打檔車                            |
| ---- | ------------------------------------------------------------------------------------------- | --------------------------------- |
| 白牌 | SYM JET SL 125、DRGBT 158、MMBCU 158、Yamaha 勁戰七代 125、Force 2.0 155、Kymco KRV 180 TCS | Yamaha YZF-R15 V4、MT-15 V2       |
| 黃牌 | Yamaha XMAX 300                                                                             | Kawasaki Ninja 400、Yamaha YZF-R3 |
| 紅牌 | Yamaha TMAX 560                                                                             | Yamaha MT-09、Kawasaki Z900       |

## 快速開始

需要 Node.js 20 以上。

```bash
npm install
npm run dev          # http://localhost:5173
```

## 操作

| 按鍵      | 功能                                                |
| --------- | --------------------------------------------------- |
| `↑` / `W` | 油門（按住漸開，約 0.35 秒全開）                    |
| `↓` / `S` | 煞車                                                |
| `R`       | 重置回靜止                                          |
| `Space`   | 開始 / 停止 0–60、0–100 km/h、0–100 m、0–400 m 計時 |

打檔車另外：

| 按鍵          | 功能                                                      |
| ------------- | --------------------------------------------------------- |
| `Shift` / `C` | 離合器（按住＝拉離合；放開後約 0.6 秒漸進接合，可半離合） |
| `→` / `E`     | 升檔（N → 1 → 2 … → 6）                                   |
| `←` / `Q`     | 降檔                                                      |
| `Enter`       | 發動（需在空檔，或拉著離合）                              |

起步：按住 `Shift` → `→` 入 1 檔 → 按住 `↑` 催油 → 放開 `Shift`。在怠速直接放離合、或低轉速硬拖都會熄火。

手機上使用畫面下方的按鈕（打檔車多出「離合 / 降檔 / 升檔 / 發動」）。

## 指令

| 指令                    | 說明                                           |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | 開發伺服器                                     |
| `npm run build`         | 型別檢查 + 正式建置到 `dist/`                  |
| `npm run typecheck`     | 三份 tsconfig：App、Domain（無 DOM）、Node/E2E |
| `npm run lint`          | ESLint，含層級依賴規則                         |
| `npm test`              | Vitest 單元 + 元件測試                         |
| `npm run test:coverage` | 覆蓋率（`src/domain` 門檻 80%）                |
| `npm run test:e2e`      | Playwright（桌機 + 手機）                      |
| `npm run format`        | Prettier                                       |

首次跑 E2E 前需執行 `npx playwright install chromium`。

## 專案結構

```
src/
├─ domain/        純 TypeScript 物理引擎（引擎、CVT、整車動力學、模擬迴圈、馬力機）
├─ data/          車款與零件資料 + Zod schema
├─ application/   Zustand stores、模擬控制器、輸入來源、view model hooks
├─ ui/            React 元件（儀表、馬力機圖、設定面板）
└─ app/           進入點
e2e/              Playwright 測試
docs/             架構、物理、新增車款文件
```

- 架構說明：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 物理模型：[docs/PHYSICS.md](docs/PHYSICS.md)
- 新增車款：[docs/ADDING_A_BIKE.md](docs/ADDING_A_BIKE.md)

## 資料可信度

每個規格區塊都有 `provenance`（來源類型、是否查證、來源連結）。未查證的數值在畫面上會標示 **「估計值」**。目前三台車的馬力、扭力、車重、輪胎來自三陽官網；CVT 內部參數（變速比、換檔轉速、離合器）原廠未公開，為工程估計。有實測資料時，請更新資料檔並附上來源。

## Commit 規範

使用 [Conventional Commits](https://www.conventionalcommits.org/)（`feat:`、`fix:`、`docs:`…），由 commitlint 檢查；pre-commit 會跑 lint-staged。
