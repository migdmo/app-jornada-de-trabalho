import { useCallback, useEffect, useState } from 'react'
import * as workdaysApi from '../api/workdays'
import type { MonthSummary, Workday } from '../api/types'
import { AdjustmentModal } from './AdjustmentModal'
import { DAY_STATUS, addMonths, formatDay, formatMonth } from '../utils/workday'
import {
  ENTRY_LABELS, cityFromTimezone, formatBalance, formatMinutes, formatTime, todayIn,
} from '../utils/format'

interface MonthViewProps {
  employeeId?: number          // vazio = jornada do próprio usuário
  allowAdjustments?: boolean   // mostra o botão "Solicitar ajuste"
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  return (
    <div className="col">
      <div className="card h-100">
        <div className="card-body py-2 px-3">
          <div className="small text-secondary">{label}</div>
          <div className={`fs-5 fw-semibold ${tone ? `text-${tone}` : ''}`}>{value}</div>
        </div>
      </div>
    </div>
  )
}

function balanceClass(balance: number | null): string {
  if (balance === null || balance === 0) return 'text-secondary'
  return balance > 0 ? 'text-success' : 'text-danger'
}

export function MonthView({ employeeId, allowAdjustments = false }: MonthViewProps) {
  const [month, setMonth] = useState<string | undefined>(undefined)
  const [summary, setSummary] = useState<MonthSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [adjustmentDay, setAdjustmentDay] = useState<Workday | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = employeeId === undefined
        ? await workdaysApi.getMine(month)
        : await workdaysApi.getOfEmployee(employeeId, month)
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a jornada.')
    } finally {
      setLoading(false)
    }
  }, [employeeId, month])

  useEffect(() => {
    void load()
  }, [load])

  if (error) return <div className="alert alert-danger">{error}</div>

  if (!summary) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    )
  }

  const { totals } = summary
  const isClosed = summary.closing_status === 'CLOSED'
  const currentMonth = todayIn(summary.employee.home_timezone).slice(0, 7)

  // Dias mais recentes primeiro; sem dias futuros nem anteriores à admissão
  const days = summary.days
    .filter((d) => d.status !== 'FUTURE' && d.status !== 'BEFORE_ADMISSION')
    .reverse()

  return (
    <>
      {/* Navegação entre meses */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <button
          className="btn btn-outline-secondary"
          aria-label="Mês anterior"
          disabled={loading}
          onClick={() => setMonth(addMonths(summary.month, -1))}
        >
          <i className="bi bi-chevron-left" />
        </button>

        <h2 className="h5 mb-0 text-capitalize text-center">
          {formatMonth(summary.month)}
          {isClosed && (
            <span className="badge text-bg-dark ms-2 text-uppercase">
              <i className="bi bi-lock-fill me-1" />Fechado
            </span>
          )}
        </h2>

        <button
          className="btn btn-outline-secondary"
          aria-label="Próximo mês"
          disabled={loading || summary.month >= currentMonth}
          onClick={() => setMonth(addMonths(summary.month, 1))}
        >
          <i className="bi bi-chevron-right" />
        </button>
      </div>

      {notice && (
        <div className="alert alert-success d-flex justify-content-between align-items-start">
          <span>{notice}</span>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={() => setNotice(null)} />
        </div>
      )}

      {allowAdjustments && !isClosed && totals.inconsistent_days > 0 && (
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-2" />
          Há {totals.inconsistent_days} dia(s) com jornada inconsistente. Toque no dia e solicite um ajuste.
        </div>
      )}

      {/* Totais */}
      <div className="row row-cols-2 row-cols-md-4 g-2 mb-3">
        <SummaryCard label="Trabalhado" value={formatMinutes(totals.worked_minutes)} />
        <SummaryCard label="Esperado" value={formatMinutes(totals.expected_minutes)} />
        <SummaryCard
          label="Saldo"
          value={formatBalance(totals.balance_minutes)}
          tone={totals.balance_minutes < 0 ? 'danger' : 'success'}
        />
        <SummaryCard
          label="Dias inconsistentes"
          value={String(totals.inconsistent_days)}
          tone={totals.inconsistent_days > 0 ? 'danger' : undefined}
        />
      </div>

      {/* Dias */}
      <div className="list-group">
        {days.map((day) => {
          const meta = DAY_STATUS[day.status]
          const isOpen = expanded === day.date

          return (
            <div key={day.date} className="list-group-item p-0">
              <button
                type="button"
                className={`btn w-100 text-start d-flex flex-wrap align-items-center gap-2 px-3 py-2 border-0 ${day.status === 'DAY_OFF' ? 'text-secondary' : ''}`}
                aria-expanded={isOpen}
                onClick={() => setExpanded(isOpen ? null : day.date)}
              >
                <span className="fw-semibold text-capitalize" style={{ minWidth: '6.5rem' }}>
                  {formatDay(day.date)}
                </span>
                <span className={`badge ${meta.badge}`}>
                  <i className={`bi ${meta.icon} me-1`} />
                  {meta.label}
                </span>
                <span className="ms-auto small text-secondary">
                  {day.worked_minutes > 0 ? formatMinutes(day.worked_minutes) : '—'}
                </span>
                <span
                  className={`small fw-semibold text-end ${balanceClass(day.balance_minutes)}`}
                  style={{ minWidth: '3.5rem' }}
                >
                  {day.balance_minutes === null ? '' : formatBalance(day.balance_minutes)}
                </span>
                <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-secondary`} />
              </button>

              {isOpen && (
                <div className="px-3 pb-3 pt-2 border-top bg-body-tertiary">
                  {day.entries.length === 0 ? (
                    <p className="small text-secondary mb-2">Nenhuma marcação neste dia.</p>
                  ) : (
                    <ul className="list-unstyled small mb-2">
                      {day.entries.map((entry) => (
                        <li key={entry.id} className="d-flex justify-content-between py-1">
                          <span>
                            {ENTRY_LABELS[entry.type]}
                            {entry.source === 'ADJUSTMENT' && (
                              <span className="badge text-bg-info ms-2">ajuste</span>
                            )}
                          </span>
                          <span className="text-secondary">
                            {formatTime(entry.occurred_at, entry.timezone)} · {cityFromTimezone(entry.timezone)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {day.break_minutes > 0 && (
                    <p className="small text-secondary mb-2">
                      Intervalo: {formatMinutes(day.break_minutes)}
                    </p>
                  )}

                  {allowAdjustments && !isClosed && (
                    <button className="btn btn-sm btn-outline-primary" onClick={() => setAdjustmentDay(day)}>
                      <i className="bi bi-pencil-square me-1" />
                      Solicitar ajuste
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {adjustmentDay && (
        <AdjustmentModal
          day={adjustmentDay}
          onClose={() => setAdjustmentDay(null)}
          onCreated={() => {
            setAdjustmentDay(null)
            setNotice('Solicitação enviada. A jornada será atualizada assim que ela for aprovada.')
          }}
        />
      )}
    </>
  )
}