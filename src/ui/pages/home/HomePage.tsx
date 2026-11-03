import { useRaceStore, useUiStore, type Discipline } from '@/application';
import { artBackground, type ArtName } from '../../art';
import { useLobbyMusic } from '../../audio/useLobbyMusic';
import { ArtBackdrop } from '../../components/common/ArtBackdrop';
import { MusicToggle } from '../../components/common/MusicToggle';
import { FriendsButton } from '../../components/friends/FriendsButton';
import { OnlineHeader } from '../../components/online/OnlineHeader';
import { ProfileChip } from './ProfileChip';
import styles from './home.module.css';

type Entry =
  | { readonly id: string; readonly mode: 'simulator' | 'street' }
  | { readonly id: string; readonly mode: 'race'; readonly discipline: Discipline };

const ENTRIES: readonly (Entry & {
  readonly icon: string;
  readonly title: string;
  readonly blurb: string;
  readonly art: ArtName;
})[] = [
  {
    id: 'ranked',
    mode: 'race',
    discipline: 'ranked',
    icon: '🏆',
    title: '排位賽',
    blurb: '配對線上段位接近的玩家，沒人就打電腦；從青銅一路爬到大師。',
    art: 'circuit',
  },
  {
    id: 'room',
    mode: 'race',
    discipline: 'room',
    icon: '👥',
    art: 'room',
    title: '好友對戰',
    blurb: '建立房間、分享房號，最多 4 人在同一條賽道即時比賽。',
  },
  {
    id: 'circuit',
    mode: 'race',
    discipline: 'circuit',
    icon: '🏁',
    art: 'circuit',
    title: '賽道繞圈',
    blurb: '和 AI 跑多圈，壓車過彎、晚煞車，還有自己的幽靈車。',
  },
  {
    id: 'drag',
    mode: 'race',
    discipline: 'drag',
    icon: '🚦',
    art: 'drag',
    title: '直線加速',
    blurb: '看燈號起跑，比反應、起步和換檔，402 m 一決勝負。',
  },
  {
    id: 'street',
    mode: 'street',
    icon: '🏙',
    art: 'street',
    title: '街景模式',
    blurb: '在真實的高雄楠梓街道自由騎乘，挑戰 9 個限時任務。',
  },
  {
    id: 'simulator',
    mode: 'simulator',
    icon: '⚙️',
    art: 'simulator',
    title: '馬力機模擬',
    blurb: '改普利珠、彈簧、齒比，看馬力曲線和加速成績怎麼變。',
  },
];

/** The lobby: who you are at the top left, then pick what to play. */
export function HomePage() {
  const setMode = useUiStore((s) => s.setMode);
  useLobbyMusic();

  const open = (e: Entry) => {
    if (e.mode === 'race') {
      const race = useRaceStore.getState();
      race.setDiscipline(e.discipline);
      // Rooms and ranked have their own screens; the others start at choosing the track.
      race.setStep(e.discipline === 'room' || e.discipline === 'ranked' ? 'mode' : 'track');
    }
    setMode(e.mode);
  };

  return (
    <div className={styles.shell}>
      <ArtBackdrop name="lobby" />
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <ProfileChip />
          <FriendsButton />
        </div>
        <div className={styles.topRight}>
          <MusicToggle />
          <OnlineHeader />
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>揍灰來尬掐</h1>
        <p className={styles.subtitle}>選一個模式開始</p>
        <div className={styles.grid}>
          {ENTRIES.map((e) => (
            <button
              key={e.id}
              type="button"
              className={styles.card}
              data-feature={e.id === 'ranked' || undefined}
              style={{ background: artBackground(e.art) }}
              onClick={() => open(e)}
              data-testid={`home-${e.id}`}
            >
              <span className={styles.cardIcon} aria-hidden>
                {e.icon}
              </span>
              <strong>{e.title}</strong>
              <span>{e.blurb}</span>
            </button>
          ))}
        </div>
      </main>
      <footer className={styles.footer}>
        模擬結果僅供參考。標示「估計值」的參數非原廠公開數據。
      </footer>
    </div>
  );
}
