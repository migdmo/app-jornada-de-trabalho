import type { EntryType } from '../../../generated/prisma/enums.ts'

export interface CreateAdjustmentRequestDto {
  time_entry_id?: number | null;  // marcação a corrigir; vazio = marcação esquecida
  requested_type: EntryType;
  requested_local_time: string;   // horário correto, no fuso local: "2026-10-08T18:00"
  timezone: string;               // fuso desse horário: "Europe/Madrid"
  reason: string;
}