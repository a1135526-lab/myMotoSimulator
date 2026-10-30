import { formatDistance, type NavView } from '@/application';
import type { ManeuverKind } from '@/domain';
import styles from './street.module.css';

/** Arrow per manoeuvre, drawn pointing up = straight on. */
const ARROW_ROTATION: Readonly<Record<Exclude<ManeuverKind, 'uturn' | 'arrive'>, number>> = {
  straight: 0,
  'slight-left': -40,
  left: -90,
  'slight-right': 40,
  right: 90,
};

export function ManeuverIcon({ kind }: { kind: ManeuverKind }) {
  if (kind === 'arrive') {
    return (
      <svg viewBox="-12 -12 24 24" className={styles.navIcon} aria-hidden>
        <path
          d="M 0 10 C -6 3 -7 -1 -7 -4 A 7 7 0 0 1 7 -4 C 7 -1 6 3 0 10 Z"
          fill="currentColor"
        />
        <circle cx={0} cy={-4} r={2.6} fill="#111" />
      </svg>
    );
  }
  if (kind === 'uturn') {
    return (
      <svg viewBox="-12 -12 24 24" className={styles.navIcon} aria-hidden>
        <path
          d="M 4 10 V -3 A 5 5 0 0 0 -6 -3 V 4"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path d="M -10 2 L -6 8 L -2 2 Z" fill="currentColor" />
      </svg>
    );
  }
  const deg = ARROW_ROTATION[kind];
  return (
    <svg viewBox="-12 -12 24 24" className={styles.navIcon} aria-hidden>
      <path d="M 0 10 V 0" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <g transform={`rotate(${deg})`}>
        <path d="M 0 1 V -6" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        <path d="M -5 -4 L 0 -11 L 5 -4 Z" fill="currentColor" />
      </g>
    </svg>
  );
}

const minutes = (s: number) => Math.max(1, Math.round(s / 60));

/** Top-of-screen sat-nav: next turn and distance, then what's left and the ETA. */
export function NavCard({ nav, onCancel }: { nav: NavView; onCancel: () => void }) {
  return (
    <div className={styles.navCard} data-testid="nav-card" data-arrived={nav.arrived}>
      <div className={styles.navMain}>
        <ManeuverIcon kind={nav.arrived ? 'arrive' : nav.next.kind} />
        <div>
          {nav.arrived ? (
            <p className={styles.navText} data-testid="nav-text">
              已抵達 {nav.label}
            </p>
          ) : (
            <>
              <p className={styles.navDistance} data-testid="nav-distance">
                {formatDistance(nav.next.distanceM)}
              </p>
              <p className={styles.navText} data-testid="nav-text">
                {nav.next.text}
              </p>
            </>
          )}
        </div>
      </div>
      <div className={styles.navFoot}>
        <span className={styles.navTarget}>前往 {nav.label}</span>
        {!nav.arrived && (
          <span data-testid="nav-remaining">
            剩 {formatDistance(nav.remainingM)} · 約 {minutes(nav.etaS)} 分鐘
          </span>
        )}
        <button
          type="button"
          className={styles.navCancel}
          onClick={onCancel}
          data-testid="nav-cancel"
        >
          {nav.arrived ? '完成' : '結束導航'}
        </button>
      </div>
    </div>
  );
}
