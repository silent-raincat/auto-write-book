import { create } from 'zustand'
import type {
  WorldViewCategory,
  WorldViewEntry,
  CreateCategoryValues,
  CreateEntryValues,
} from '../types/worldview'
import { api } from '../lib/api'

interface WorldViewState {
  // State
  categories: WorldViewCategory[]
  entries: WorldViewEntry[]
  selectedCategory: string | null
  selectedEntry: WorldViewEntry | null
  selectedNovel: string | null
  loading: boolean
  error: string | null

  // Actions - Categories
  fetchCategories: (novelId: string) => Promise<void>
  createCategory: (data: CreateCategoryValues) => Promise<void>
  updateCategory: (id: string, data: Partial<WorldViewCategory>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  reorderCategories: (categories: Array<{ id: string }>) => Promise<void>
  setSelectedCategory: (categoryId: string | null) => void

  // Actions - Entries
  fetchEntries: (novelId: string, categoryId?: string) => Promise<void>
  searchEntries: (novelId: string, query: string) => Promise<void>
  createEntry: (data: CreateEntryValues) => Promise<void>
  updateEntry: (id: string, data: Partial<WorldViewEntry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  setSelectedEntry: (entry: WorldViewEntry | null) => void
  setSelectedNovel: (novelId: string | null) => void
}

export const useWorldViewStore = create<WorldViewState>((set, get) => ({
  // Initial state
  categories: [],
  entries: [],
  selectedCategory: null,
  selectedEntry: null,
  selectedNovel: null,
  loading: false,
  error: null,

  // Category actions
  fetchCategories: async (novelId: string) => {
    set({ loading: true, error: null })
    try {
      const data = await api.get<WorldViewCategory[]>(`/worldview-categories?novel_id=${novelId}`)
      set({ categories: data, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createCategory: async (data: CreateCategoryValues) => {
    set({ loading: true, error: null })
    try {
      const newCategory = await api.post<WorldViewCategory>('/worldview-categories', data)
      set(state => ({
        categories: [...state.categories, newCategory],
        loading: false
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateCategory: async (id: string, data: Partial<WorldViewCategory>) => {
    set({ loading: true, error: null })
    try {
      const updated = await api.put<WorldViewCategory>(`/worldview-categories/${id}`, data)
      set(state => ({
        categories: state.categories.map(c => c.id === id ? updated : c),
        loading: false
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deleteCategory: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/worldview-categories/${id}`)
      set(state => ({
        categories: state.categories.filter(c => c.id !== id),
        entries: state.entries.filter(e => e.category_id !== id),
        loading: false
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  reorderCategories: async (categories: Array<{ id: string }>) => {
    set({ loading: true, error: null })
    try {
      await api.put('/worldview-categories/reorder', { categories })
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  setSelectedCategory: (categoryId: string | null) => {
    set({ selectedCategory: categoryId })
  },

  // Entry actions
  fetchEntries: async (novelId: string, categoryId?: string) => {
    set({ loading: true, error: null })
    try {
      let url = `/worldview-entries?novel_id=${novelId}`
      if (categoryId) {
        url += `&category_id=${categoryId}`
      }
      const data = await api.get<WorldViewEntry[]>(url)
      set({ entries: data, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  searchEntries: async (novelId: string, query: string) => {
    set({ loading: true, error: null })
    try {
      const data = await api.get<WorldViewEntry[]>(`/worldview-entries/search/${novelId}?q=${encodeURIComponent(query)}`)
      set({ entries: data, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createEntry: async (data: CreateEntryValues) => {
    set({ loading: true, error: null })
    try {
      const newEntry = await api.post<WorldViewEntry>('/worldview-entries', data)
      set(state => ({
        entries: [...state.entries, newEntry],
        loading: false
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateEntry: async (id: string, data: Partial<WorldViewEntry>) => {
    set({ loading: true, error: null })
    try {
      const updated = await api.put<WorldViewEntry>(`/worldview-entries/${id}`, data)
      set(state => ({
        entries: state.entries.map(e => e.id === id ? updated : e),
        selectedEntry: state.selectedEntry?.id === id ? updated : state.selectedEntry,
        loading: false
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deleteEntry: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/worldview-entries/${id}`)
      set(state => ({
        entries: state.entries.filter(e => e.id !== id),
        selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
        loading: false
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  setSelectedEntry: (entry: WorldViewEntry | null) => {
    set({ selectedEntry: entry })
  },

  setSelectedNovel: (novelId: string | null) => {
    set({ selectedNovel: novelId })
  },
}))
