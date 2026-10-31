# CLAUDE.md

機車動力模擬器（React 18 + Vite + TypeScript strict + Three.js）。四種模式：模擬器（馬力機）、直線加速賽、賽道繞圈、街景模式（真實高雄楠梓地圖）。使用者文件、文案、commit 內容都用**繁體中文**；程式碼識別字和註解用英文。

## 常用指令

```bash
npm run dev            # http://localhost:5173
npm run typecheck      # 三份 tsconfig：app、domain（無 DOM）、node/e2e
npm run lint           # --max-warnings 0，含分層 import 規則
npm run format:check   # CI 會檢查；改完跑 npx prettier --write <檔案>
npm test               # Vitest
npm run test:coverage  # src/domain 覆蓋率門檻 80%
npm run test:e2e       # Playwright，桌機 + Pixel 7，會自己 build + preview 在 4173
```

交付前至少跑：`npm run lint && npm run format:check && npm run typecheck && npm test`。這就是 CI 的 `check` job。動到 UI 版面、街景或 3D 時，再跑 `npm run test:e2e`（整套約 10–15 分鐘）。

## 分層（ESLint 強制，違反會 lint 失敗）

```
ui → application → domain
           ↘ data ↗
```

- `src/domain/`：純 TS 物理。不能用 React、DOM、`window`、Zustand、Zod、`setInterval`（`tsconfig.domain.json` 沒有 DOM lib，用了會編譯失敗）。要可重現：隨機數由外部注入 seed。
- `src/data/`：車款、零件、賽道、城市資料與 Zod schema。
- `src/application/`：Zustand stores、各模式的 Controller、輸入來源（鍵盤／觸控）、view model。
- `src/ui/`：React 元件與 Three.js 場景。對 `domain` 只能 `import type`，不能 import `data`。
- 全域規則：禁止 `any`、`@ts-ignore`、`setInterval`；**單檔上限 300 行**，超過就拆檔。

詳細見 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)、[docs/PHYSICS.md](docs/PHYSICS.md)、[docs/ADDING_A_BIKE.md](docs/ADDING_A_BIKE.md)。

## 重要慣例

- **固定步長物理**：所有模式都用 `model.timestepS`（1/240 s）的固定步長；`advance*()` 用 accumulator 吃掉幀時間，單次上限 `MAX_STEPS_PER_ADVANCE`。結果不能依賴幀率。
- **狀態不可變**：domain 的 step 函式回傳新物件，不改舊的。沒變化時回傳同一個參考（`withRider` 這類 helper 依賴這點）。
- **3D 場景不走 React**：`*Scene.tsx` 自己跑 `requestAnimationFrame`，每幀從 store 的 `getState()` 讀 view，交給命令式的 `*Renderer`。不要把每幀資料放進 React state。
- **輸入**：held 按鍵是 `InputCommand`（= domain 的 `StreetCommand`，含油門、煞車、離合、左右、倒車）；一次性動作是 `InputAction`。鍵位在 `KeyboardInputSource.ts` 的 `LAYOUTS`（`standard`／`circuit`／`street`）。新增按鍵時，記得同步：`RELEASED`、`TouchInputSource`、`TouchControls`、頁面上的 `KeyHints`、README 的操作表。
- **車款資料**：每個規格區塊都有 `provenance`；沒查證的數值 UI 會標「估計值」。不要把估計值寫成已查證。
- **街景地圖**：`src/data/cities/nanzih/nanzih.json` 由 `scripts/osm/` 從 OpenStreetMap 產生，不要手改；資料 © OpenStreetMap 貢獻者（ODbL），README 的標示要保留。

## 測試

- 單元測試放在原始碼旁（`*.test.ts(x)`）。domain 的測試用 `src/test/fixtures/`（測試車、小型測試城市），不要在單元測試載入真的楠梓地圖。
- jsdom 沒有 WebGL，跑測試時出現 `THREE.WebGLRenderer: Error creating WebGL context` 是正常的，元件有 fallback。
- e2e 在 CI 是**軟體 WebGL**（SwiftShader），3D 頁面很慢。`StreetRenderer` 偵測到軟體渲染會降解析度、關陰影；大地圖打開時也不畫 3D。新的 3D 功能要注意不要讓 CI 的 e2e 逾時。
- 手機版不能有水平捲動（e2e 會檢查 Pixel 7 寬度）。長文字的 `<select>`、按鈕列要能縮。

## Git

- Conventional Commits（`feat:`、`fix:`、`docs:`…），commitlint 會擋；pre-commit 跑 lint-staged（eslint --fix + prettier）。
- 遠端：`github.com/a1135526-lab/myMotoSimulator`，push 到 `main` 會跑 CI（`check` → `e2e`）。
