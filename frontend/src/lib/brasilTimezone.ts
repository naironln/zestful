import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { parseISO, startOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import type { Locale } from 'date-fns'

/** Horário oficial de Brasília (GMT-3, DST não usado desde 2019). */
export const BRASILIA_TZ = 'America/Sao_Paulo'

/** Formata instante ISO ou `Date` sempre no fuso de Brasília. */
export function formatInBrasilia(
  date: Date | string,
  pattern: string,
  options?: { locale?: Locale }
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, BRASILIA_TZ, pattern, options)
}

/** Data civil de hoje (yyyy-MM-dd) em Brasília — para filtros de API. */
export function todayYmdBrasilia(): string {
  return formatInTimeZone(new Date(), BRASILIA_TZ, 'yyyy-MM-dd')
}

/** Segunda-feira 00:00 da semana corrente no calendário de Brasília. */
export function weekStartMondayBrasilia(ref: Date = new Date()): Date {
  const z = toZonedTime(ref, BRASILIA_TZ)
  return startOfWeek(z, { weekStartsOn: 1 })
}

/** Âncora “agora” no calendário de Brasília (para navegação por mês). */
export function monthAnchorBrasilia(ref: Date = new Date()): Date {
  return toZonedTime(ref, BRASILIA_TZ)
}

export function ymdInBrasilia(d: Date): string {
  return formatInTimeZone(d, BRASILIA_TZ, 'yyyy-MM-dd')
}

export function monthRangeYmdBrasilia(month: Date): { startStr: string; endStr: string } {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  return {
    startStr: ymdInBrasilia(start),
    endStr: ymdInBrasilia(end),
  }
}

/** Hora (0–23) atual em Brasília — ex.: saudação “Bom dia”. */
export function currentHourBrasilia(): number {
  return Number.parseInt(formatInTimeZone(new Date(), BRASILIA_TZ, 'H'), 10)
}
