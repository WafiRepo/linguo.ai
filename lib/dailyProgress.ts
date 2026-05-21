/** Local calendar date key (YYYY-MM-DD) for daily XP / streak / plan resets. */
export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateKey(date = new Date()): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - 1);
  return getLocalDateKey(copy);
}

export const DEFAULT_DAILY_GOAL = 20;
