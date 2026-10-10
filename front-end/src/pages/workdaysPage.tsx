import { MonthView } from '../components/MonthView'

export function WorkdaysPage() {
  return (
    <div className="row justify-content-center">
      <div className="col-12 col-lg-9">
        <h1 className="h4 mb-3">Minha jornada</h1>
        <MonthView allowAdjustments />
      </div>
    </div>
  )
}