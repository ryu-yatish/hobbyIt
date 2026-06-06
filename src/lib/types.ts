export type Theme = 'light' | 'dark'
export type EffortLevel = 'low' | 'medium' | 'high'
export type TrackMode = 'queue' | 'free'

export interface Hobby {
  id: string
  name: string
  category: string
  color: string
  effort: EffortLevel
  priority: number
  targetHours: number
  status: 'active' | 'paused' | 'archived'
  notes: string
}

export interface Track {
  id: string
  name: string
  description: string
  mode: TrackMode
  hobbyIds: string[]
  oneAtATime: boolean
  defaultTargetHours: number
  rotateOnCompletion: boolean
}

export interface Session {
  id: string
  hobbyId: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  mentalLoad: number
  energyBefore: number
  energyAfter: number
  notes: string
}

export interface Allocation {
  id: string
  category: string
  weeklyHours: number
}

export interface AppSettings {
  theme: Theme
  activeTrackId: string
}

export interface AppData {
  schemaVersion: 1
  settings: AppSettings
  hobbies: Hobby[]
  tracks: Track[]
  sessions: Session[]
  allocations: Allocation[]
}

export interface RunningSession {
  hobbyId: string
  startedAt: string
}
