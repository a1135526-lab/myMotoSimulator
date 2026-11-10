# 全球排行榜（Supabase）設定

遊戲本體是 GitHub Pages 上的靜態網站；全球排行榜和登入（Google、遊戲帳號）用 [Supabase](https://supabase.com)（免費方案）。

## 已經設定好的東西

| 項目          | 值 / 位置                                                                             |
| ------------- | ------------------------------------------------------------------------------------- |
| Supabase 專案 | `https://poxpgmvtlxlcpwnygphg.supabase.co`（Tokyo）                                   |
| 前端設定      | `.env.production`、`.env.development`（`VITE_SUPABASE_URL`、`VITE_SUPABASE_KEY`）     |
| 資料庫結構    | `supabase/schema.sql`                                                                 |
| 隱私權政策    | `public/privacy.html` → `https://a1135526-lab.github.io/myMotoSimulator/privacy.html` |

`VITE_SUPABASE_KEY` 是 **publishable（anon）key**，本來就公開在網頁裡；安全性由 `schema.sql` 的權限規則保護。

⛔ 永遠不要把這兩個放進專案或給別人：Supabase 的 **secret / service_role key**、Google 的 **Client Secret**。

## 遊戲帳號（帳號密碼登入）

玩家可以用帳號名稱或 e-mail 加密碼註冊。帳號名稱在 Supabase 裡存成 `<帳號>@players.zouhui.game`（這個網域收不到信），所以要在後台：

1. **Authentication** → **Sign In / Providers** → **Email**：確認 **Enable Email provider** 是開的。
2. 同一頁把 **Confirm email** 關掉，按 **Save**。開著的話，註冊後要點確認信才能登入，帳號名稱就永遠無法登入。
3. 密碼最短長度用預設的 6 個字即可（遊戲也檢查 6 個字）。

用帳號名稱註冊的玩家忘記密碼時無法自行重設；可以在 **Authentication** → **Users** 找到 `<帳號>@players.zouhui.game`，按 **Send password recovery** 沒有用，只能刪除帳號讓他重新註冊。

## 資料庫檔案（依序執行）

| 檔案                             | 內容                                 | 可以重複執行嗎                                |
| -------------------------------- | ------------------------------------ | --------------------------------------------- |
| `supabase/schema.sql`            | 排行榜、暱稱、規則表                 | ⚠️ 會**清空**排行榜，正式上線後不要整份重跑   |
| `supabase/002_matches.sql`       | 對戰紀錄（個人資訊頁的雲端同步）     | ✅ 只新增，不會動到排行榜                     |
| `supabase/003_friends.sql`       | 好友（邀請、接受、移除、看好友戰績） | ✅ 只新增                                     |
| `supabase/004_ranked.sql`        | 排位賽積分、排位排行榜               | ✅ 只新增（`add_matches` 會更新成接受排位賽） |
| `supabase/005_player_card.sql`   | 結算畫面「查看」對手：對方的排位段位 | ✅ 只新增                                     |
| `supabase/006_more_circuits.sql` | 十條新賽道的圈速規則                 | ✅ 只新增                                     |
| `supabase/007_hill_circuits.sql` | 四條上下坡賽道的圈速規則             | ✅ 只新增                                     |

`002_matches.sql`：每位玩家自己的比賽紀錄（`matches` 表），只能透過 `add_matches`（一次最多 100 場、每人上限 5000 場）和 `get_my_matches`（只回傳自己的）存取。

`004_ranked.sql`：`ranked` 表存每人每組的積分，`ranked_reports` 防止同一場回報兩次。只能透過 `report_ranked`（伺服器依名次算分、30 秒最多一場）、`get_my_ranked`、`get_ranked_board` 存取。配對本身走 Realtime presence 頻道 `mm:scooter`／`mm:manual`，不碰資料庫。新增排位賽道時，改 `src/domain/ranked/ranking.ts` 的 `RANKED_CIRCUITS` 即可；改加減分表要同時改 `ranking.ts` 和 SQL 的 `ranked_delta()`。

## 安全設計（schema.sql）

- 所有資料表都開了 RLS 而且**沒有任何 policy**，Data API 無法直接讀寫。
- 玩家只能呼叫這些函式：
  - 任何人：`get_lap_board`、`get_drag_board`、`get_mission_board`、`get_lap_ghost`（只回傳暱稱，不回傳帳號 id、信箱）。
  - 已登入（Google）：`get_my_profile`、`set_nickname`、`submit_lap`、`submit_drag`、`submit_mission`。
- 上傳檢查：
  - 圈速／ET／任務時間不能快過物理極限（規則表 `circuits`、`drag_tracks`、`missions`）。
  - 幽靈車路線：每 0.2 秒一筆、時間遞增、兩點間不超過 400 km/h、結尾等於圈速。
  - 任務星等由伺服器計算。
  - 每位玩家每 2 秒最多上傳一次；每個榜只保留個人最佳。
  - 暱稱 2～16 字、不可重複（不分大小寫）、過濾不雅字詞（`blocked_words`）。

## 修改規則或新增賽道／任務

1. 改 `supabase/schema.sql`：新賽道要加進 `circuits`（長度和最低圈速）、新直線賽道加進 `drag_tracks`、新任務加進 `missions`（路線長度和限時要跟遊戲裡算出的一樣）。
2. Supabase → **SQL Editor** → 貼上整份 → **Run**。
   ⚠️ 這份 SQL 會**刪掉並重建**資料表，**現有成績會清空**。正式上線後要改規則，請只執行需要的 `insert` / `create or replace function`，不要整份重跑。

## 刪除玩家資料（隱私權政策承諾的）

Supabase → **Authentication** → **Users** → 找到該玩家 → **Delete user**。暱稱和所有成績會一起刪除（`on delete cascade`）。

## 免費方案注意

- 連續 7 天沒有任何 API 請求，專案會被**暫停**；到 Supabase 後台按 **Restore** 即可恢復。
- 資料庫 500 MB：每筆賽道成績含幽靈車約 12 KB。

## 測試與離線

- 單元測試（Vitest）不載入 `.env.*`，排行榜自動關閉。
- e2e（Playwright）以 `VITE_ONLINE=off` 建置，不會碰到正式資料庫。
- 沒有網路時遊戲照常玩，只是不會上傳；本機排行榜不受影響。
