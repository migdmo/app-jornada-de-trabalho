import type { Role, ContractWorkMode } from '../../../generated/prisma/enums.ts'

export interface UpdateEmployeeDto {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  work_mode?: ContractWorkMode;
  home_timezone?: string;
  daily_expected_minutes?: number;
  office_id?: number;
  team_id?: number | null;
  active?: boolean;                // permite reativar um colaborador
}