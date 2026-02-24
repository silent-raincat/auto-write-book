// World View type definitions

export interface WorldViewCategory {
  id: string;
  novel_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryValues {
  novel_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  display_order?: number;
}

export interface WorldViewEntry {
  id: string;
  novel_id: string;
  category_id: string;
  title: string;
  content?: string;
  tags: string[];
  related_entries: string[];
  related_characters: string[];
  metadata: Record<string, any>;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryValues {
  novel_id: string;
  category_id: string;
  title: string;
  content?: string;
  tags?: string[];
  related_entries?: string[];
  related_characters?: string[];
  metadata?: Record<string, any>;
  is_locked?: boolean;
}

export interface MetadataField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'textarea';
  value?: any;
}
