import { createId } from './seed'
import type { AppData, ChecklistItem, EffortLevel, Hobby } from './types'

export type NewHobbyInput = {
  name: string
  category: string
  effort: EffortLevel
  targetHours: number
  color: string
}

export const createHobby = (data: AppData, input: NewHobbyInput, trackId: string): AppData => {
  const hobby: Hobby = {
    id: createId('hobby'),
    name: input.name.trim(),
    category: input.category.trim() || 'General',
    color: input.color,
    effort: input.effort,
    priority: data.hobbies.length + 1,
    targetHours: Number(input.targetHours) || 1,
    status: 'active',
    notes: '',
    blockStartedAt: null,
    checklist: [],
    rotations: 0,
  }

  return {
    ...data,
    hobbies: [...data.hobbies, hobby],
    tracks: data.tracks.map((track) =>
      track.id === trackId ? { ...track, hobbyIds: [...track.hobbyIds, hobby.id] } : track,
    ),
  }
}

export const updateHobby = (data: AppData, id: string, patch: Partial<Hobby>): AppData => ({
  ...data,
  hobbies: data.hobbies.map((hobby) => (hobby.id === id ? { ...hobby, ...patch } : hobby)),
})

export const deleteHobby = (data: AppData, id: string): AppData => ({
  ...data,
  hobbies: data.hobbies.filter((hobby) => hobby.id !== id),
  tracks: data.tracks.map((track) => ({
    ...track,
    hobbyIds: track.hobbyIds.filter((hobbyId) => hobbyId !== id),
  })),
})

export const archiveHobby = (data: AppData, id: string): AppData =>
  updateHobby(data, id, { status: 'archived' })

export const addChecklistItem = (data: AppData, hobbyId: string, text: string): AppData => {
  const item: ChecklistItem = { id: createId('check'), text: text.trim(), done: false }
  if (!item.text) {
    return data
  }
  return updateHobby(data, hobbyId, {
    checklist: [...(data.hobbies.find((h) => h.id === hobbyId)?.checklist ?? []), item],
  })
}

export const toggleChecklistItem = (data: AppData, hobbyId: string, itemId: string): AppData => {
  const hobby = data.hobbies.find((h) => h.id === hobbyId)
  if (!hobby) {
    return data
  }
  return updateHobby(data, hobbyId, {
    checklist: hobby.checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    ),
  })
}

export const removeChecklistItem = (data: AppData, hobbyId: string, itemId: string): AppData => {
  const hobby = data.hobbies.find((h) => h.id === hobbyId)
  if (!hobby) {
    return data
  }
  return updateHobby(data, hobbyId, {
    checklist: hobby.checklist.filter((item) => item.id !== itemId),
  })
}

export const trackForHobby = (data: AppData, hobbyId: string) =>
  data.tracks.find((track) => track.hobbyIds.includes(hobbyId))
