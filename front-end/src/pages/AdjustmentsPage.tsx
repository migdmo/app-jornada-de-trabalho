import { useCallback, useEffect, useState } from 'react'
import * as adjustmentsApi from '../api/adjustmentRequests'
import type { AdjustmentRequest, AdjustmentStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AdjustmentModal } from '../components/AdjustmentModal'
import { ENTRY_LABELS, cityFromTimezone, formatDateTime } from '../utils/format'

const STATUS_META: Record<AdjustmentStatus, { label: string; badge: string }> = {
  PENDING: { label: 'Pendente', badge: 'text-bg-warning' },
  APPROVED: { label: 'Aprovado', badge: 'text-bg-success' },
  REJECTED: { label: 'Rejeitado', badge: 'text-bg-danger' },
}

type Message = { type: 'success' | 'danger'; text: string }

export function AdjustmentsPage() {
  const { user } = useAuth()
  const isReviewer = user?.role === 'MANAGER' || user?.role === 'HR'

  const [requests, setRequests] = useState<AdjustmentRequest[]>([])
  const [tab, setTab] = useState<'mine' | 'review'>(isReviewer ? 'review' : 'mine')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<Message | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setRequests(await adjustmentsApi.list())
    } catch (err) {
      setMessage({ type: 'danger', text: err instanceof Error ? err.message : 'Erro ao carregar.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleReview(id: number, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(id)
    setMessage(null)
    try {
      await adjustmentsApi.review(id, decision, decision === 'REJECTED' ? comment : null)
      setMessage({
        type: 'success',
        text: decision === 'APPROVED'
          ? 'Ajuste aprovado. A jornada do colaborador já foi atualizada.'
          : 'Ajuste rejeitado. O colaborador verá o motivo informado.',
      })
      setRejectingId(null)
      setComment('')
      await load()
    } catch (err) {
      setMessage({ type: 'danger', text: err instanceof Error ? err.message : 'Erro ao revisar.' })
    } finally {
      setBusyId(null)
    }
  }

  const mine = requests.filter((r) => r.employee_id === user?.id)
  const toReview = requests
    .filter((r) => r.employee_id !== user?.id)
    .sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING'))
  const pendingToReview = toReview.filter((r) => r.status === 'PENDING').length
  const visible = tab === 'mine' ? mine : toReview

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-lg-9">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h4 mb-0">Ajustes</h1>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg me-1" />
            Nova solicitação
          </button>
        </div>

        {isReviewer && (
          <ul className="nav nav-pills mb-3">
            <li className="nav-item">
              <button className={`nav-link ${tab === 'review' ? 'active' : ''}`} onClick={() => setTab('review')}>
                Para revisar
                {pendingToReview > 0 && <span className="badge text-bg-danger ms-2">{pendingToReview}</span>}
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
                Minhas solicitações
              </button>
            </li>
          </ul>
        )}

        {message && (
          <div className={`alert alert-${message.type} d-flex justify-content-between align-items-start`}>
            <span>{message.text}</span>
            <button type="button" className="btn-close" aria-label="Fechar" onClick={() => setMessage(null)} />
          </div>
        )}

        {loading && (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="text-center text-secondary py-5">
            <i className="bi bi-inbox display-6 d-block mb-2" />
            {tab === 'review' ? 'Nenhuma solicitação do seu time.' : 'Você ainda não fez nenhuma solicitação.'}
          </div>
        )}

        {visible.map((request) => (
          <div key={request.id} className="card mb-2">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                <div>
                  {tab === 'review' && <div className="fw-semibold">{request.employee.name}</div>}
                  <div>
                    {request.time_entry ? 'Corrigir' : 'Adicionar'}{' '}
                    <strong>{ENTRY_LABELS[request.requested_type].toLowerCase()}</strong>{' '}
                    em {formatDateTime(request.requested_occurred_at, request.timezone)}{' '}
                    <span className="text-secondary">({cityFromTimezone(request.timezone)})</span>
                  </div>
                  {request.time_entry && (
                    <div className="small text-secondary">
                      Registro original: {ENTRY_LABELS[request.time_entry.type]} em{' '}
                      {formatDateTime(request.time_entry.occurred_at, request.time_entry.timezone)}
                    </div>
                  )}
                </div>
                <span className={`badge ${STATUS_META[request.status].badge}`}>
                  {STATUS_META[request.status].label}
                </span>
              </div>

              <p className="small fst-italic mb-2">“{request.reason}”</p>

              {request.reviewed_by && (
                <p className="small text-secondary mb-0">
                  {request.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'} por {request.reviewed_by.name}
                  {request.review_comment && `: ${request.review_comment}`}
                </p>
              )}

              {/* Ações de revisão */}
              {tab === 'review' && request.status === 'PENDING' && (
                rejectingId === request.id ? (
                  <div className="mt-2">
                    <label htmlFor={`comment-${request.id}`} className="form-label small">
                      Motivo da rejeição
                    </label>
                    <textarea
                      id={`comment-${request.id}`}
                      className="form-control form-control-sm mb-2"
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={busyId === request.id || !comment.trim()}
                        onClick={() => handleReview(request.id, 'REJECTED')}
                      >
                        Confirmar rejeição
                      </button>
                      <button
                        className="btn btn-link btn-sm"
                        onClick={() => { setRejectingId(null); setComment('') }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex gap-2 mt-2">
                    <button
                      className="btn btn-success btn-sm"
                      disabled={busyId === request.id}
                      onClick={() => handleReview(request.id, 'APPROVED')}
                    >
                      <i className="bi bi-check-lg me-1" />
                      Aprovar
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      disabled={busyId === request.id}
                      onClick={() => { setRejectingId(request.id); setComment('') }}
                    >
                      <i className="bi bi-x-lg me-1" />
                      Rejeitar
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        ))}

        {showForm && (
          <AdjustmentModal
            onClose={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false)
              setTab('mine')
              setMessage({ type: 'success', text: 'Solicitação enviada para aprovação.' })
              void load()
            }}
          />
        )}
      </div>
    </div>
  )
}