import styles from './controls.module.css';

const COMMON = [
  ['↑', '油門'],
  ['↓', '煞車'],
  ['R', '重置'],
  ['Space', '計時'],
] as const;

const MANUAL = [
  ['Shift', '離合（按住）'],
  ['→', '升檔'],
  ['←', '降檔'],
  ['Enter', '發動'],
] as const;

interface KeyHintsProps {
  manual: boolean;
  /** Overrides the Space label (the race uses Space to start the tree). */
  spaceLabel?: string;
  /** Replace the whole list (circuit racing uses its own layout). */
  hints?: readonly (readonly [string, string])[];
}

export function KeyHints({ manual, spaceLabel, hints: custom }: KeyHintsProps) {
  const hints =
    custom ?? (manual ? [...COMMON.slice(0, 2), ...MANUAL, ...COMMON.slice(2)] : COMMON);
  return (
    <ul className={styles.hints} aria-label="鍵盤操作">
      {hints.map(([key, label]) => (
        <li key={key}>
          <kbd>{key}</kbd>
          {key === 'Space' && spaceLabel ? spaceLabel : label}
        </li>
      ))}
    </ul>
  );
}
