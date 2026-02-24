// Character type definitions

export interface Character {
  id: string;
  novel_id: string;
  name: string;
  age?: number;
  gender?: string;
  personality?: string;
  background?: string;
  appearance?: string;
  relationships?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCharacterValues {
  novel_id: string;
  name: string;
  age?: number;
  gender?: string;
  personality?: string;
  background?: string;
  appearance?: string;
  relationships?: string;
}

// Character Relationship types
export interface CharacterRelationship {
  id: string;
  novel_id: string;
  character_id: string;
  related_character_id: string;
  relationship_type: string;
  relationship_description?: string;
  intensity: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export type RelationshipType =
  | 'friend'
  | 'enemy'
  | 'family'
  | 'lover'
  | 'mentor'
  | 'rival'
  | 'ally'
  | 'stranger'
  | 'other';

export type RelationshipStatus = 'active' | 'estranged' | 'deceased' | 'complicated';

export interface CreateRelationshipValues {
  novel_id: string;
  character_id: string;
  related_character_id: string;
  relationship_type: string;
  relationship_description?: string;
  intensity?: number;
  status?: string;
}

// Graph visualization types
export interface GraphNode {
  id: string;
  name: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  intensity: number;
  status?: string;
  description?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Character State types (for character arc)
export interface CharacterState {
  id: string;
  novel_id: string;
  character_id: string;
  chapter_id?: string;
  state_type: 'emotion' | 'motivation' | 'condition' | 'goal';
  state_name: string;
  state_value?: string;
  importance: number;
  created_at: string;
}

export interface CreateCharacterStateValues {
  novel_id: string;
  character_id: string;
  chapter_id?: string;
  state_type: 'emotion' | 'motivation' | 'condition' | 'goal';
  state_name: string;
  state_value?: string;
  importance?: number;
}

export interface CharacterArc {
  character_id: string;
  character_name: string;
  arc: CharacterArcChapter[];
}

export interface CharacterArcChapter {
  chapter_number: number;
  chapter_title: string;
  states: CharacterArcState[];
}

export interface CharacterArcState {
  id: string;
  type: string;
  name: string;
  value?: string;
  importance: number;
}
