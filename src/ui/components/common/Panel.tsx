import type { ReactNode } from 'react';
import styles from './common.module.css';

interface PanelProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, actions, children, className }: PanelProps) {
  return (
    <section className={[styles.panel, className].filter(Boolean).join(' ')}>
      {(title || actions) && (
        <header className={styles.panelHeader}>
          {title && <h2 className={styles.panelTitle}>{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
