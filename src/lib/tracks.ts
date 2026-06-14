import { createId } from './seed'
import type { AppData, Track, TrackMode } from './types'

export const MAX_TRACKS = 5

export type TrackInput = {
  name: string
  description: string
  mode: TrackMode
  oneAtATime: boolean
  defaultTargetHours: number
  rotateOnCompletion: boolean
}

export const canCreateTrack = (data: AppData) => data.tracks.length < MAX_TRACKS

export const createTrack = (data: AppData, input: TrackInput): AppData => {
  if (!canCreateTrack(data)) {
    throw new Error(`Maximum of ${MAX_TRACKS} tracks allowed.`)
  }

  const track: Track = {
    id: createId('track'),
    name: input.name.trim() || 'New track',
    description: input.description.trim(),
    mode: input.mode,
    hobbyIds: [],
    oneAtATime: input.oneAtATime,
    defaultTargetHours: input.defaultTargetHours || 4,
    rotateOnCompletion: input.rotateOnCompletion,
  }

  return { ...data, tracks: [...data.tracks, track] }
}

export const updateTrack = (data: AppData, trackId: string, patch: Partial<Track>): AppData => ({
  ...data,
  tracks: data.tracks.map((track) => (track.id === trackId ? { ...track, ...patch } : track)),
})

export const deleteTrack = (data: AppData, trackId: string): AppData => {
  if (data.tracks.length <= 1) {
    throw new Error('At least one track is required.')
  }

  const track = data.tracks.find((item) => item.id === trackId)
  if (!track) {
    return data
  }

  const remaining = data.tracks.filter((item) => item.id !== trackId)
  const fallback = remaining[0]
  const orphanIds = track.hobbyIds

  return {
    ...data,
    tracks: remaining.map((item, index) =>
      index === 0 ? { ...item, hobbyIds: [...new Set([...item.hobbyIds, ...orphanIds])] } : item,
    ),
    settings: {
      ...data.settings,
      activeTrackId:
        data.settings.activeTrackId === trackId ? fallback.id : data.settings.activeTrackId,
    },
  }
}

export const assignHobbyToTrack = (data: AppData, hobbyId: string, trackId: string): AppData => ({
  ...data,
  tracks: data.tracks.map((track) => {
    const without = track.hobbyIds.filter((id) => id !== hobbyId)
    if (track.id === trackId) {
      return track.hobbyIds.includes(hobbyId) ? track : { ...track, hobbyIds: [...without, hobbyId] }
    }
    return { ...track, hobbyIds: without }
  }),
})

export const moveInTrack = (data: AppData, trackId: string, hobbyId: string, direction: -1 | 1): AppData => ({
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

export const getQueueHobbies = (data: AppData, track: Track) =>
  track.hobbyIds
    .map((id) => data.hobbies.find((hobby) => hobby.id === id))
    .filter((hobby): hobby is NonNullable<typeof hobby> => hobby !== undefined && hobby.status === 'active')

export const hobbiesNotOnTrack = (data: AppData, trackId: string) => {
  const track = data.tracks.find((item) => item.id === trackId)
  if (!track) {
    return []
  }
  return data.hobbies.filter((hobby) => !track.hobbyIds.includes(hobby.id))
}
