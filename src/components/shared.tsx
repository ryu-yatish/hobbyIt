export function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="card stat-card">
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  )
}

export function ProgressBar({
  color,
  value,
  max,
  label,
}: {
  color: string
  value: number
  max: number
  label: string
}) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="progress-wrap">
      <div className="progress-meta">
        <span>Progress</span>
        <strong>{label}</strong>
      </div>
      <div className="progress">
        <span style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  )
}

export function HobbyRow({
  hobby,
  index,
  progress,
  onStart,
  disabled,
}: {
  hobby: { id: string; name: string; category: string; effort: string; color: string }
  index: number
  progress: number
  onStart: () => void
  disabled: boolean
}) {
  const formatHours = (minutes: number) => `${(minutes / 60).toFixed(1)}h`
  return (
    <div className="queue-item">
      <span className="queue-rank">{index + 1}</span>
      <span className="color-dot" style={{ background: hobby.color }} />
      <div>
        <strong>{hobby.name}</strong>
        <p>
          {hobby.category} · {hobby.effort} effort · {formatHours(progress)} this block
        </p>
      </div>
      <button type="button" onClick={onStart} disabled={disabled}>
        Start
      </button>
    </div>
  )
}
