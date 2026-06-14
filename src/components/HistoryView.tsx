import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { localDateKey, parseLocalDateTime, toDateInput, toTimeInput } from '../lib/dates'
import { formatDateHeader, formatHours } from '../lib/format'
import { createId } from '../lib/seed'
import { deleteSession, sessionMinutes, upsertSession } from '../lib/sessions'
import {
  categoryBreakdown,
  dailyMinutes,
  energyTrend,
  getHobby,
  hobbyBreakdown,
  sessionsInRange,
  summaryStats,
  type StatsRange,
} from '../lib/stats'
import type { AppData, Session, SessionSource } from '../lib/types'
import { StatCard } from './shared'

type HistoryViewProps = {
  data: AppData
  onChange: (data: AppData) => void
}

type SessionFormState = {
  id?: string
  hobbyId: string
  date: string
  startTime: string
  endTime: string
  mentalLoad: number
  energyBefore: number
  energyAfter: number
  notes: string
  source: SessionSource
}

const emptyForm = (data: AppData): SessionFormState => ({
  hobbyId: data.hobbies[0]?.id ?? '',
  date: localDateKey(),
  startTime: '09:00',
  endTime: '10:00',
  mentalLoad: 3,
  energyBefore: 3,
  energyAfter: 3,
  notes: '',
  source: 'manual',
})

export function HistoryView({ data, onChange }: HistoryViewProps) {
  const [range, setRange] = useState<StatsRange>(14)
  const [filterHobby, setFilterHobby] = useState('')
  const [filterSource, setFilterSource] = useState<'all' | SessionSource>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<SessionFormState>(() => emptyForm(data))

  const filteredSessions = useMemo(() => {
    let sessions = sessionsInRange(data.sessions, range)
    if (filterHobby) {
      sessions = sessions.filter((session) => session.hobbyId === filterHobby)
    }
    if (filterSource !== 'all') {
      sessions = sessions.filter((session) => (session.source ?? 'timer') === filterSource)
    }
    return sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  }, [data.sessions, range, filterHobby, filterSource])

  const groupedSessions = useMemo(() => {
    const groups = new Map<string, Session[]>()
    for (const session of filteredSessions) {
      const key = localDateKey(new Date(session.startedAt))
      const list = groups.get(key) ?? []
      list.push(session)
      groups.set(key, list)
    }
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [filteredSessions])

  const dailyData = dailyMinutes(data.sessions, range)
  const hobbyData = hobbyBreakdown(data, data.sessions, range)
  const categoryData = categoryBreakdown(data, data.sessions, range)
  const energyData = energyTrend(data.sessions, range)
  const summary = summaryStats(data, data.sessions, range)

  const openCreate = () => {
    setForm(emptyForm(data))
    setShowForm(true)
  }

  const openEdit = (session: Session) => {
    setForm({
      id: session.id,
      hobbyId: session.hobbyId,
      date: toDateInput(session.startedAt),
      startTime: toTimeInput(session.startedAt),
      endTime: toTimeInput(session.endedAt),
      mentalLoad: session.mentalLoad,
      energyBefore: session.energyBefore,
      energyAfter: session.energyAfter,
      notes: session.notes,
      source: session.source ?? 'timer',
    })
    setShowForm(true)
  }

  const saveForm = () => {
    const startedAt = parseLocalDateTime(form.date, form.startTime).toISOString()
    const endedAt = parseLocalDateTime(form.date, form.endTime).toISOString()
    const session: Session = {
      id: form.id ?? createId('session'),
      hobbyId: form.hobbyId,
      startedAt,
      endedAt,
      durationMinutes: sessionMinutes(startedAt, endedAt),
      mentalLoad: form.mentalLoad,
      energyBefore: form.energyBefore,
      energyAfter: form.energyAfter,
      notes: form.notes.trim(),
      source: form.source,
    }
    onChange(upsertSession(data, session))
    setShowForm(false)
  }

  const removeSession = (sessionId: string) => {
    if (!window.confirm('Delete this session? Stats will update accordingly.')) {
      return
    }
    onChange(deleteSession(data, sessionId))
  }

  return (
    <section className="history-page stack">
      <div className="history-toolbar card">
        <div className="section-title">
          <div>
            <p className="eyebrow">Analytics</p>
            <h2>History & stats</h2>
          </div>
          <button type="button" className="primary" onClick={openCreate}>
            Log past session
          </button>
        </div>
        <div className="filter-row">
          <label>
            Range
            <select value={String(range)} onChange={(e) => setRange(e.target.value === 'all' ? 'all' : (Number(e.target.value) as StatsRange))}>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="all">All time</option>
            </select>
          </label>
          <label>
            Hobby
            <select value={filterHobby} onChange={(e) => setFilterHobby(e.target.value)}>
              <option value="">All hobbies</option>
              {data.hobbies.map((hobby) => (
                <option key={hobby.id} value={hobby.id}>
                  {hobby.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}>
              <option value="all">All</option>
              <option value="timer">Timer</option>
              <option value="manual">Manual</option>
            </select>
          </label>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total time" value={formatHours(summary.totalMinutes)} detail="In selected range" />
        <StatCard label="Sessions" value={String(summary.sessionCount)} detail="Logged sessions" />
        <StatCard label="Avg session" value={formatHours(summary.avgMinutes)} detail="Per session" />
        <StatCard label="Top hobby" value={summary.topHobby} detail="Most time logged" />
      </div>

      <div className="chart-grid">
        <article className="card chart-card">
          <h3>Daily time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}h`, 'Time']} />
              <Bar dataKey="hours" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="card chart-card">
          <h3>By hobby</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={hobbyData} dataKey="minutes" nameKey="name" innerRadius={50} outerRadius={80}>
                {hobbyData.map((entry) => (
                  <Cell key={entry.hobbyId} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${formatHours(Number(v))}`, 'Time']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </article>

        <article className="card chart-card">
          <h3>Category vs budget</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" name="Logged (h)" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="budget" name="Weekly budget (h)" fill="var(--muted)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="card chart-card">
          <h3>Energy trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={energyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="energy" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </article>
      </div>

      <article className="card">
        <div className="section-title">
          <div>
            <p className="eyebrow">Session log</p>
            <h2>{filteredSessions.length} sessions</h2>
          </div>
        </div>
        <div className="history-list">
          {filteredSessions.length === 0 && <p>No sessions in this range.</p>}
          {groupedSessions.map(([dateKey, sessions]) => (
            <div className="history-group" key={dateKey}>
              <h3 className="history-date">{formatDateHeader(dateKey)}</h3>
              {sessions.map((session) => {
                const hobby = getHobby(data, session.hobbyId)
                return (
                  <div className="history-item" key={session.id}>
                    <span className="color-dot" style={{ background: hobby?.color }} />
                    <div className="history-content">
                      <strong>{hobby?.name ?? 'Deleted hobby'}</strong>
                      <p>
                        {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {formatHours(session.durationMinutes)}
                        {' · load '}
                        {session.mentalLoad}/5
                        {' · energy '}
                        {session.energyBefore}→{session.energyAfter}
                        {' · '}
                        <span className="badge">{(session.source ?? 'timer') === 'manual' ? 'manual' : 'timer'}</span>
                      </p>
                      {session.notes && <p>{session.notes}</p>}
                    </div>
                    <div className="button-row">
                      <button type="button" className="ghost small" onClick={() => openEdit(session)}>
                        Edit
                      </button>
                      <button type="button" className="ghost small danger-text" onClick={() => removeSession(session.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </article>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>{form.id ? 'Edit session' : 'Log past session'}</h2>
            <div className="form-stack">
              <label>
                Hobby
                <select value={form.hobbyId} onChange={(e) => setForm({ ...form, hobbyId: e.target.value })}>
                  {data.hobbies.map((hobby) => (
                    <option key={hobby.id} value={hobby.id}>
                      {hobby.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>
              <div className="range-grid">
                <label>
                  Start
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </label>
                <label>
                  End
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </label>
              </div>
              <div className="range-grid">
                <label>
                  Load {form.mentalLoad}/5
                  <input type="range" min="1" max="5" value={form.mentalLoad} onChange={(e) => setForm({ ...form, mentalLoad: Number(e.target.value) })} />
                </label>
                <label>
                  Energy before {form.energyBefore}/5
                  <input type="range" min="1" max="5" value={form.energyBefore} onChange={(e) => setForm({ ...form, energyBefore: Number(e.target.value) })} />
                </label>
                <label>
                  Energy after {form.energyAfter}/5
                  <input type="range" min="1" max="5" value={form.energyAfter} onChange={(e) => setForm({ ...form, energyAfter: Number(e.target.value) })} />
                </label>
              </div>
              <label>
                Notes
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>
            <div className="button-row">
              <button type="button" className="primary" onClick={saveForm}>
                Save session
              </button>
              <button type="button" className="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
