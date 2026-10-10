// O navegador informa o fuso horário, mas não o país.
// Este mapa sugere o país para os fusos das regiões onde a empresa atua;
// o usuário sempre pode corrigir na tela.
const COUNTRY_BY_TIMEZONE: Record<string, string> = {
  'America/Sao_Paulo': 'BR', 'America/Bahia': 'BR', 'America/Fortaleza': 'BR',
  'America/Recife': 'BR', 'America/Belem': 'BR', 'America/Manaus': 'BR',
  'America/Cuiaba': 'BR', 'America/Campo_Grande': 'BR', 'America/Maceio': 'BR',
  'America/Porto_Velho': 'BR', 'America/Boa_Vista': 'BR', 'America/Rio_Branco': 'BR',
  'America/Noronha': 'BR',
  'Europe/Lisbon': 'PT', 'Atlantic/Madeira': 'PT', 'Atlantic/Azores': 'PT',
  'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES',
  'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Rome': 'IT',
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
}

export const COUNTRIES = [
  { code: 'BR', name: 'Brasil' },
  { code: 'PT', name: 'Portugal' },
  { code: 'ES', name: 'Espanha' },
  { code: 'FR', name: 'França' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'IT', name: 'Itália' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'NL', name: 'Países Baixos' },
  { code: 'BE', name: 'Bélgica' },
]

export function detectTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function guessCountry(timezone: string): string | null {
  return COUNTRY_BY_TIMEZONE[timezone] ?? null
}