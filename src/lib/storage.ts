import { invoke } from '@tauri-apps/api/core'
import { initialData } from './seed'
import type { AppData, AppDataV1, Hobby } from './types'

const STORAGE_KEY = 'hobbyflow-data'

const cloneInitialData = (): AppData => structuredClone(initialData)

const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const earliestSessionForHobby = (sessions: AppData['sessions'], hobbyId: string) => {
  const hobbySessions = sessions
    .filter((session) => session.hobbyId === hobbyId)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
  return hobbySessions[0]?.startedAt ?? null
}

const migrateV1ToV2 = (data: AppDataV1): AppData => ({
  ...data,
  schemaVersion: 2,
  settings: {
    ...data.settings,
    accentColor: data.settings.accentColor,
  },
  hobbies: data.hobbies.map(
    (hobby): Hobby => ({
      ...hobby,
      blockStartedAt: earliestSessionForHobby(data.sessions, hobby.id),
      checklist: [],
      rotations: 0,
    }),
  ),
  sessions: data.sessions.map((session) => ({
    ...session,
    source: session.source ?? 'timer',
  })),
})

export const migrateData = (raw: unknown): AppData => {
  const data = raw as AppData | AppDataV1

  if (data.schemaVersion === 2) {
    return data as AppData
  }

  if (data.schemaVersion === 1) {
    return migrateV1ToV2(data as AppDataV1)
  }

  throw new Error('Unsupported data file version.')
}

export async function loadData(): Promise<AppData> {
  if (isTauriRuntime()) {
    const json = await invoke<string | null>('load_app_data')
    if (!json) {
      const seeded = cloneInitialData()
      await saveData(seeded)
      return seeded
    }

    return migrateData(JSON.parse(json))
  }

  const json = window.localStorage.getItem(STORAGE_KEY)
  if (!json) {
    return cloneInitialData()
  }

  return migrateData(JSON.parse(json))
}

export async function saveData(data: AppData): Promise<void> {
  const json = JSON.stringify(data, null, 2)

  if (isTauriRuntime()) {
    await invoke('save_app_data', { json })
    return
  }

  window.localStorage.setItem(STORAGE_KEY, json)
}

export function exportData(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `hobbyflow-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readImportFile(file: File): Promise<AppData> {
  const text = await file.text()
  return migrateData(JSON.parse(text))
}

export function applyTheme(settings: AppData['settings']) {
  document.documentElement.dataset.theme = settings.theme
  if (settings.accentColor) {
    document.documentElement.style.setProperty('--accent', settings.accentColor)
  } else {
    document.documentElement.style.removeProperty('--accent')
  }
}
