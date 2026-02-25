export function getTodayKey() {
  const now = new Date();
  return formatDateKey(now);
}

export function formatDateKey(date) {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateKey) {
  const date = new Date(dateKey + 'T12:00:00');
  const today = new Date();
  const todayKey = formatDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getDayOfYear(dateKey) {
  const date = new Date(dateKey + 'T12:00:00');
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function getWeekDates(dateKey) {
  const date = new Date(dateKey + 'T12:00:00');
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDateKey(d));
  }
  return dates;
}

export function isSunday(dateKey) {
  const date = new Date(dateKey + 'T12:00:00');
  return date.getDay() === 0;
}
