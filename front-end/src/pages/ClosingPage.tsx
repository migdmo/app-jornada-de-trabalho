import { useCallback, useEffect, useState } from 'react'
import * as employeesApi from '../api/employees'
import * as workdaysApi from '../api/workdays'
import * as closingsApi from '../api/monthlyClosings'
import type { MonthSummary, MonthlyClosing } from '../api/types'
import { Spinner } from '../components/Spinner'
import { addMonths, formatMonth } from '../utils/workday'
import { formatBalance, formatDateTime, formatMinutes, todayIn } from '../utils/format'
import { detectTimezone } from '../utils/location'

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="col">
      <div className="card h-100 text-center">
        <div className="card-body py-2">
          <div className="fs-4 fw-semibold">{value}</div>
          <div className="small text-secondary">{label}</div>
        </div>
      </div>
    </div>
  )
}

export function ClosingPage() {
  const timezone = detectTimezone()
  const currentMonth = todayIn(timezone).slice(0, 7)

  const [month, setMonth] = useState(() => addMonths(currentMonth, -1))
  const [summaries, setSummaries] = useState<MonthSummary[]>([])
  const [closings, setClosings] = useState<MonthlyClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setRowErrors({})
    try {
      const employees = (await employeesApi.listAll()).filter((e) => e.active)

      // Uma consulta por colaborador: suficiente para o porte atual da empresa
      const [monthSummaries, monthClosings] = await Promise.all([
        Promise.all(employees.map((e) => workdaysApi.getOfEmployee(e.id, month))),
        closingsApi.list(month),
      ])

      setSummaries(monthSummaries)
      setClosings(monthClosings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o fechamento.')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    void load()
  }, [load])

  async function handleClose(employeeId: number) {
    setBusyId(employeeId)
    try {
      await closingsApi.close(employeeId, month)
      setConfirmingId(null)
      await load()
    } catch (err) {
      // Ex: ajustes pendentes no mês, regra validada pelo back-end
      setRowErrors((prev) => ({
        ...prev,
        [employeeId]: err instanceof Error ? err.message : 'Erro ao fechar o mês.',
      }))
      setConfirmingId(null)
    } finally {
      setBusyId(null)
    }
  }

  if (loading && summaries.length === 0) return <Spinner />

  const monthEnded = month < currentMonth
  const closedCount = summaries.filter((s) => s.closing_status === 'CLOSED').length
  const readyCount = summaries.filter(
    (s) => s.closing_status !== 'CLOSED' && s.totals.inconsistent_days === 0
  ).length

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-lg-10">
        <h1 className="h4 mb-3">Fechamento mensal</h1>

        {/* Navegação entre meses */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <button
            className="btn btn-outline-secondary"
            aria-label="Mês anterior"
            disabled={loading}
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <i className="bi bi-chevron-left" />
          </button>
          <h2 className="h5 mb-0 text-capitalize">{formatMonth(month)}</h2>
          <button
            className="btn btn-outline-secondary"
            aria-label="Próximo mês"
            disabled={loading || month >= currentMonth}
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <i className="bi bi-chevron-right" />
          </button>
        </div>

        {!monthEnded && (
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2" />
            Este mês ainda não terminou. O fechamento fica disponível a partir do dia 1º do mês seguinte.
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row row-cols-3 g-2 mb-3">
          <Stat label="Colaboradores" value={summaries.length} />
          <Stat label="Fechados" value={closedCount} />
          <Stat label="Prontos" value={monthEnded ? readyCount : 0} />
        </div>

        <div className={`list-group ${loading ? 'opacity-50' : ''}`}>
          {summaries.map((summary) => {
            const id = summary.employee.id
            const { totals } = summary
            const isClosed = summary.closing_status === 'CLOSED'
            const hasInconsistencies = totals.inconsistent_days > 0
            const closing = closings.find((c) => c.employee_id === id && c.status === 'CLOSED')

            return (
              <div key={id} className="list-group-item py-3">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                  <div>
                    <div className="fw-semibold">{summary.employee.name}</div>
                    <div className="small text-secondary">
                      Trabalhado {formatMinutes(totals.worked_minutes)} · Esperado{' '}
                      {formatMinutes(totals.expected_minutes)} · Saldo{' '}
                      <span className={totals.balance_minutes < 0 ? 'text-danger' : 'text-success'}>
                        {formatBalance(totals.balance_minutes)}
                      </span>
                    </div>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {hasInconsistencies && (
                        <span className="badge text-bg-danger">
                          {totals.inconsistent_days} dia(s) inconsistente(s)
                        </span>
                      )}
                      {totals.absent_days > 0 && (
                        <span className="badge text-bg-warning">{totals.absent_days} falta(s)</span>
                      )}
                    </div>
                  </div>

                  <div>
                    {isClosed ? (
                      <span className="badge text-bg-dark py-2">
                        <i className="bi bi-lock-fill me-1" />
                        Fechado
                        {closing?.closed_by && ` por ${closing.closed_by.name}`}
                        {closing?.closed_at && ` em ${formatDateTime(closing.closed_at, timezone)}`}
                      </span>
                    ) : confirmingId === id ? (
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-dark btn-sm"
                          disabled={busyId === id}
                          onClick={() => handleClose(id)}
                        >
                          {busyId === id && <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />}
                          Confirmar fechamento
                        </button>
                        <button className="btn btn-link btn-sm" onClick={() => setConfirmingId(null)}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-outline-dark btn-sm"
                        disabled={!monthEnded || hasInconsistencies}
                        onClick={() => setConfirmingId(id)}
                      >
                        <i className="bi bi-lock me-1" />
                        Fechar mês
                      </button>
                    )}
                  </div>
                </div>

                {!isClosed && monthEnded && hasInconsistencies && (
                  <div className="small text-danger mt-2">
                    Os dias inconsistentes precisam ser corrigidos por ajuste antes do fechamento.
                  </div>
                )}

                {rowErrors[id] && (
                  <div className="alert alert-danger py-1 px-2 small mt-2 mb-0">{rowErrors[id]}</div>
                )}
              </div>
            )
          })}
        </div>

        <p className="small text-secondary mt-3 mb-0">
          <i className="bi bi-info-circle me-1" />
          Depois de fechado, o mês não aceita novas marcações nem ajustes para aquele colaborador.
        </p>
      </div>
    </div>
  )
}