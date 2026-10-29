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

export function KeyHints({ manual }: { manual: boolean }) {
  const hints = manual ? [...COMMON.slice(0, 2), ...MANUAL, ...COMMON.slice(2)] : COMMON;
  return (
    <ul className={styles.hints} aria-label="鍵盤操作">
      {hints.map(([key, label]) => (
        <li key={key}>
          <kbd>{key}</kbd>
          {label}
        </li>
      ))}
    </ul>
  );
}
