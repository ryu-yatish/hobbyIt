import { invoke } from '@tauri-apps/api/core'
import { initialData } from './seed'
import type { AppData } from './types'

const STORAGE_KEY = 'hobbyflow-data'

const cloneInitialData = (): AppData => structuredClone(initialData)

const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const normalizeData = (data: AppData): AppData => {
  if (data.schemaVersion !== 1) {
    throw new Error('Unsupported data file version.')
  }

  return data
}

export async function loadData(): Promise<AppData> {
  if (isTauriRuntime()) {
    const json = await invoke<string | null>('load_app_data')
    if (!json) {
      const seeded = cloneInitialData()
      await saveData(seeded)
      return seeded
    }

    return normalizeData(JSON.parse(json) as AppData)
  }

  const json = window.localStorage.getItem(STORAGE_KEY)
  if (!json) {
    return cloneInitialData()
  }

  return normalizeData(JSON.parse(json) as AppData)
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
  return normalizeData(JSON.parse(text) as AppData)
}
