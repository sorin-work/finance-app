export interface GoalProjection {
  remaining: number;
  /** Whole months until the target date (at least 1), or null without a date. */
  monthsLeft: number | null;
  /** What needs to be saved each month to hit the target on time. */
  monthlyNeeded: number | null;
  overdue: boolean;
}

function monthsUntil(today: string, target: string): number {
  const [cy, cm, cd] = today.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = target.split('-').map(Number) as [number, number, number];
  let months = (ty - cy) * 12 + (tm - cm);
  if (td < cd) months -= 1;
  return Math.max(1, months);
}

export function goalProjection(
  goal: { targetAmount: number; savedAmount: number; targetDate: string | null },
  today: string,
): GoalProjection {
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);

  if (!goal.targetDate || remaining === 0) {
    return { remaining, monthsLeft: null, monthlyNeeded: null, overdue: false };
  }
  if (goal.targetDate < today) {
    return { remaining, monthsLeft: 0, monthlyNeeded: null, overdue: true };
  }

  const monthsLeft = monthsUntil(today, goal.targetDate);
  return {
    remaining,
    monthsLeft,
    monthlyNeeded: Math.ceil(remaining / monthsLeft),
    overdue: false,
  };
}
