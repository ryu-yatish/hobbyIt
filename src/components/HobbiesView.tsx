import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  addChecklistItem,
  createHobby,
  deleteHobby,
  removeChecklistItem,
  toggleChecklistItem,
  trackForHobby,
  updateHobby,
} from '../lib/hobbies'
import { blockProgressMinutes } from '../lib/stats'
import { assignHobbyToTrack } from '../lib/tracks'
import type { AppData, EffortLevel, Hobby } from '../lib/types'
import { ChecklistEditor } from './ChecklistEditor'
import { ProgressBar } from './shared'

type HobbiesViewProps = {
  data: AppData
  running: boolean
  onChange: (data: AppData) => void
  onStart: (hobbyId: string) => void
}

export function HobbiesView({ data, running, onChange, onStart }: HobbiesViewProps) {
  const [newHobby, setNewHobby] = useState({
    name: '',
    category: 'Learning',
    effort: 'medium' as EffortLevel,
    targetHours: 5,
    color: '#7c3aed',
  })

  const addHobby = (event: FormEvent) => {
    event.preventDefault()
    if (!newHobby.name.trim()) {
      return
    }
    onChange(createHobby(data, newHobby, data.settings.activeTrackId))
    setNewHobby({ ...newHobby, name: '' })
  }

  const patchHobby = (id: string, patch: Partial<Hobby>) => {
    onChange(updateHobby(data, id, patch))
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this hobby? Sessions stay in history as "Deleted hobby".')) {
      return
    }
    onChange(deleteHobby(data, id))
  }

  const handleTrackChange = (hobbyId: string, trackId: string) => {
    onChange(assignHobbyToTrack(data, hobbyId, trackId))
  }

  return (
    <section className="stack">
      <form className="card form-grid hobbies-form" onSubmit={addHobby}>
        <label>
          Hobby
          <input value={newHobby.name} onChange={(e) => setNewHobby({ ...newHobby, name: e.target.value })} placeholder="e.g. Drawing" />
        </label>
        <label>
          Category
          <input value={newHobby.category} onChange={(e) => setNewHobby({ ...newHobby, category: e.target.value })} />
        </label>
        <label>
          Effort
          <select value={newHobby.effort} onChange={(e) => setNewHobby({ ...newHobby, effort: e.target.value as EffortLevel })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Target hours
          <input type="number" min="1" value={newHobby.targetHours} onChange={(e) => setNewHobby({ ...newHobby, targetHours: Number(e.target.value) })} />
        </label>
        <label>
          Color
          <input type="color" value={newHobby.color} onChange={(e) => setNewHobby({ ...newHobby, color: e.target.value })} />
        </label>
        <button type="submit" className="primary">
          Add hobby
        </button>
      </form>

      <div className="hobby-grid">
        {data.hobbies.map((hobby) => {
          const progress = blockProgressMinutes(hobby, data.sessions)
          const currentTrack = trackForHobby(data, hobby.id)
          return (
            <article className="card hobby-card" key={hobby.id}>
              <div className="color-dot" style={{ background: hobby.color }} />
              <label>
                Name
                <input value={hobby.name} onChange={(e) => patchHobby(hobby.id, { name: e.target.value })} />
              </label>
              <div className="edit-grid">
                <label>
                  Category
                  <input value={hobby.category} onChange={(e) => patchHobby(hobby.id, { category: e.target.value })} />
                </label>
                <label>
                  Effort
                  <select value={hobby.effort} onChange={(e) => patchHobby(hobby.id, { effort: e.target.value as EffortLevel })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label>
                  Target hours
                  <input type="number" min="1" value={hobby.targetHours} onChange={(e) => patchHobby(hobby.id, { targetHours: Number(e.target.value) })} />
                </label>
                <label>
                  Color
                  <input type="color" value={hobby.color} onChange={(e) => patchHobby(hobby.id, { color: e.target.value })} />
                </label>
                <label>
                  Status
                  <select value={hobby.status} onChange={(e) => patchHobby(hobby.id, { status: e.target.value as Hobby['status'] })}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label>
                  Track
                  <select value={currentTrack?.id ?? ''} onChange={(e) => handleTrackChange(hobby.id, e.target.value)}>
                    {data.tracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <ProgressBar
                color={hobby.color}
                value={progress}
                max={hobby.targetHours * 60}
                label={`${(progress / 60).toFixed(1)}h / ${hobby.targetHours}h this block`}
              />
              <label>
                Notes
                <textarea value={hobby.notes} onChange={(e) => patchHobby(hobby.id, { notes: e.target.value })} />
              </label>
              <ChecklistEditor
                items={hobby.checklist}
                onAdd={(text) => onChange(addChecklistItem(data, hobby.id, text))}
                onToggle={(itemId) => onChange(toggleChecklistItem(data, hobby.id, itemId))}
                onRemove={(itemId) => onChange(removeChecklistItem(data, hobby.id, itemId))}
              />
              <div className="button-row">
                <button type="button" onClick={() => onStart(hobby.id)} disabled={running || hobby.status !== 'active'}>
                  Start
                </button>
                <button type="button" className="ghost danger-text" onClick={() => handleDelete(hobby.id)}>
                  Delete
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
