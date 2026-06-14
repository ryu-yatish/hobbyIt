import { useEffect, useMemo, useState } from 'react'
import { ChecklistEditor } from './components/ChecklistEditor'
import { HistoryView } from './components/HistoryView'
import { HobbiesView } from './components/HobbiesView'
import { ThemeSettings } from './components/ThemeSettings'
import { TracksView } from './components/TracksView'
import { HobbyRow, ProgressBar, StatCard } from './components/shared'
import {
  addChecklistItem,
  removeChecklistItem,
  toggleChecklistItem,
} from './lib/hobbies'
import { formatHours, formatTimer } from './lib/format'
import { createId } from './lib/seed'
import { upsertSession } from './lib/sessions'
import { applyTheme, loadData, readImportFile, saveData } from './lib/storage'
import { blockProgressMinutes, getHobby, todayMinutes, weekMinutes } from './lib/stats'
import { getQueueHobbies } from './lib/tracks'
import type { AppData, RunningSession, Session, Theme } from './lib/types'

type View = 'dashboard' | 'hobbies' | 'tracks' | 'history' | 'settings'

const views: Array<{ id: View; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'hobbies', label: 'Hobbies' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
]

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

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((error: unknown) => setSaveError(error instanceof Error ? error.message : String(error)))
  }, [])

  useEffect(() => {
    if (!data) {
      return
    }

    applyTheme(data.settings)
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
  const activeQueue = activeTrack ? getQueueHobbies(data, activeTrack) : []
  const focusHobby = activeQueue[0] ?? activeHobbies[0]
  const focusProgress = focusHobby ? blockProgressMinutes(focusHobby, data.sessions) : 0

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
      durationMinutes: 0,
      mentalLoad,
      energyBefore,
      energyAfter,
      notes: sessionNotes.trim(),
      source: 'timer',
    }

    setData(upsertSession(data, session))
    setRunning(null)
    setSessionNotes('')
  }

  const cycleTheme = () => {
    const order: Theme[] = ['light', 'dark', 'warm', 'ocean', 'forest', 'mono']
    const index = order.indexOf(data.settings.theme)
    const next = order[(index + 1) % order.length]
    setData({ ...data, settings: { ...data.settings, theme: next } })
  }

  const importBackup = async (file: File) => {
    try {
      setData(await readImportFile(file))
      setSaveError(null)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
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
            <button type="button" className="ghost" onClick={cycleTheme}>
              Theme: {data.settings.theme}
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
                <>
                  <ProgressBar
                    color={focusHobby.color}
                    value={focusProgress}
                    max={focusHobby.targetHours * 60}
                    label={`${formatHours(focusProgress)} / ${focusHobby.targetHours}h`}
                  />
                  <ChecklistEditor
                    compact
                    items={focusHobby.checklist}
                    onAdd={(text) => setData(addChecklistItem(data, focusHobby.id, text))}
                    onToggle={(itemId) => setData(toggleChecklistItem(data, focusHobby.id, itemId))}
                    onRemove={(itemId) => setData(removeChecklistItem(data, focusHobby.id, itemId))}
                  />
                </>
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

            <StatCard label="Today" value={formatHours(todayMinutes(data.sessions))} detail="Time logged today" />
            <StatCard label="This week" value={formatHours(weekMinutes(data.sessions))} detail="Across all hobbies" />
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
                    progress={blockProgressMinutes(hobby, data.sessions)}
                    onStart={() => startTimer(hobby.id)}
                    disabled={Boolean(running)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {view === 'hobbies' && (
          <HobbiesView data={data} running={Boolean(running)} onChange={setData} onStart={startTimer} />
        )}

        {view === 'tracks' && <TracksView data={data} onChange={setData} />}

        {view === 'history' && <HistoryView data={data} onChange={setData} />}

        {view === 'settings' && <ThemeSettings data={data} onChange={setData} onImport={importBackup} />}
      </main>
    </div>
  )
}

export default App
