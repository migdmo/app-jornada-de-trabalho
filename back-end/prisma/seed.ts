import bcrypt from 'bcryptjs'
import { prisma } from '../src/database/client'

// ATENÇÃO: este seed APAGA todos os dados antes de recriar.
// Use apenas em ambiente de desenvolvimento.
async function main() {
  // Ordem importa: primeiro quem depende, depois de quem se depende
  await prisma.adjustmentRequest.deleteMany()
  await prisma.monthlyClosing.deleteMany()
  await prisma.timeEntry.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.team.deleteMany()
  await prisma.office.deleteMany()

  const password_hash = await bcrypt.hash('Senha@123', 10)

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
    },
  })

  const bruno = await prisma.employee.create({
    data: {
      name: 'Bruno Costa', email: 'bruno@ddgroup.com', password_hash,
      role: 'MANAGER', work_mode: 'HYBRID',
      office_id: lisboa.id, home_timezone: lisboa.timezone,
    },
  })

  /********** Time **********/
  const operacoesEuropa = await prisma.team.create({
    data: { name: 'Operações Europa', manager_id: bruno.id },
  })

  /********** Colaboradores **********/
  await prisma.employee.create({
    data: {
      name: 'Carla Mendes', email: 'carla@ddgroup.com', password_hash,
      role: 'EMPLOYEE', work_mode: 'HYBRID',
      office_id: saoPaulo.id, home_timezone: saoPaulo.timezone,
      team_id: operacoesEuropa.id,
    },
  })

  await prisma.employee.create({
    data: {
      name: 'Diego Navarro', email: 'diego@ddgroup.com', password_hash,
      role: 'EMPLOYEE', work_mode: 'REMOTE',
      office_id: madri.id, home_timezone: madri.timezone,
      team_id: operacoesEuropa.id,
    },
  })

  console.log('Seed concluído. Senha de todos os usuários: Senha@123')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())