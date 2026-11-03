import { artUrl, type ArtName } from '../../art';
import styles from './common.module.css';

/** A game picture behind the whole page, dimmed and softened. */
export function ArtBackdrop({ name }: { name: ArtName }) {
  return (
    <div
      className={styles.artBackdrop}
      style={{ backgroundImage: `url("${artUrl(name)}")` }}
      aria-hidden
    />
  );
}
