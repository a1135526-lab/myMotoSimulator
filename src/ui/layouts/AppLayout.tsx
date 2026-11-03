import type { ReactNode } from 'react';
import { OnlineHeader } from '../components/online/OnlineHeader';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  toolbar: ReactNode;
  children: ReactNode;
  /**
   * Phone on its side in a 3D mode: no header or footer; the page's stage
   * fills the screen and its controls sit on top of the picture.
   */
  immersive?: boolean;
}

export function AppLayout({ toolbar, children, immersive = false }: AppLayoutProps) {
  if (immersive) {
    return (
      <div className={styles.shell} data-immersive="">
        <main className={styles.main}>{children}</main>
      </div>
    );
  }
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            ◔
          </span>
          揍灰來尬掐
        </h1>
        <div className={styles.toolbar}>
          {toolbar}
          <OnlineHeader />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        模擬結果僅供參考。標示「估計值」的參數非原廠公開數據。
      </footer>
    </div>
  );
}
