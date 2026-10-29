import styles from './common.module.css';

interface ResetButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export function ResetButton({ onClick, disabled, label = '重設為原廠' }: ResetButtonProps) {
  return (
    <button type="button" className={styles.resetButton} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
