const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

export default function PlannerHead() {
  return (
    <div className="planner-head">
      <div>
        <small>Today's calling plan</small>
        <h1>Planner</h1>
      </div>
      <span className="date-chip">{today}</span>
    </div>
  )
}
