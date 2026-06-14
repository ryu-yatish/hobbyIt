import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  MAX_TRACKS,
  assignHobbyToTrack,
  canCreateTrack,
  createTrack,
  deleteTrack,
  getQueueHobbies,
  hobbiesNotOnTrack,
  moveInTrack,
  updateTrack,
  type TrackInput,
} from '../lib/tracks'
import type { AppData, TrackMode } from '../lib/types'

type TracksViewProps = {
  data: AppData
  onChange: (data: AppData) => void
}

const defaultTrackInput = (): TrackInput => ({
  name: '',
  description: '',
  mode: 'queue',
  oneAtATime: true,
  defaultTargetHours: 4,
  rotateOnCompletion: true,
})

export function TracksView({ data, onChange }: TracksViewProps) {
  const [newTrack, setNewTrack] = useState(defaultTrackInput)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    try {
      onChange(createTrack(data, newTrack))
      setNewTrack(defaultTrackInput())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDelete = (trackId: string) => {
    if (!window.confirm('Delete this track? Hobbies will move to the first remaining track.')) {
      return
    }
    try {
      onChange(deleteTrack(data, trackId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section className="stack">
      <form className="card form-stack track-form" onSubmit={handleCreate}>
        <div className="section-title">
          <div>
            <p className="eyebrow">Tracks</p>
            <h2>
              {data.tracks.length} / {MAX_TRACKS} tracks
            </h2>
          </div>
        </div>
        {error && <p className="alert-inline">{error}</p>}
        <div className="edit-grid">
          <label>
            Name
            <input value={newTrack.name} onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })} placeholder="e.g. Deep work" />
          </label>
          <label>
            Mode
            <select value={newTrack.mode} onChange={(e) => setNewTrack({ ...newTrack, mode: e.target.value as TrackMode })}>
              <option value="queue">Queue</option>
              <option value="free">Free</option>
            </select>
          </label>
          <label>
            Default target hours
            <input type="number" min="1" value={newTrack.defaultTargetHours} onChange={(e) => setNewTrack({ ...newTrack, defaultTargetHours: Number(e.target.value) })} />
          </label>
        </div>
        <label>
          Description
          <textarea value={newTrack.description} onChange={(e) => setNewTrack({ ...newTrack, description: e.target.value })} />
        </label>
        <div className="toggle-row">
          <label className="inline-check">
            <input type="checkbox" checked={newTrack.oneAtATime} onChange={(e) => setNewTrack({ ...newTrack, oneAtATime: e.target.checked })} />
            One at a time
          </label>
          <label className="inline-check">
            <input type="checkbox" checked={newTrack.rotateOnCompletion} onChange={(e) => setNewTrack({ ...newTrack, rotateOnCompletion: e.target.checked })} />
            Rotate on completion
          </label>
        </div>
        <button type="submit" className="primary" disabled={!canCreateTrack(data)}>
          Create track
        </button>
      </form>

      <div className="track-grid">
        {data.tracks.map((track) => (
          <article className="card" key={track.id}>
            <div className="section-title">
              <div>
                <p className="eyebrow">{track.mode === 'queue' ? 'Queue track' : 'Free track'}</p>
                <input
                  className="track-name-input"
                  value={track.name}
                  onChange={(e) => onChange(updateTrack(data, track.id, { name: e.target.value }))}
                />
              </div>
              <button type="button" className="ghost" onClick={() => onChange({ ...data, settings: { ...data.settings, activeTrackId: track.id } })}>
                Make active
              </button>
            </div>
            <label>
              Description
              <textarea value={track.description} onChange={(e) => onChange(updateTrack(data, track.id, { description: e.target.value }))} />
            </label>
            <div className="edit-grid">
              <label>
                Mode
                <select value={track.mode} onChange={(e) => onChange(updateTrack(data, track.id, { mode: e.target.value as TrackMode }))}>
                  <option value="queue">Queue</option>
                  <option value="free">Free</option>
                </select>
              </label>
              <label>
                Default target hours
                <input type="number" min="1" value={track.defaultTargetHours} onChange={(e) => onChange(updateTrack(data, track.id, { defaultTargetHours: Number(e.target.value) }))} />
              </label>
            </div>
            <div className="toggle-row">
              <label className="inline-check">
                <input type="checkbox" checked={track.oneAtATime} onChange={(e) => onChange(updateTrack(data, track.id, { oneAtATime: e.target.checked }))} />
                One at a time
              </label>
              <label className="inline-check">
                <input type="checkbox" checked={track.rotateOnCompletion} onChange={(e) => onChange(updateTrack(data, track.id, { rotateOnCompletion: e.target.checked }))} />
                Rotate on completion
              </label>
            </div>

            <label>
              Add hobby to track
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    onChange(assignHobbyToTrack(data, e.target.value, track.id))
                    e.target.value = ''
                  }
                }}
              >
                <option value="">Select hobby...</option>
                {hobbiesNotOnTrack(data, track.id).map((hobby) => (
                  <option key={hobby.id} value={hobby.id}>
                    {hobby.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="queue-list compact">
              {getQueueHobbies(data, track).map((hobby, index) => (
                <div className="queue-item" key={hobby.id}>
                  <span className="queue-rank">{index + 1}</span>
                  <span className="color-dot" style={{ background: hobby.color }} />
                  <strong>{hobby.name}</strong>
                  <div className="move-buttons">
                    <button type="button" onClick={() => onChange(moveInTrack(data, track.id, hobby.id, -1))}>
                      Up
                    </button>
                    <button type="button" onClick={() => onChange(moveInTrack(data, track.id, hobby.id, 1))}>
                      Down
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="button-row">
              <button type="button" className="ghost danger-text" disabled={data.tracks.length <= 1} onClick={() => handleDelete(track.id)}>
                Delete track
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
