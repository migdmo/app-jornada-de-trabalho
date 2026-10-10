import { useEffect, useState, type FormEvent } from 'react'
import * as adjustmentsApi from '../api/adjustmentRequests'
import type { EntryType, Workday } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { detectTimezone } from '../utils/location'
import { ENTRY_LABELS, cityFromTimezone, formatTime, todayIn } from '../utils/format'

const MIN_REASON_LENGTH = 10
const ENTRY_TYPES: EntryType[] = ['CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT']

// Sugere a marcação que provavelmente falta, a partir da última do dia
function suggestMissingType(day?: Workday): EntryType {
  const last = day?.entries.at(-1)
  if (!last) return 'CLOCK_IN'
  if (last.type === 'CLOCK_IN' || last.type === 'BREAK_END') return 'CLOCK_OUT'
  if (last.type === 'BREAK_START') return 'BREAK_END'
  return 'CLOCK_IN'
}

interface AdjustmentModalProps {
  day?: Workday
  onClose: () => void
  onCreated: () => void
}

export function AdjustmentModal({ day, onClose, onCreated }: AdjustmentModalProps) {
  const { user } = useAuth()
  const detected = detectTimezone()

  // Fusos oferecidos: os das marcações do dia, o atual e o fuso base
  const timezoneOptions = Array.from(new Set([
    ...(day?.entries.map((e) => e.timezone) ?? []),
    detected,
    user!.home_timezone,
  ]))

  const [entryId, setEntryId] = useState('')
  const [type, setType] = useState<EntryType>(() => suggestMissingType(day))
  const [date, setDate] = useState(day?.date ?? todayIn(detected))
  const [time, setTime] = useState('')
  const [timezone, setTimezone] = useState(timezoneOptions[0])
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Fecha com a tecla Esc
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Ao escolher corrigir uma marcação, preenche com os dados dela
  function handleEntryChange(value: string) {
    setEntryId(value)
    const entry = day?.entries.find((e) => String(e.id) === value)
    if (entry) {
      setType(entry.type)
      setTimezone(entry.timezone)
      setTime(formatTime(entry.occurred_at, entry.timezone))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!time) {
      setError('Informe o horário correto.')
      return
    }
    if (reason.trim().length < MIN_REASON_LENGTH) {
      setError(`Explique o motivo com pelo menos ${MIN_REASON_LENGTH} caracteres.`)
      return
    }

    setSubmitting(true)
    try {
      await adjustmentsApi.create({
        time_entry_id: entryId ? Number(entryId) : null,
        requested_type: type,
        requested_local_time: `${date}T${time}`,
        timezone,
        reason: reason.trim(),
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar a solicitação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="adjustment-title">
        <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h2 className="modal-title h5" id="adjustment-title">Solicitar ajuste</h2>
              <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} />
            </div>

            <div className="modal-body">
              {error && <div className="alert alert-danger py-2">{error}</div>}

              {day && day.entries.length > 0 && (
                <div className="mb-3">
                  <label htmlFor="adj-entry" className="form-label">O que você quer fazer?</label>
                  <select
                    id="adj-entry"
                    className="form-select"
                    value={entryId}
                    onChange={(e) => handleEntryChange(e.target.value)}
                  >
                    <option value="">Adicionar uma marcação esquecida</option>
                    {day.entries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        Corrigir: {ENTRY_LABELS[entry.type]} às {formatTime(entry.occurred_at, entry.timezone)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="adj-type" className="form-label">Marcação</label>
                <select
                  id="adj-type"
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as EntryType)}
                >
                  {ENTRY_TYPES.map((t) => (
                    <option key={t} value={t}>{ENTRY_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-7">
                  <label htmlFor="adj-date" className="form-label">Data</label>
                  <input
                    id="adj-date"
                    type="date"
                    className="form-control"
                    value={date}
                    disabled={entryId !== ''}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="col-5">
                  <label htmlFor="adj-time" className="form-label">Horário correto</label>
                  <input
                    id="adj-time"
                    type="time"
                    className="form-control"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="adj-tz" className="form-label">Onde você estava</label>
                <select
                  id="adj-tz"
                  className="form-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>{cityFromTimezone(tz)} ({tz})</option>
                  ))}
                </select>
                <div className="form-text">O horário acima é interpretado no fuso deste local.</div>
              </div>

              <div>
                <label htmlFor="adj-reason" className="form-label">Motivo</label>
                <textarea
                  id="adj-reason"
                  className="form-control"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: esqueci de registrar a saída, trabalhei até as 18h."
                />
                <div className="form-text">
                  {reason.trim().length}/{MIN_REASON_LENGTH} caracteres mínimos
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
                Enviar solicitação
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  )
}