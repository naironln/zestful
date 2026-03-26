import { parseISO } from 'date-fns'
import type { Locale } from 'date-fns'

/** Horário oficial de Brasília (GMT-3, DST não usado desde 2019). */
export const BRASILIA_TZ = 'America/Sao_Paulo'

const LOCALE_PT_BR = 'pt-BR'

function sourceDate(date: Date | string): Date {
  return typeof date === 'string' ? parseISO(date) : date
}

function partMap(date: Date, locale: string, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const parts = new Intl.DateTimeFormat(locale, { timeZone: BRASILIA_TZ, ...options }).formatToParts(date)
  const out: Record<string, string> = {}
  for (const p of parts) {
    if (p.type !== 'literal') out[p.type] = p.value
  }
  return out
}

function ymdParts(date: Date): { year: number; month: number; day: number } {
  const parts = partMap(date, 'en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return {
    year: Number.parseInt(parts.year, 10),
    month: Number.parseInt(parts.month, 10),
    day: Number.parseInt(parts.day, 10),
  }
}

// Use UTC noon to keep calendar-day arithmetic stable across environments.
function utcNoonDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

function formatByPattern(date: Date, pattern: string, locale = LOCALE_PT_BR): string {
  if (pattern === 'yyyy-MM-dd') {
    const p = partMap(date, 'en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
    return `${p.year}-${p.month}-${p.day}`
  }
  if (pattern === 'HH:mm') {
    const p = partMap(date, 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${p.hour}:${p.minute}`
  }
  if (pattern === "EEEE, d 'de' MMMM · HH:mm") {
    const d = partMap(date, locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `${d.weekday}, ${d.day} de ${d.month} · ${d.hour}:${d.minute}`
  }
  if (pattern === "EEEE, d 'de' MMMM") {
    const d = partMap(date, locale, { weekday: 'long', day: 'numeric', month: 'long' })
    return `${d.weekday}, ${d.day} de ${d.month}`
  }
  if (pattern === "d 'de' MMM") {
    const d = partMap(date, locale, { day: 'numeric', month: 'short' })
    return `${d.day} de ${d.month.replace('.', '')}`
  }
  if (pattern === 'MMMM yyyy') {
    const d = partMap(date, locale, { month: 'long', year: 'numeric' })
    return `${d.month} ${d.year}`
  }
  if (pattern === 'EEE') {
    return new Intl.DateTimeFormat(locale, { timeZone: BRASILIA_TZ, weekday: 'short' })
      .format(date)
      .replace('.', '')
  }
  return new Intl.DateTimeFormat(locale, { timeZone: BRASILIA_TZ, dateStyle: 'medium' }).format(date)
}

/** Formata instante ISO ou `Date` sempre no fuso de Brasília. */
export function formatInBrasilia(
  date: Date | string,
  pattern: string,
  options?: { locale?: Locale }
): string {
  void options // current implementation uses browser locale string fallback
  return formatByPattern(sourceDate(date), pattern, LOCALE_PT_BR)
}

/** Abreviação do dia da semana para uma data civil yyyy-MM-dd (Brasília). */
export function weekdayShortFromYmd(ymd: string, locale: Locale): string {
  return formatInBrasilia(`${ymd}T12:00:00.000Z`, 'EEE', { locale })
}

/** Data civil de hoje (yyyy-MM-dd) em Brasília — para filtros de API. */
export function todayYmdBrasilia(): string {
  return formatByPattern(new Date(), 'yyyy-MM-dd', 'en-CA')
}

/** Segunda-feira 00:00 da semana corrente no calendário de Brasília. */
export function weekStartMondayBrasilia(ref: Date = new Date()): Date {
  const { year, month, day } = ymdParts(ref)
  const current = utcNoonDate(year, month, day)
  const dow = current.getUTCDay() // 0: Sunday ... 6: Saturday
  const diffToMonday = (dow + 6) % 7
  return new Date(current.getTime() - diffToMonday * 24 * 60 * 60 * 1000)
}

/** Âncora “agora” no calendário de Brasília (para navegação por mês). */
export function monthAnchorBrasilia(ref: Date = new Date()): Date {
  const { year, month, day } = ymdParts(ref)
  return utcNoonDate(year, month, day)
}

export function ymdInBrasilia(d: Date): string {
  return formatByPattern(d, 'yyyy-MM-dd', 'en-CA')
}

export function monthRangeYmdBrasilia(month: Date): { startStr: string; endStr: string } {
  const { year, month: monthNum } = ymdParts(month)
  const start = utcNoonDate(year, monthNum, 1)
  const end = utcNoonDate(year, monthNum + 1, 0)
  return {
    startStr: ymdInBrasilia(start),
    endStr: ymdInBrasilia(end),
  }
}

/** Hora (0–23) atual em Brasília — ex.: saudação “Bom dia”. */
export function currentHourBrasilia(): number {
  const p = partMap(new Date(), 'en-GB', { hour: '2-digit', hour12: false })
  return Number.parseInt(p.hour, 10)
}

/** Ano e mês (1–12) civis em Brasília para um instante âncora de calendário. */
export function yearMonthBrasilia(month: Date): { year: number; monthNum: number } {
  const p = ymdParts(month)
  return {
    year: p.year,
    monthNum: p.month,
  }
}
