import styles from './hud.module.css';

const LIGHTS = 5;
/** How long "GO" stays up after the lights go out, s. */
export const GO_FLASH_S = 1.6;

/** MotoGP-style start gantry: five columns of paired reds, then GO. */
export function StartGantry({ lit, go }: { lit: number; go: boolean }) {
  if (go) {
    return (
      <div className={styles.go} aria-live="assertive">
        GO!
      </div>
    );
  }
  return (
    <div className={styles.gantry} aria-label="起跑燈" data-testid="start-lights" data-lit={lit}>
      {Array.from({ length: LIGHTS }, (_, i) => (
        <span key={i} className={styles.gantryCol}>
          <span className={styles.bulb} data-on={i < lit} />
          <span className={styles.bulb} data-on={i < lit} />
        </span>
      ))}
    </div>
  );
}
