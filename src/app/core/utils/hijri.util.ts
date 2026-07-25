/**
 * Gregorian <-> Hijri conversion using the tabular (arithmetic) Islamic
 * calendar algorithm (a Julian-day-based method widely used for offline,
 * deterministic conversion). Accurate to within ~1 day of local moon-sighting
 * based calendars, which is an accepted trade-off for an offline-first app.
 */

const HIJRI_MONTH_NAMES_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

const HIJRI_MONTH_NAMES_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

export interface HijriDate {
  year: number;
  month: number;
  day: number;
  monthNameEn: string;
  monthNameAr: string;
}

function gregorianToJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function toHijri(date: Date): HijriDate {
  let jd = gregorianToJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
  jd = jd - 1948440 + 10632;
  const n = Math.floor((jd - 1) / 10631);
  jd = jd - 10631 * n + 354;
  const j =
    Math.floor((10985 - jd) / 5316) * Math.floor((50 * jd) / 17719) +
    Math.floor(jd / 5670) * Math.floor((43 * jd) / 15238);
  jd =
    jd -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * jd) / 709);
  const day = jd - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return {
    year,
    month,
    day,
    monthNameEn: HIJRI_MONTH_NAMES_EN[month - 1],
    monthNameAr: HIJRI_MONTH_NAMES_AR[month - 1],
  };
}

export function formatHijri(date: Date, language: 'en' | 'ar' = 'en'): string {
  const h = toHijri(date);
  const monthName = language === 'ar' ? h.monthNameAr : h.monthNameEn;
  return language === 'ar' ? `${h.day} ${monthName} ${h.year}هـ` : `${h.day} ${monthName} ${h.year} AH`;
}
