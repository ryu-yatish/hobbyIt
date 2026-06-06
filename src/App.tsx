import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { createId } from './lib/seed'
import { exportData, loadData, readImportFile, saveData } from './lib/storage'
import type { AppData, EffortLevel, Hobby, RunningSession, Session, Theme, Track } from './lib/types'

type View = 'dashboard' | 'hobbies' | 'tracks' | 'history' | 'settings'

const views: Array<{ id: View; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'hobbies', label: 'Hobbies' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
]

const todayKey = new Date().toISOString().slice(0, 10)

const minutesToHours = (minutes: number) => minutes / 60
const formatHours = (minutes: number) => `${minutesToHours(minutes).toFixed(1)}h`
const formatTimer = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hours, minutes, secs].map((value) => value.toString().padStart(2, '0')).join(':')
}

const sessionMinutes = (startedAt: string, endedAt: string) =>
  Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000))

const weekStart = () => {
  const date = new Date()
  const day = date.getDay() || 7
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - day + 1)
  return date
}

const sumSessions = (sessions: Session[], predicate: (session: Session) => boolean) =>
  sessions.filter(predicate).reduce((total, session) => total + session.durationMinutes, 0)

const getHobby = (data: AppData, id: string) => data.hobbies.find((hobby) => hobby.id === id)

const getQueueHobbies = (data: AppData, track: Track) =>
  track.hobbyIds
    .map((id) => getHobby(data, id))
    .filter((hobby): hobby is Hobby => hobby !== undefined && hobby.status === 'active')

const rotateCompletedHobby = (data: AppData, hobbyId: string) => ({
  ...data,
  tracks: data.tracks.map((track) => {
    if (!track.rotateOnCompletion || !track.hobbyIds.includes(hobbyId)) {
      return track
    }

    return {
      ...track,
      hobbyIds: [...track.hobbyIds.filter((id) => id !== hobbyId), hobbyId],
    }
  }),
})

function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [view, setView] = useState<View>('dashboard')
  const [running, setRunning] = useState<RunningSession | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [sessionNotes, setSessionNotes] = useState('')
  const [mentalLoad, setMentalLoad] = useState(3)
  const [energyBefore, setEnergyBefore] = useState(3)
  const [energyAfter, setEnergyAfter] = useState(3)
  const [newHobby, setNewHobby] = useState({
    name: '',
    category: 'Learning',
    effort: 'medium' as EffortLevel,
    targetHours: 5,
    color: '#7c3aed',
  })

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((error: unknown) => setSaveError(error instanceof Error ? error.message : String(error)))
  }, [])

  useEffect(() => {
    if (!data) {
      return
    }

    document.documentElement.dataset.theme = data.settings.theme
    saveData(data).catch((error: unknown) =>
      setSaveError(error instanceof Error ? error.message : String(error)),
    )
  }, [data])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const activeTrack = useMemo(() => {
    if (!data) {
      return null
    }
    return data.tracks.find((track) => track.id === data.settings.activeTrackId) ?? data.tracks[0]
  }, [data])

  const runningHobby = data && running ? getHobby(data, running.hobbyId) : null
  const elapsedSeconds = running ? Math.floor((now - new Date(running.startedAt).getTime()) / 1000) : 0

  if (!data) {
    return (
      <main className="loading-screen">
        <div className="orb" />
        <h1>Loading HobbyFlow</h1>
        <p>Preparing your local tracker.</p>
      </main>
    )
  }

  const activeHobbies = data.hobbies.filter((hobby) => hobby.status === 'active')
  const week = weekStart()
  const todayMinutes = sumSessions(data.sessions, (session) => session.startedAt.startsWith(todayKey))
  const weekMinutes = sumSessions(data.sessions, (session) => new Date(session.startedAt) >= week)
  const activeQueue = activeTrack ? getQueueHobbies(data, activeTrack) : []
  const focusHobby = activeQueue[0] ?? activeHobbies[0]

  const hobbyProgressMinutes = (hobbyId: string) =>
    sumSessions(data.sessions, (session) => session.hobbyId === hobbyId)

  const startTimer = (hobbyId: string) => {
    setRunning({ hobbyId, startedAt: new Date().toISOString() })
    const hobby = getHobby(data, hobbyId)
    setEnergyBefore(hobby?.effort === 'high' ? 2 : 3)
  }

  const stopTimer = () => {
    if (!running) {
      return
    }

    const endedAt = new Date().toISOString()
    const session: Session = {
      id: createId('session'),
      hobbyId: running.hobbyId,
      startedAt: running.startedAt,
      endedAt,
      durationMinutes: sessionMinutes(running.startedAt, endedAt),
      mentalLoad,
      energyBefore,
      energyAfter,
      notes: sessionNotes.trim(),
    }

    const hobby = getHobby(data, running.hobbyId)
    const totalAfterSession = hobbyProgressMinutes(running.hobbyId) + session.durationMinutes
    const targetMinutes = (hobby?.targetHours ?? 0) * 60

    setData((current) => {
      if (!current) {
        return current
      }
      const next = { ...current, sessions: [session, ...current.sessions] }
      return targetMinutes > 0 && totalAfterSession >= targetMinutes
        ? rotateCompletedHobby(next, running.hobbyId)
        : next
    })
    setRunning(null)
    setSessionNotes('')
  }

  const addHobby = (event: FormEvent) => {
    event.preventDefault()
    if (!newHobby.name.trim()) {
      return
    }

    const hobby: Hobby = {
      id: createId('hobby'),
      name: newHobby.name.trim(),
      category: newHobby.category.trim() || 'General',
      color: newHobby.color,
      effort: newHobby.effort,
      priority: data.hobbies.length + 1,
      targetHours: Number(newHobby.targetHours) || 1,
      status: 'active',
      notes: '',
    }

    const trackId = data.settings.activeTrackId
    setData({
      ...data,
      hobbies: [...data.hobbies, hobby],
      tracks: data.tracks.map((track) =>
        track.id === trackId ? { ...track, hobbyIds: [...track.hobbyIds, hobby.id] } : track,
      ),
    })
    setNewHobby({ ...newHobby, name: '' })
  }

  const updateHobby = (id: string, patch: Partial<Hobby>) => {
    setData({
      ...data,
      hobbies: data.hobbies.map((hobby) => (hobby.id === id ? { ...hobby, ...patch } : hobby)),
    })
  }

  const moveInTrack = (trackId: string, hobbyId: string, direction: -1 | 1) => {
    setData({
      ...data,
      tracks: data.tracks.map((track) => {
        if (track.id !== trackId) {
          return track
        }
        const index = track.hobbyIds.indexOf(hobbyId)
        const nextIndex = index + direction
        if (index < 0 || nextIndex < 0 || nextIndex >= track.hobbyIds.length) {
          return track
        }
        const hobbyIds = [...track.hobbyIds]
        ;[hobbyIds[index], hobbyIds[nextIndex]] = [hobbyIds[nextIndex], hobbyIds[index]]
        return { ...track, hobbyIds }
      }),
    })
  }

  const setTheme = (theme: Theme) => {
    setData({ ...data, settings: { ...data.settings, theme } })
  }

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    try {
      setData(await readImportFile(file))
      setSaveError(null)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">HF</span>
          <div>
            <strong>HobbyFlow</strong>
            <span>Local-first focus tracker</span>
          </div>
        </div>
        <nav className="nav-list">
          {views.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'active' : ''}
              type="button"
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span>Current track</span>
          <strong>{activeTrack?.name ?? 'No track'}</strong>
          <p>{activeTrack?.description}</p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Personal desktop app</p>
            <h1>{view === 'dashboard' ? 'Spend effort on purpose.' : views.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <button type="button" className="ghost" onClick={() => setTheme(data.settings.theme === 'dark' ? 'light' : 'dark')}>
              {data.settings.theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </header>

        {saveError && <div className="alert">Storage note: {saveError}</div>}

        {view === 'dashboard' && (
          <section className="dashboard-grid">
            <div className="hero-card">
              <p className="eyebrow">One-at-a-time focus</p>
              <h2>{focusHobby?.name ?? 'Add a hobby to begin'}</h2>
              <p>
                {activeTrack?.oneAtATime
                  ? 'Finish the assigned block, then HobbyFlow rotates it to the bottom of the queue.'
                  : 'Pick anything in this track and keep the time visible.'}
              </p>
              {focusHobby && (
                <ProgressBar
                  color={focusHobby.color}
                  value={hobbyProgressMinutes(focusHobby.id)}
                  max={focusHobby.targetHours * 60}
                  label={`${formatHours(hobbyProgressMinutes(focusHobby.id))} / ${focusHobby.targetHours}h`}
                />
              )}
              {focusHobby && !running && (
                <button type="button" className="primary" onClick={() => startTimer(focusHobby.id)}>
                  Start focus timer
                </button>
              )}
            </div>

            <div className="timer-card">
              <p className="eyebrow">Active session</p>
              <h2>{runningHobby ? runningHobby.name : 'No timer running'}</h2>
              <div className="timer">{formatTimer(elapsedSeconds)}</div>
              {running ? (
                <div className="session-form">
                  <label>
                    Notes
                    <textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} />
                  </label>
                  <div className="range-grid">
                    <label>
                      Load {mentalLoad}/5
                      <input type="range" min="1" max="5" value={mentalLoad} onChange={(event) => setMentalLoad(Number(event.target.value))} />
                    </label>
                    <label>
                      Energy after {energyAfter}/5
                      <input type="range" min="1" max="5" value={energyAfter} onChange={(event) => setEnergyAfter(Number(event.target.value))} />
                    </label>
                  </div>
                  <button type="button" className="danger" onClick={stopTimer}>
                    Stop and log
                  </button>
                </div>
              ) : (
                <p>Start any hobby timer to record time, load, notes, and energy.</p>
              )}
            </div>

            <StatCard label="Today" value={formatHours(todayMinutes)} detail="Time logged today" />
            <StatCard label="This week" value={formatHours(weekMinutes)} detail="Across all hobbies" />
            <StatCard label="Active hobbies" value={String(activeHobbies.length)} detail="Not paused or archived" />

            <div className="card wide">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Queue</p>
                  <h2>{activeTrack?.name}</h2>
                </div>
                <select
                  value={data.settings.activeTrackId}
                  onChange={(event) =>
                    setData({ ...data, settings: { ...data.settings, activeTrackId: event.target.value } })
                  }
                >
                  {data.tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="queue-list">
                {activeQueue.map((hobby, index) => (
                  <HobbyRow
                    key={hobby.id}
                    hobby={hobby}
                    index={index}
                    progress={hobbyProgressMinutes(hobby.id)}
                    onStart={() => startTimer(hobby.id)}
                    disabled={Boolean(running)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {view === 'hobbies' && (
          <section className="stack">
            <form className="card form-grid" onSubmit={addHobby}>
              <label>
                Hobby
                <input value={newHobby.name} onChange={(event) => setNewHobby({ ...newHobby, name: event.target.value })} placeholder="e.g. Drawing" />
              </label>
              <label>
                Category
                <input value={newHobby.category} onChange={(event) => setNewHobby({ ...newHobby, category: event.target.value })} />
              </label>
              <label>
                Effort
                <select value={newHobby.effort} onChange={(event) => setNewHobby({ ...newHobby, effort: event.target.value as EffortLevel })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                Target hours
                <input type="number" min="1" value={newHobby.targetHours} onChange={(event) => setNewHobby({ ...newHobby, targetHours: Number(event.target.value) })} />
              </label>
              <label>
                Color
                <input type="color" value={newHobby.color} onChange={(event) => setNewHobby({ ...newHobby, color: event.target.value })} />
              </label>
              <button type="submit" className="primary">Add hobby</button>
            </form>
            <div className="hobby-grid">
              {data.hobbies.map((hobby) => (
                <article className="card hobby-card" key={hobby.id}>
                  <div className="color-dot" style={{ background: hobby.color }} />
                  <input value={hobby.name} onChange={(event) => updateHobby(hobby.id, { name: event.target.value })} />
                  <div className="pill-row">
                    <span>{hobby.category}</span>
                    <span>{hobby.effort} effort</span>
                    <span>{hobby.targetHours}h target</span>
                  </div>
                  <textarea value={hobby.notes} onChange={(event) => updateHobby(hobby.id, { notes: event.target.value })} />
                  <div className="button-row">
                    <button type="button" onClick={() => startTimer(hobby.id)} disabled={Boolean(running) || hobby.status !== 'active'}>
                      Start
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => updateHobby(hobby.id, { status: hobby.status === 'active' ? 'paused' : 'active' })}
                    >
                      {hobby.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {view === 'tracks' && (
          <section className="track-grid">
            {data.tracks.map((track) => (
              <article className="card" key={track.id}>
                <div className="section-title">
                  <div>
                    <p className="eyebrow">{track.mode === 'queue' ? 'Queue track' : 'Free track'}</p>
                    <h2>{track.name}</h2>
                  </div>
                  <button type="button" className="ghost" onClick={() => setData({ ...data, settings: { ...data.settings, activeTrackId: track.id } })}>
                    Make active
                  </button>
                </div>
                <p>{track.description}</p>
                <div className="queue-list compact">
                  {getQueueHobbies(data, track).map((hobby, index) => (
                    <div className="queue-item" key={hobby.id}>
                      <span className="queue-rank">{index + 1}</span>
                      <span className="color-dot" style={{ background: hobby.color }} />
                      <strong>{hobby.name}</strong>
                      <div className="move-buttons">
                        <button type="button" onClick={() => moveInTrack(track.id, hobby.id, -1)}>Up</button>
                        <button type="button" onClick={() => moveInTrack(track.id, hobby.id, 1)}>Down</button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        {view === 'history' && (
          <section className="card">
            <div className="section-title">
              <div>
                <p className="eyebrow">Session log</p>
                <h2>{data.sessions.length} sessions</h2>
              </div>
            </div>
            <div className="history-list">
              {data.sessions.length === 0 && <p>No sessions logged yet. Start a timer from the dashboard.</p>}
              {data.sessions.map((session) => {
                const hobby = getHobby(data, session.hobbyId)
                return (
                  <div className="history-item" key={session.id}>
                    <span className="color-dot" style={{ background: hobby?.color }} />
                    <div>
                      <strong>{hobby?.name ?? 'Deleted hobby'}</strong>
                      <p>{new Date(session.startedAt).toLocaleString()} · {formatHours(session.durationMinutes)} · load {session.mentalLoad}/5</p>
                      {session.notes && <p>{session.notes}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {view === 'settings' && (
          <section className="settings-grid">
            <div className="card">
              <p className="eyebrow">Appearance</p>
              <h2>Theme</h2>
              <div className="button-row">
                <button type="button" className={data.settings.theme === 'dark' ? 'primary' : ''} onClick={() => setTheme('dark')}>
                  Dark
                </button>
                <button type="button" className={data.settings.theme === 'light' ? 'primary' : ''} onClick={() => setTheme('light')}>
                  Light
                </button>
              </div>
            </div>
            <div className="card">
              <p className="eyebrow">Local data</p>
              <h2>JSON backup</h2>
              <p>The desktop app keeps its main data file in your Windows app data folder. Use export/import for manual backups or moving machines.</p>
              <div className="button-row">
                <button type="button" onClick={() => exportData(data)}>Export JSON</button>
                <label className="file-button">
                  Import JSON
                  <input type="file" accept="application/json" onChange={importBackup} />
                </label>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="card stat-card">
      <p className="eyebrow">{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  )
}

function ProgressBar({ color, value, max, label }: { color: string; value: number; max: number; label: string }) {
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

function HobbyRow({
  hobby,
  index,
  progress,
  onStart,
  disabled,
}: {
  hobby: Hobby
  index: number
  progress: number
  onStart: () => void
  disabled: boolean
}) {
  return (
    <div className="queue-item">
      <span className="queue-rank">{index + 1}</span>
      <span className="color-dot" style={{ background: hobby.color }} />
      <div>
        <strong>{hobby.name}</strong>
        <p>{hobby.category} · {hobby.effort} effort · {formatHours(progress)} logged</p>
      </div>
      <button type="button" onClick={onStart} disabled={disabled}>
        Start
      </button>
    </div>
  )
}

export default App
