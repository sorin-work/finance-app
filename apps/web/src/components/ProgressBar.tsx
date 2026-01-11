interface ProgressBarProps {
  /** 0-100; values above 100 are drawn as a full bar. */
  percent: number;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  label: string;
}

export function ProgressBar({ percent, tone = 'default', label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={`progress progress--${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <div className="progress__fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}
