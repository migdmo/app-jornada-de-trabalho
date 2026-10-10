import bcrypt from 'bcryptjs'
import { DateTime } from 'luxon'
import { prisma } from '../src/database/client'
import type { EntryType, EntryWorkMode } from '../generated/prisma/enums.ts'

// Gera um dia de trabalho padrão (09h–12h, 13h–18h) no fuso informado
async function createWorkday(
  employeeId: number,
  date: DateTime,
  timezone: string,
  countryCode: string,
  workMode: EntryWorkMode,
  options: { forgetClockOut?: boolean } = {}
) {
  const day = date.toISODate()!

  const marks: [EntryType, string][] = [
    ['CLOCK_IN', '09:00'],
    ['BREAK_START', '12:00'],
    ['BREAK_END', '13:00'],
    ['CLOCK_OUT', '18:00'],
  ]

  for (const [type, time] of marks) {
    if (type === 'CLOCK_OUT' && options.forgetClockOut) continue

    const at = DateTime.fromISO(`${day}T${time}`, { zone: timezone })

    await prisma.timeEntry.create({
      data: {
        employee_id: employeeId,
        type,
        occurred_at: at.toUTC().toJSDate(),
        timezone,
        utc_offset_minutes: at.offset,
        work_date: new Date(`${day}T00:00:00.000Z`),
        country_code: countryCode,
        work_mode: workMode,
      },
    })
  }
}

// ATENÇÃO: este seed APAGA todos os dados antes de recriar.
// Use apenas em ambiente de desenvolvimento.
async function main() {
  await prisma.adjustmentRequest.deleteMany()
  await prisma.monthlyClosing.deleteMany()
  await prisma.timeEntry.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.team.deleteMany()
  await prisma.office.deleteMany()

  const password_hash = await bcrypt.hash('Senha@123', 10)

  // O histórico começa na segunda-feira da semana passada
  const today = DateTime.now().setZone('America/Sao_Paulo').startOf('day')
  const lastMonday = today.startOf('week').minus({ weeks: 1 })
  const admission = lastMonday.toJSDate()

  /********** Unidades **********/
  const saoPaulo = await prisma.office.create({
    data: { name: 'São Paulo', country_code: 'BR', timezone: 'America/Sao_Paulo' },
  })
  const lisboa = await prisma.office.create({
    data: { name: 'Lisboa', country_code: 'PT', timezone: 'Europe/Lisbon' },
  })
  const madri = await prisma.office.create({
    data: { name: 'Madri', country_code: 'ES', timezone: 'Europe/Madrid' },
  })

  /********** RH e gestor **********/
  await prisma.employee.create({
    data: {
      name: 'Ana Ribeiro', email: 'ana@ddgroup.com', password_hash,
      role: 'HR', work_mode: 'ONSITE',
      office_id: saoPaulo.id, home_timezone: saoPaulo.timezone,
      created_at: admission,
    },
  })

  const bruno = await prisma.employee.create({
    data: {
      name: 'Bruno Costa', email: 'bruno@ddgroup.com', password_hash,
      role: 'MANAGER', work_mode: 'HYBRID',
      office_id: lisboa.id, home_timezone: lisboa.timezone,
      created_at: admission,
    },
  })

  /********** Time **********/
  const operacoesEuropa = await prisma.team.create({
    data: { name: 'Operações Europa', manager_id: bruno.id },
  })

  /********** Colaboradores **********/
  const carla = await prisma.employee.create({
    data: {
      name: 'Carla Mendes', email: 'carla@ddgroup.com', password_hash,
      role: 'EMPLOYEE', work_mode: 'HYBRID',
      office_id: saoPaulo.id, home_timezone: saoPaulo.timezone,
      team_id: operacoesEuropa.id, created_at: admission,
    },
  })

  const diego = await prisma.employee.create({
    data: {
      name: 'Diego Navarro', email: 'diego@ddgroup.com', password_hash,
      role: 'EMPLOYEE', work_mode: 'REMOTE',
      office_id: madri.id, home_timezone: madri.timezone,
      team_id: operacoesEuropa.id, created_at: admission,
    },
  })

  /********** Histórico de marcações **********/
  const tripEnds = lastMonday.plus({ days: 3 })      // Carla: segunda a quarta em Lisboa
  const diegoForgot = lastMonday.plus({ days: 3 })   // Diego: esqueceu a saída na quinta

  for (let day = lastMonday; day < today; day = day.plus({ days: 1 })) {
    if (day.weekday >= 6) continue // pula fim de semana

    const onTrip = day < tripEnds
    await createWorkday(
      carla.id, day,
      onTrip ? 'Europe/Lisbon' : 'America/Sao_Paulo',
      onTrip ? 'PT' : 'BR',
      onTrip ? 'TRAVEL' : 'OFFICE'
    )

    await createWorkday(
      diego.id, day, 'Europe/Madrid', 'ES', 'REMOTE',
      { forgetClockOut: day.hasSame(diegoForgot, 'day') }
    )
  }

  console.log('Seed concluído. Senha de todos os usuários: Senha@123')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())