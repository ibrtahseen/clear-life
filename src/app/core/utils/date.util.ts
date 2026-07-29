import dayjs, { Dayjs } from 'dayjs';
import { IsoDate, WeekDay } from '../models/common.model';

export function toIsoDate(date: Dayjs | Date = new Date()): IsoDate {
  return dayjs(date).format('YYYY-MM-DD');
}

export function todayIso(): IsoDate {
  return toIsoDate();
}

/** Start of the week (as an ISO date) containing `date`, given a configurable first day of week. */
export function startOfWeek(date: Dayjs | Date, firstDayOfWeek: WeekDay): Dayjs {
  const d = dayjs(date);
  const diff = (d.day() - firstDayOfWeek + 7) % 7;
  return d.subtract(diff, 'day').startOf('day');
}

export function endOfWeek(date: Dayjs | Date, firstDayOfWeek: WeekDay): Dayjs {
  return startOfWeek(date, firstDayOfWeek).add(6, 'day').endOf('day');
}

export function isoRange(start: Dayjs, end: Dayjs): IsoDate[] {
  const days: IsoDate[] = [];
  let cursor = start.startOf('day');
  const last = end.startOf('day');
  while (cursor.isBefore(last) || cursor.isSame(last)) {
    days.push(toIsoDate(cursor));
    cursor = cursor.add(1, 'day');
  }
  return days;
}

export function formatTime(isoTimeOrHHmm: string): string {
  const parsed = isoTimeOrHHmm.includes('T') ? dayjs(isoTimeOrHHmm) : dayjs(`2000-01-01T${isoTimeOrHHmm}`);
  return parsed.format('h:mm A');
}

/** Minutes since midnight for a "HH:mm" time string. */
export function parseHHmmToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes since midnight for a Date's local time. */
export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** "Xh Ym" (or "Ym" alone) for a duration given in whole minutes. */
function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** "Xh Ym" (or "Ym" alone) for an elapsed duration given in seconds. */
export function formatDuration(totalSeconds: number): string {
  return formatHoursMinutes(Math.round(totalSeconds / 60));
}

/** "Xh Ym" (or "Ym" alone) until the next occurrence of a "HH:mm" time, relative to `now`. */
export function countdownToTime(time: string, now: number): string {
  const [h, m] = time.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() < now) {
    target.setDate(target.getDate() + 1);
  }
  const diffMs = target.getTime() - now;
  return formatHoursMinutes(Math.max(0, Math.round(diffMs / 60000)));
}
