import type { EntryType } from '../api/types'

export const ENTRY_LABELS: Record<EntryType, string> = {
  CLOCK_IN: 'Entrada',
  BREAK_START: 'Início do intervalo',
  BREAK_END: 'Fim do intervalo',
  CLOCK_OUT: 'Saída',
}

const CITY_NAMES: Record<string, string> = {
  'America/Sao_Paulo': 'São Paulo',
  'Europe/Lisbon': 'Lisboa',
  'Europe/Madrid': 'Madri',
}

// "Europe/Lisbon" → "Lisboa"
export function cityFromTimezone(timezone: string): string {
  return CITY_NAMES[timezone] ?? timezone.split('/').pop()!.replace(/_/g, ' ')
}

// 485 → "8h05" · -60 → "-1h00"
export function formatMinutes(total: number): string {
  const sign = total < 0 ? '-' : ''
  const abs = Math.abs(total)
  return `${sign}${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, '0')}`
}

// Horário de um instante no fuso informado: "09:00"
export function formatTime(iso: string | Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone,
  }).format(new Date(iso))
}

// Relógio com segundos: "09:00:15"
export function formatClock(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: timezone,
  }).format(date)
}

// "sábado, 10 de outubro"
export function formatLongDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone,
  }).format(date)
}

// Data de hoje no fuso informado, no formato da API: "2026-10-10"
export function todayIn(timezone: string): string {
  // O formato en-CA já é AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
}

// Saldo com sinal: 60 → "+1h00" · -30 → "-0h30" · 0 → "0h00"
export function formatBalance(total: number): string {
  return total > 0 ? `+${formatMinutes(total)}` : formatMinutes(total)
}

// Data e hora curtas no fuso informado: "08/10, 18:00"
export function formatDateTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: timezone,
  }).format(new Date(iso))
}