import { useEffect, useState } from 'react'
import * as employeesApi from '../api/employees'
import type { Employee, Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { MonthView } from '../components/MonthView'
import { Spinner } from '../components/Spinner'
import { cityFromTimezone } from '../utils/format'

const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Colaborador',
  MANAGER: 'Gestor',
  HR: 'RH',
}

export function TeamPage() {
  const { user } = useAuth()
  const isHR = user?.role === 'HR'

  const [members, setMembers] = useState<Employee[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // RH vê todos; gestor vê apenas os membros dos seus times
    const request = isHR ? employeesApi.listAll() : employeesApi.listMyTeam()

    request
      .then((list) => setMembers(list.filter((e) => e.active)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar a equipe.'))
      .finally(() => setLoading(false))
  }, [isHR])

  if (loading) return <Spinner />
  if (error) return <div className="alert alert-danger">{error}</div>

  const term = search.trim().toLowerCase()
  const filtered = members.filter((m) => m.name.toLowerCase().includes(term))
  const selected = members.find((m) => m.id === selectedId) ?? null

  return (
    <>
      <h1 className="h4 mb-3">{isHR ? 'Colaboradores' : 'Minha equipe'}</h1>

      <div className="row g-3">
        {/* Lista: some no celular quando alguém está selecionado */}
        <div className={`col-12 col-md-4 ${selected ? 'd-none d-md-block' : ''}`}>
          <input
            type="search"
            className="form-control mb-2"
            placeholder="Buscar por nome"
            aria-label="Buscar colaborador"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filtered.length === 0 ? (
            <p className="text-secondary small">Nenhum colaborador encontrado.</p>
          ) : (
            <div className="list-group">
              {filtered.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={`list-group-item list-group-item-action ${member.id === selectedId ? 'active' : ''}`}
                  onClick={() => setSelectedId(member.id)}
                >
                  <div className="fw-semibold">{member.name}</div>
                  <div className="small opacity-75">
                    <i className="bi bi-geo-alt me-1" />
                    {cityFromTimezone(member.home_timezone)} · {ROLE_LABELS[member.role]}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Jornada do selecionado */}
        <div className={`col-12 col-md-8 ${selected ? '' : 'd-none d-md-block'}`}>
          {selected ? (
            <>
              <button className="btn btn-link px-0 mb-2 d-md-none" onClick={() => setSelectedId(null)}>
                <i className="bi bi-arrow-left me-1" />
                Voltar
              </button>
              <h2 className="h5 mb-3">{selected.name}</h2>
              {/* key: ao trocar de pessoa, o componente recomeça do mês atual */}
              <MonthView key={selected.id} employeeId={selected.id} />
            </>
          ) : (
            <div className="text-center text-secondary py-5 border rounded">
              <i className="bi bi-person-lines-fill display-6 d-block mb-2" />
              Selecione um colaborador para ver a jornada.
            </div>
          )}
        </div>
      </div>
    </>
  )
}