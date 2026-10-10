export function Spinner() {
  return (
    <div className="d-flex justify-content-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Carregando...</span>
      </div>
    </div>
  )
}