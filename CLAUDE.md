# CLAUDE.md

遊戲名稱「揍灰來尬掐」：機車動力模擬器（React 18 + Vite + TypeScript strict + Three.js）。四種模式：模擬器（馬力機）、直線加速賽、賽道繞圈、街景模式（真實高雄楠梓地圖）。使用者文件、文案、commit 內容都用**繁體中文**；程式碼識別字和註解用英文。

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
- **StrictMode**：開發模式（`npm run dev`）會把 Provider 掛載 → 卸載 → 再掛載，卸載時 `controller.dispose()` 會拔掉所有輸入來源。輸入來源（鍵盤、觸控按鈕）一定要在 effect 裡接上（`useInputSources`），只在 constructor 接的話，開發模式下會失效。e2e 跑的是正式建置版，抓不到這類問題。
- **手機橫向全螢幕**：3D 頁面用 `useImmersive()`（`(pointer: coarse) and (orientation: landscape) and (max-height: 540px)`），成立時 `AppLayout immersive` 不畫標題列，外層加上 `data-immersive`；各 CSS module 用 `[data-immersive] .xxx` 改成全螢幕和覆蓋式按鈕（`TouchControls overlay`）。HUD 要避開左右下角的拇指區。
- **傾斜轉向**：`TiltInputSource` 送出類比的 `steerAxis`（−1～1），domain 用 `steerTarget()` 合併，按鈕優先。手機上預設開啟（`useDefaultTilt`，關掉會存 `scooter-dyno:tilt`）；iOS 要從點擊呼叫 `requestTiltPermission()`，所以是第一次點畫面時才開，而且只在 https 有效。
- **自訂按鈕／甩動換檔**：全螢幕按鈕由 `OverlayControls` 依 `controlLayoutStore` 擺放（位置是安全區域的 0–1 比例，存在 localStorage；沒存的用 `defaultAnchor` 的預設）。`FlickShiftSource` 從 `screenPitchDeg` 偵測快速前後甩動，送出 `shiftUp`／`shiftDown`。
- **起步**：格位與起步判定在 `domain/circuit/circuitStart.ts`（`gridSpot`：`staggered`／`parallel`；`gridSlots`：好友房間玩家用自己在房間裡的順序當格位，`CircuitController.startRoomRace(holdS, slot, field)`）。燈滅後 `START_GRACE_S`（4 秒）內不做車與車碰撞（`contactsOn`），電腦車維持格位的橫向位置。
- **碰撞不重置**：所有模式都沒有「摔車→倒數→放回去」。賽道撞護欄是 `bounceOffBarrier`（反彈＋掉速），車與車是 `domain/circuit/contacts.ts` 的 `resolveContacts`（好友對戰的對手經 `CircuitController.setRemoteBikes` 當成不會動的物體）；街景撞牆停下＋小反彈、撞車是 `street/impacts.ts` 的 `bumpCar`。明顯的碰撞只記 `hitAtS`（HUD 顯示「碰撞！」、圈不乾淨、任務碰撞次數）。只有按 R 才會重置。
- **後照鏡**：HUD 放 `RearMirrorSlot`（`data-mirror-slot` 的空框，只在按住時出現：`uiStore.mirrorHeld`，鍵盤 B 由 `useMirrorKey()`、按鈕是 `MirrorButton`），renderer 每幀用 `mirrorSlot()` 找到它的位置，`RearMirror` 把往後看的畫面畫進去（左右反轉）。軟體 WebGL（CI）不畫。
- **喇叭**：`hornStore`（`held`、`preset`、自訂錄音 `clip` 是 data URL，存 `scooter-dyno:horn`／`scooter-dyno:horn-clip`）。按住 H（`useHornKey()`，和後照鏡同在 `input/heldKeys.ts`）或 `HornButton`；`ui/audio/useHorn.ts` 播放（`hornSounds.ts` 即時合成，引擎聲關閉時也會響）。錄音是 `ui/audio/hornRecorder.ts`（MediaRecorder，最長 3 秒，只在 https 有效），設定在大廳的 `HornSettingsDialog`。房間裡經 `online/room/roomHorns.ts` 互傳（`horn`／`hornClip` 訊息，走 `roomTransport` 的 `tapRoomMessages`／`sendToRoom`，不經 `roomStore`），對手的喇叭在 `useRemoteHornStore`，音量依距離（`hornDistanceM`／`hornGain`，120 m 外聽不到），`useHorn` 每幀更新。
- **車輛外觀**：`liveryStore`（車身／安全帽／車手服，`scooter-dyno:livery`，`parseLivery` 只收 `#rrggbb`）。進房間時放進 `RoomPlayer.livery`（presence），`withRemoteRiders` 帶到 `CircuitRiderView.livery`，自己的由 `withLivery` 加上；電腦車用 `RIDER_COLORS`。`createBikeModel` 接受單色或 livery；其他車手頭上有 `nameTag.ts` 的名牌。
- **騎乘評分**：`domain/circuit/rideTally.ts` 在 `stepCircuitRace` 裡逐步累計玩家的數據（只算燈滅到自己過線），`rideGrades.ts` 換算成各項 0–100 分和 S～E；`CircuitView.grades` 在過線後才有值，`RideGradeCard` 顯示，綜合評分存在 `MatchRecord.grade`。過彎速度是每個彎（`findCorners`）的最低速跟職業 AI 的速度曲線比。
- **草地**：`lateral.ts` 的 `runoffBog()`，時速超過 `RUNOFF_TOP_SPEED_MPS` 會快速減速，截彎一定比較慢；`LapRecorder` 一圈離開柏油超過 `TRACK_LIMIT_S` 就標為不乾淨。
- **賽道**：`src/data/circuits/` 的測試要求每個彎半徑 ≥ 40 m、超過 120° 的彎 ≥ 50 m，不同路段不能太靠近。有上下坡的賽道（`hillCircuits.ts`）多一個 `elevation`（`[一圈比例, 高度]` 關鍵點，`domain/circuit/elevation.ts`），坡度上限 14%；物理用取樣點的 `grade`，3D 用 `scene/terrain.ts` 的 `TrackHeights`（車、鏡頭、幽靈車的高度與俯仰）和起伏地形。改了既有賽道的形狀，要把它加進 `recordsStore` 的 `RELAID`（並把 `LAYOUT` 加一），舊的本機圈速和幽靈車才會被清掉。
- **紀錄**：`recordsStore` 把圈速榜、任務成績存在 localStorage（`scooter-dyno:records`），幽靈車每條賽道一筆、分開存（`scooter-dyno:ghost:<id>`）。讀取時一律驗證格式，壞資料丟掉。沒有後端，全球排行榜需要另外接資料庫。
- **幽靈車**：`LapRecorder` 每 0.1 秒記錄玩家姿態，一圈完成交給 `CircuitController`；有明顯碰撞（`hitAtS` 變了）或按 R 的圈標為不乾淨，不進榜也不當幽靈。`ghostPoseAt` 補間播放。
- **街景任務**：定義在 `src/data/cities/missions.ts`（用地標的確切名稱），`streetMissions(map)` 對應到地圖並算好路線；規則在 `domain/street/missions.ts`。
- **登入**：`LoginDialog`（`authStore.signIn()` 只是打開它）可選 Google 或遊戲帳號（`online/passwordAuth.ts`，帳號名稱存成 `<帳號>@players.zouhui.game`，Supabase 必須關閉 Confirm email）。
- **全球排行榜**：Supabase，結構和所有規則在 `supabase/schema.sql`（資料表全鎖，只開放 RPC），前端在 `src/application/online/`。新增賽道／直線賽道／任務時，`schema.sql` 的規則表也要加（見 `docs/SUPABASE_SETUP.md`）。登入是選擇性的：不登入照常玩、只記本機紀錄；登入後沒有暱稱會自動問一次。測試一律離線：Vitest 不載入 `.env.*`，Playwright 用 `VITE_ONLINE=off`。絕不放 secret / service_role key。
- **好友對戰**：`src/application/online/room/`。Supabase Realtime 的 broadcast（訊息）＋ presence（誰在房間），頻道 `room:<5 碼房號>`，不碰資料庫。房主 = 最早加入的人；開始時房主送出同一個 `holdS`，各自用 `CircuitController.startRoomRace()` 起跑。別人的位置用 `RemoteRiders` 延遲 150 ms 補間，`withRemoteRiders()` 合進 `CircuitView` 重新排名次。收到的訊息一律經 `parseMessage()` 檢查。比賽結束：`CircuitResults` 先顯示 `FinishSplash`（VICTORY／名次），再進結算；房間的「再來一場」是 `again` 訊息（`wantAgain()`，房主看到人數後開賽），對手清單 `RoomOpponents` 可用 `get_player_card`（`supabase/005_player_card.sql`）查看段位、加好友。測試用 `FakeHub` 模擬多人。
- **大廳／對戰紀錄**：`uiStore.mode` 預設 `home`（大廳），`profile` 是個人資訊頁。比賽結束時 `stats/matchRecorder.ts` 寫一筆 `MatchRecord` 到 `matchStore`（localStorage `scooter-dyno:matches`，登入後經 `supabase/002_matches.sql` 的 RPC 同步）；數據由 `matchStats()` 純函式算出。好友對戰的強制結束：第一名完賽時間 + `ROOM_FINISH_WINDOW_S`（15 s），由 `CircuitController.setOutOfTime` 判定。e2e 和 App 測試從大廳出發：用 `home-simulator`／`home-drag`／`home-circuit`／`home-street` 進入模式，`go-home` 回大廳。
- **排位賽**：規則（段位、加減分、電腦強度 `rankedAiSkill`、兩組固定原廠車、`RANKED_CIRCUITS`）在 `domain/ranked/ranking.ts`；配對在 `application/online/ranked/`：presence 頻道 `mm:<group>`，等最久的人當 leader，用 `formMatch()` 組隊後廣播房號，再走好友房間的 `roomStore`（`settings.ranked`）。20 秒沒配到 → 對電腦（`phase: 'ai'`）。賽道設定由 `useCircuitConfig` 決定（排位一律關轉向／煞車輔助）。積分只由 `supabase/004_ranked.sql` 的 `report_ranked` 在伺服器算；改加減分表要兩邊一起改。
- **好友**：`supabase/003_friends.sql` 的 RPC（一對玩家一筆 `friendships`，pending → accepted）＋ `src/application/online/friends/friendsStore.ts`。線上狀態用 Realtime presence 頻道 `online-players`，房間邀請送到對方的 `inbox:<user id>` 頻道（只收好友的）。房間玩家帶 `accountName` 才能在房裡加好友。
- **導覽／美術／音樂**：模式只在大廳選，其他頁面只有 `HomeButton`（← 大廳）。背景圖在 `public/art/`，由 `scripts/art/capture-art.mjs` 從遊戲截圖（需要先 build + preview）；大廳音樂是 `ui/audio/lobbyMusic.ts` 即時合成，用 `<LobbyMusicPlayer />` 放進要播放的頁面。
- **PWA**：`vite-plugin-pwa`，service worker 只存在於正式 build（`npm run dev` 沒有），e2e 用 `serviceWorkers: 'block'`。改了 `public/icon.svg` 要跑 `node scripts/icons/render-icons.mjs`。
- **車款資料**：每個規格區塊都有 `provenance`；沒查證的數值 UI 會標「估計值」。不要把估計值寫成已查證。
- **儀表**：每台車的 `cluster.layout` 選一種原廠樣式（`ui/components/dashboard/`，新樣式要加到 `ClusterLayout`、schema 和 `BikeDashboard` 的 `LAYOUTS`）。**每種樣式都必須顯示檔位**，用 `gearText()`（速克達顯示 D）。
- **街景地圖**：`src/data/cities/nanzih/nanzih.json` 由 `scripts/osm/` 從 OpenStreetMap 產生，不要手改；資料 © OpenStreetMap 貢獻者（ODbL），README 的標示要保留。範圍是整個楠梓區（行政區界＋150 m），只畫 OSM 上的真實建築（不要再加自動生成的房子）。
- **高架道路**：`RoadEdge.heights`（每個點的高度，null = 平面），騎士和車都有 `y`。`citySurfaceAt(map, x, z, y)`／`deckHeightAt` 只認高度差 `LEVEL_TOLERANCE_M` 內的路，所以橋上和橋下互不干擾；在高處離開橋面算撞到護欄。3D 在 `ui/street/scene/deckMeshes.ts`；不能騎的國道／鐵路高架是 `map.overpasses`。橋面的碰撞寬度＝畫出來的寬度（`DECK_SHOULDER_M`），高於 `PARAPET_FROM_M` 才有護欄；側面擦到牆是「擦牆滑行」，正面撞是停下＋小反彈。路樹、路燈、號誌用 `overheadAt()` 避開高架下方。

## 測試

- 單元測試放在原始碼旁（`*.test.ts(x)`）。domain 的測試用 `src/test/fixtures/`（測試車、小型測試城市），不要在單元測試載入真的楠梓地圖。
- jsdom 沒有 WebGL，跑測試時出現 `THREE.WebGLRenderer: Error creating WebGL context` 是正常的，元件有 fallback。
- e2e 在 CI 是**軟體 WebGL**（SwiftShader），3D 頁面很慢。`StreetRenderer` 偵測到軟體渲染會降解析度、關陰影；大地圖打開時也不畫 3D。新的 3D 功能要注意不要讓 CI 的 e2e 逾時。
- 手機版不能有水平捲動（e2e 會檢查 Pixel 7 寬度）。長文字的 `<select>`、按鈕列要能縮。

## Git

- Conventional Commits（`feat:`、`fix:`、`docs:`…），commitlint 會擋；pre-commit 跑 lint-staged（eslint --fix + prettier）。
- 遠端：`github.com/a1135526-lab/myMotoSimulator`，push 到 `main` 會跑 CI（`check` → `e2e` → `deploy`）。
- **push 到 `main` = 上線**：`check` 和 `e2e` 都通過後，`deploy` 會把遊戲發佈到 <https://a1135526-lab.github.io/myMotoSimulator/>。正式網址在子路徑下，build 時用 `BASE_PATH=/myMotoSimulator/`；程式裡不要寫死以 `/` 開頭的資源路徑。
