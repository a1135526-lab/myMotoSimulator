import type { ReactNode } from 'react';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  toolbar: ReactNode;
  children: ReactNode;
}

export function AppLayout({ toolbar, children }: AppLayoutProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            ◔
          </span>
          Scooter Dyno Simulator
        </h1>
        <div className={styles.toolbar}>{toolbar}</div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        模擬結果僅供參考。標示「估計值」的參數非原廠公開數據。
      </footer>
    </div>
  );
}
