# 楠梓地圖匯入（OpenStreetMap）

街景模式的地圖來自 OpenStreetMap。**地圖資料 © OpenStreetMap 貢獻者，以 [ODbL](https://www.openstreetmap.org/copyright) 授權。** 遊戲畫面、README 和資料檔都要保留這個標示。

## 更新資料

1. 用 OSM 官方 API 下載 0.01° 見方的圖塊（經度 120.285–120.335、緯度 22.705–22.745，共 20 塊），存成 `t_<經度>_<緯度>.osm`：

   ```sh
   mkdir -p osm-tiles && cd osm-tiles
   for lo in 120.285 120.295 120.305 120.315 120.325; do
     for la in 22.705 22.715 22.725 22.735; do
       lo2=$(python -c "print(round($lo+0.01,3))"); la2=$(python -c "print(round($la+0.01,3))")
       curl -A "myMotoSimulator map import" -o "t_${lo}_${la}.osm" \
         "https://api.openstreetmap.org/api/0.6/map?bbox=$lo,$la,$lo2,$la2"
       sleep 1
     done
   done
   ```

   一次性的少量下載符合 OSM API 的使用規範；不要頻繁重抓。

2. 轉換：

   ```sh
   python scripts/osm/import_nanzih.py osm-tiles          # 寫入 src/data/cities/nanzih/nanzih.json
   python scripts/osm/import_nanzih.py osm-tiles --stats  # 只看統計
   ```

3. 跑 `npm test`：`src/data/cities/nanzih/nanzih.test.ts` 會驗證資料格式，並確認路網可以規劃路線。

## 保留的內容

- 道路：`primary`、`secondary`、`tertiary`、`unclassified`、`residential`、`living_street`、`*_link`。
  - 排除國道、`service`、步道、地下道和禁止機車的道路。
  - 拆成路口之間的路段，只保留最大的連通網。
- 土地使用：住宅、商業、工業、公園綠地、學校、水域、農地、運動場、墓地、軍事區。
- 河道（以線段加寬度表示）、建築外框與樓層、有號誌的路口。
- 地標：車站、捷運、學校、醫院、公園、廟宇、便利商店、加油站、公家機關、市場、餐飲。
- 里界（admin_level 9）和地區名（右昌、後勁…）。
