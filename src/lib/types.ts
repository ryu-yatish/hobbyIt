export type Theme = 'light' | 'dark' | 'warm' | 'ocean' | 'forest' | 'mono'
export type EffortLevel = 'low' | 'medium' | 'high'
export type TrackMode = 'queue' | 'free'
export type SessionSource = 'timer' | 'manual'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

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
  blockStartedAt: string | null
  checklist: ChecklistItem[]
  rotations: number
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
  source?: SessionSource
}

export interface Allocation {
  id: string
  category: string
  weeklyHours: number
}

export interface AppSettings {
  theme: Theme
  activeTrackId: string
  accentColor?: string
}

export interface AppData {
  schemaVersion: 2
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

export type AppDataV1 = Omit<AppData, 'schemaVersion' | 'hobbies' | 'settings'> & {
  schemaVersion: 1
  settings: Omit<AppSettings, 'accentColor'> & { accentColor?: string }
  hobbies: Array<Omit<Hobby, 'blockStartedAt' | 'checklist' | 'rotations'>>
}
