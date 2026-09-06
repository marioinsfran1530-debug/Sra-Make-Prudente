export const CRM_TIME_ZONE = "America/Sao_Paulo";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partsInTimeZone(date: Date, timeZone = CRM_TIME_ZONE): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function timeZoneOffsetMs(date: Date, timeZone = CRM_TIME_ZONE) {
  const parts = partsInTimeZone(date, timeZone);
  const renderedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return renderedAsUtc - date.getTime();
}

export function crmLocalDateTimeToUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (
    !Number.isInteger(year) ||
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59
  ) return null;

  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = new Date(wallClockUtc);
  let offset = timeZoneOffsetMs(candidate);
  candidate = new Date(wallClockUtc - offset);

  const correctedOffset = timeZoneOffsetMs(candidate);
  if (correctedOffset !== offset) {
    candidate = new Date(wallClockUtc - correctedOffset);
  }

  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

export function crmDateAtHourInDays(days: number, hour = 10, now = new Date()) {
  const current = partsInTimeZone(now);
  const calendarTarget = new Date(Date.UTC(current.year, current.month - 1, current.day + days));
  const wallClockUtc = Date.UTC(
    calendarTarget.getUTCFullYear(),
    calendarTarget.getUTCMonth(),
    calendarTarget.getUTCDate(),
    hour,
    0,
    0
  );

  let candidate = new Date(wallClockUtc);
  let offset = timeZoneOffsetMs(candidate);
  candidate = new Date(wallClockUtc - offset);
  const correctedOffset = timeZoneOffsetMs(candidate);
  if (correctedOffset !== offset) candidate = new Date(wallClockUtc - correctedOffset);

  return candidate;
}

export function formatCrmDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: CRM_TIME_ZONE,
  }).format(value);
}

export function formatCrmDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: CRM_TIME_ZONE,
  }).format(value);
}
