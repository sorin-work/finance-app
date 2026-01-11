import { formatMonth, shiftMonth } from '../lib/dates';

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
}

export function MonthPicker({ month, onChange }: MonthPickerProps) {
  return (
    <div className="month-picker">
      <button
        className="icon-button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
      >
        ‹
      </button>
      <span className="month-picker__label">{formatMonth(month)}</span>
      <button
        className="icon-button"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}
