/**
 * Street missions in 楠梓: from the station on 建楠路 to a real landmark, by
 * its exact OpenStreetMap name. Roughly nearest first.
 */
export interface MissionSpec {
  readonly id: string;
  readonly title: string;
  /** One line of story. */
  readonly brief: string;
  /** Exact name of the destination landmark on the map. */
  readonly place: string;
  readonly icon: string;
}

export const NANZIH_MISSIONS: readonly MissionSpec[] = [
  {
    id: 'district-office',
    title: '送公文',
    brief: '區公所等著蓋章，送過去就好，練習一下。',
    place: '楠梓區公所',
    icon: '📄',
  },
  {
    id: 'hospital-run',
    title: '急送藥品',
    brief: '健仁醫院缺一箱藥，越快越好。',
    place: '健仁醫院',
    icon: '💊',
  },
  {
    id: 'fill-up',
    title: '油快沒了',
    brief: '油表在閃，趕快騎到楠都加油站。',
    place: '楠都加油站',
    icon: '⛽',
  },
  {
    id: 'school-pickup',
    title: '接弟弟放學',
    brief: '楠梓國中要放學了，別讓他等。',
    place: '高雄市立楠梓國民中學',
    icon: '🎒',
  },
  {
    id: 'campus',
    title: '趕上第一堂課',
    brief: '高科大楠梓校區，八點的課快遲到了。',
    place: '國立高雄科技大學楠梓校區',
    icon: '🎓',
  },
  {
    id: 'night-market',
    title: '夜市外送',
    brief: '後勁夜市的客人點了雞排，要趁熱送到。',
    place: '後勁夜市',
    icon: '🍗',
  },
  {
    id: 'high-school',
    title: '送便當',
    brief: '妹妹忘了帶便當，中午前送到中山高中。',
    place: '高雄市立中山高級中學',
    icon: '🍱',
  },
  {
    id: 'forest-park',
    title: '晨跑集合',
    brief: '朋友在右昌森林公園等你一起跑步。',
    place: '右昌森林公園',
    icon: '🌳',
  },
  {
    id: 'youchang-school',
    title: '全城挑戰',
    brief: '從楠梓車站一路騎到右昌國中，最遠的一趟。',
    place: '高雄市立右昌國民中學',
    icon: '🏁',
  },
];
