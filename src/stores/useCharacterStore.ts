import { create } from 'zustand'
import type {
  Character,
  CharacterRelationship,
  CharacterState,
  CharacterArc,
  CreateRelationshipValues,
  CreateCharacterStateValues,
  GraphData,
} from '../types/character'
import { api } from '../lib/api'

interface CharacterStoreState {
  // State
  characters: Character[]
  relationships: CharacterRelationship[]
  selectedCharacter: Character | null
  selectedNovel: string | null
  graphData: GraphData | null
  characterArc: CharacterArc | null
  loading: boolean
  error: string | null

  // Actions - Characters
  fetchCharacters: (novelId: string) => Promise<void>
  setSelectedCharacter: (character: Character | null) => void
  setSelectedNovel: (novelId: string | null) => void

  // Actions - Relationships
  fetchRelationships: (novelId: string) => Promise<void>
  fetchGraphData: (novelId: string) => Promise<void>
  createRelationship: (data: CreateRelationshipValues) => Promise<void>
  updateRelationship: (id: string, data: Partial<CharacterRelationship>) => Promise<void>
  deleteRelationship: (id: string) => Promise<void>

  // Actions - Character States (Arc)
  fetchCharacterArc: (characterId: string) => Promise<void>
  createCharacterState: (data: CreateCharacterStateValues) => Promise<void>
  updateCharacterState: (id: string, data: Partial<CharacterState>) => Promise<void>
  deleteCharacterState: (id: string) => Promise<void>
}

export const useCharacterStore = create<CharacterStoreState>((set, get) => ({
  // Initial state
  characters: [],
  relationships: [],
  selectedCharacter: null,
  selectedNovel: null,
  graphData: null,
  characterArc: null,
  loading: false,
  error: null,

  // Character actions
  fetchCharacters: async (novelId: string) => {
    set({ loading: true, error: null })
    try {
      const data = await api.get<Character[]>(`/characters?novel_id=${novelId}`)
      set({ characters: data, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  setSelectedCharacter: (character: Character | null) => {
    set({ selectedCharacter: character })
  },

  setSelectedNovel: (novelId: string | null) => {
    set({ selectedNovel: novelId })
  },

  // Relationship actions
  fetchRelationships: async (novelId: string) => {
    set({ loading: true, error: null })
    try {
      const data = await api.get<CharacterRelationship[]>(`/character-relationships?novel_id=${novelId}`)
      set({ relationships: data, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchGraphData: async (novelId: string) => {
    set({ loading: true, error: null })
    try {
      const data = await api.get<GraphData>(`/character-relationships/graph/${novelId}`)
      set({ graphData: data, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createRelationship: async (data: CreateRelationshipValues) => {
    set({ loading: true, error: null })
    try {
      const newRelationship = await api.post<CharacterRelationship>('/character-relationships', data)
      set(state => ({
        relationships: [...state.relationships, newRelationship],
        loading: false
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateRelationship: async (id: string, data: Partial<CharacterRelationship>) => {
    set({ loading: true, error: null })
    try {
      const updated = await api.put<CharacterRelationship>(`/character-relationships/${id}`, data)
      set(state => ({
        relationships: state.relationships.map(r => r.id === id ? updated : r),
        loading: false
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deleteRelationship: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/character-relationships/${id}`)
      set(state => ({
        relationships: state.relationships.filter(r => r.id !== id),
        loading: false
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  // Character State (Arc) actions
  fetchCharacterArc: async (characterId: string) => {
    set({ loading: true, error: null })
    try {
      const data = await api.get<CharacterArc>(`/character-states/arc/${characterId}`)
      set({ characterArc: data, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createCharacterState: async (data: CreateCharacterStateValues) => {
    set({ loading: true, error: null })
    try {
      await api.post<CharacterState>('/character-states', data)
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateCharacterState: async (id: string, data: Partial<CharacterState>) => {
    set({ loading: true, error: null })
    try {
      await api.put<CharacterState>(`/character-states/${id}`, data)
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deleteCharacterState: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/character-states/${id}`)
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },
}))
