import type { EntryType, EntryWorkMode } from '../../../generated/prisma/enums.ts'

// Repare: não existe occurred_at. O horário é definido pelo servidor.
export interface CreateTimeEntryDto {
  type: EntryType;
  timezone: string;        // fuso do navegador, ex: Europe/Lisbon
  country_code: string;    // país onde está, ex: PT
  work_mode: EntryWorkMode;
  note?: string | null;
}