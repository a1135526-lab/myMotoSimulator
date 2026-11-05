# 楠梓地圖匯入（OpenStreetMap）

街景模式的地圖來自 OpenStreetMap。**地圖資料 © OpenStreetMap 貢獻者，以 [ODbL](https://www.openstreetmap.org/copyright) 授權。** 遊戲畫面、README 和資料檔都要保留這個標示。

## 更新資料

1. 用 Overpass API 一次下載整個楠梓區（含周邊，約 110 MB），存成 `t_all.osm`：

   ```sh
   mkdir -p osm-tiles && cd osm-tiles
   curl -A "myMotoSimulator map import" -o t_all.osm --data-urlencode \
     'data=[out:xml][timeout:300][maxsize:536870912];(nwr(22.690,120.250,22.761,120.345););(._;>;);out body;' \
     https://overpass-api.de/api/interpreter
   ```

   一次性的下載；不要頻繁重抓。保留的範圍由楠梓區的行政區界（OSM relation 2106299）決定，再往外多留 150 m。

2. 轉換：

   ```sh
   python scripts/osm/import_nanzih.py osm-tiles          # 寫入 src/data/cities/nanzih/nanzih.json
   python scripts/osm/import_nanzih.py osm-tiles --stats  # 只看統計
   ```

3. 跑 `npm test`：`src/data/cities/nanzih/nanzih.test.ts` 會驗證資料格式、範圍涵蓋整個區、高架道路有高度，並確認路網可以規劃路線。

## 保留的內容

- 道路：`primary`、`secondary`、`tertiary`、`unclassified`、`residential`、`living_street`、`*_link`。
  - 排除國道、`service`、步道、地下道和禁止機車的道路。
  - 拆成路口之間的路段，只保留最大的連通網。
  - **高架**：`bridge` 且 `layer ≥ 1`，而且真的跨過其他道路或鐵路的路段。橋面高 6.5 m（layer 2 為 13 m），兩端以 7% 坡度降到地面路口；`elevated` 存每個點的高度。只跨河的橋維持平面。
  - 不能騎的高架（國道、禁止機車的橋、鐵路高架）另存成 `overpasses`，只當景物，可以從底下經過。
- 區界：`boundary`（楠梓區外框，畫在大地圖上）。
- 土地使用：住宅、商業、工業、公園綠地、學校、水域、農地、運動場、墓地、軍事區。
- 河道（以線段加寬度表示）、建築外框與樓層、有號誌的路口。
  - 建築只用 OSM 上畫好的外框，遊戲不會自動補上不存在的房子。
- 地標：車站、捷運、學校、醫院、公園、廟宇、便利商店、加油站、公家機關、市場、餐飲。
- 里界（admin_level 9）和地區名（右昌、後勁…）。
