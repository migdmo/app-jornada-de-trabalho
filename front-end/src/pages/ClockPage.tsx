import { Fragment, useCallback, useEffect, useState } from 'react'
import * as timeEntriesApi from '../api/timeEntries'
import type { ClockStatus, Employee, EntryType, EntryWorkMode, TimeEntry } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { COUNTRIES, detectTimezone, guessCountry } from '../utils/location'
import {
  ENTRY_LABELS, cityFromTimezone, formatClock, formatLongDate, formatTime, todayIn,
} from '../utils/format'

const ACTIONS: Record<EntryType, { label: string; icon: string; variant: string }> = {
  CLOCK_IN: { label: 'Registrar entrada', icon: 'bi-box-arrow-in-right', variant: 'success' },
  BREAK_START: { label: 'Iniciar intervalo', icon: 'bi-cup-hot', variant: 'warning' },
  BREAK_END: { label: 'Encerrar intervalo', icon: 'bi-arrow-repeat', variant: 'primary' },
  CLOCK_OUT: { label: 'Registrar saída', icon: 'bi-box-arrow-right', variant: 'danger' },
}

const WORK_MODES: { value: EntryWorkMode; label: string; icon: string }[] = [
  { value: 'OFFICE', label: 'Escritório', icon: 'bi-building' },
  { value: 'REMOTE', label: 'Remoto', icon: 'bi-house' },
  { value: 'TRAVEL', label: 'Viagem', icon: 'bi-airplane' },
]

// Sugestão de modalidade: fuso diferente do fuso base indica viagem
function suggestWorkMode(user: Employee, timezone: string): EntryWorkMode {
  if (timezone !== user.home_timezone) return 'TRAVEL'
  if (user.work_mode === 'REMOTE') return 'REMOTE'
  return 'OFFICE'
}

export function ClockPage() {
  const { user } = useAuth()
  const timezone = detectTimezone()

  const [country, setCountry] = useState(() => guessCountry(timezone) ?? 'BR')
  const [workMode, setWorkMode] = useState<EntryWorkMode>(() => suggestWorkMode(user!, timezone))
  const [status, setStatus] = useState<ClockStatus | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [now, setNow] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)

  // Carrega o status e as marcações da jornada atual (ou de hoje)
  const load = useCallback(async () => {
    const current = await timeEntriesApi.getStatus()
    const day = current.journey_open && current.last_entry
      ? current.last_entry.work_date.slice(0, 10)
      : todayIn(timezone)

    setStatus(current)
    setEntries(await timeEntriesApi.listMine(day, day))
  }, [timezone])

  useEffect(() => {
    load()
      .catch((err) => setMessage({ type: 'danger', text: err.message }))
      .finally(() => setLoading(false))
  }, [load])

  // Relógio atualizado a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function handleRegister(type: EntryType) {
    setSubmitting(true)
    setMessage(null)

    try {
      const entry = await timeEntriesApi.register({
        type, timezone, country_code: country, work_mode: workMode,
      })
      setMessage({
        type: 'success',
        text: `${ENTRY_LABELS[type]} registrada às ${formatTime(entry.occurred_at, entry.timezone)} (${cityFromTimezone(entry.timezone)}).`,
      })
      await load()
    } catch (err) {
      setMessage({ type: 'danger', text: err instanceof Error ? err.message : 'Erro ao registrar.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    )
  }

  // Texto e cor do status da jornada
  const lastEntry = status?.last_entry
  const clockIn = entries.find((e) => e.type === 'CLOCK_IN')
  let statusText = 'Nenhuma jornada em andamento'
  let statusColor = 'text-bg-secondary'

  if (status?.journey_open && lastEntry?.type === 'BREAK_START') {
    statusText = `Em intervalo desde ${formatTime(lastEntry.occurred_at, lastEntry.timezone)}`
    statusColor = 'text-bg-warning'
  } else if (status?.journey_open && clockIn) {
    statusText = `Trabalhando desde ${formatTime(clockIn.occurred_at, clockIn.timezone)}`
    statusColor = 'text-bg-success'
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-8 col-lg-6">
        <h1 className="h5 mb-3">Olá, {user?.name.split(' ')[0]}</h1>

        {/* Relógio */}
        <div className="card shadow-sm mb-3">
          <div className="card-body text-center py-4">
            <div className="display-4 fw-semibold font-monospace">
              {formatClock(now, timezone)}
            </div>
            <div className="text-secondary text-capitalize">
              <i className="bi bi-geo-alt me-1" />
              {cityFromTimezone(timezone)} · {formatLongDate(now, timezone)}
            </div>
            <span className={`badge rounded-pill mt-3 px-3 py-2 ${statusColor}`}>
              {statusText}
            </span>
          </div>
        </div>

        {message && (
          <div className={`alert alert-${message.type} d-flex justify-content-between align-items-start`} role="alert">
            <span>{message.text}</span>
            <button type="button" className="btn-close" aria-label="Fechar" onClick={() => setMessage(null)} />
          </div>
        )}

        {/* Botões: só as ações permitidas agora */}
        <div className="d-grid gap-2 mb-4">
          {status?.next_allowed.map((type) => (
            <button
              key={type}
              className={`btn btn-${ACTIONS[type].variant} btn-lg py-3`}
              disabled={submitting}
              onClick={() => handleRegister(type)}
            >
              {submitting
                ? <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                : <i className={`bi ${ACTIONS[type].icon} me-2`} />}
              {ACTIONS[type].label}
            </button>
          ))}
        </div>

        {/* Onde a pessoa está */}
        <div className="card mb-3">
          <div className="card-body">
            <h2 className="h6 mb-3">Onde você está agora</h2>

            <div className="btn-group w-100 mb-3" role="group" aria-label="Modalidade de trabalho">
              {WORK_MODES.map((mode) => (
                <Fragment key={mode.value}>
                  <input
                    type="radio"
                    className="btn-check"
                    name="work-mode"
                    id={`mode-${mode.value}`}
                    checked={workMode === mode.value}
                    onChange={() => setWorkMode(mode.value)}
                  />
                  <label className="btn btn-outline-secondary" htmlFor={`mode-${mode.value}`}>
                    <i className={`bi ${mode.icon} d-block fs-5`} />
                    <small>{mode.label}</small>
                  </label>
                </Fragment>
              ))}
            </div>

            <label htmlFor="country" className="form-label small">País</label>
            <select
              id="country"
              className="form-select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <div className="form-text">
              Fuso horário detectado automaticamente: {timezone}
            </div>
          </div>
        </div>

        {/* Marcações da jornada */}
        <div className="card">
          <div className="card-body">
            <h2 className="h6 mb-2">
              {status?.journey_open ? 'Marcações da jornada atual' : 'Marcações de hoje'}
            </h2>

            {entries.length === 0 ? (
              <p className="text-secondary small mb-0">Nenhuma marcação ainda.</p>
            ) : (
              <ul className="list-group list-group-flush">
                {entries.map((entry) => (
                  <li key={entry.id} className="list-group-item d-flex justify-content-between px-0">
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
          </div>
        </div>
      </div>
    </div>
  )
}