import type { Role, ContractWorkMode } from '../../../generated/prisma/enums.js'

export interface CreateEmployeeDto {
  name: string;
  email: string;
  password: string;               // senha pura: chega na API e vira hash no service
  role?: Role;
  work_mode?: ContractWorkMode;
  home_timezone?: string;          // se não vier, usa o fuso da unidade
  daily_expected_minutes?: number;
  office_id: number;
  team_id?: number | null;
}