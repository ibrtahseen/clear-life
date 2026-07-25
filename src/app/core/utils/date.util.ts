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

export function formatTime(isoTimeOrHHmm: string, use24h = false): string {
  const parsed = isoTimeOrHHmm.includes('T') ? dayjs(isoTimeOrHHmm) : dayjs(`2000-01-01T${isoTimeOrHHmm}`);
  return parsed.format(use24h ? 'HH:mm' : 'h:mm A');
}
