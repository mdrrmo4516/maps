/**
 * Supabase Data Service
 * Handles all data fetching from Supabase backend via the REST API
 */

const API_BASE = '/api';

export interface Panorama {
  id: number;
  name: string;
  description: string;
  image_url: string;
  thumbnail_url: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface MapPage {
  id: number;
  slug: string;
  title: string;
  description: string;
  is_published: boolean;
  layers: any[];
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  created_at: string;
  updated_at: string;
}

export interface MapConfig {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
  created_at: string;
  updated_at: string;
}

export interface SpatialFile {
  id: number;
  filename: string;
  original_name: string;
  file_type: string;
  category: string;
  description: string;
  file_size: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  setting_key: string;
  setting_value: any;
  created_at: string;
  updated_at: string;
}

// Panorama API calls
export const panoramaService = {
  async getAll(): Promise<Panorama[]> {
    const res = await fetch(`${API_BASE}/panoramas`);
    if (!res.ok) throw new Error(`Failed to fetch panoramas: ${res.statusText}`);
    const data = await res.json();
    return data.panoramas || [];
  },

  async getById(id: number): Promise<Panorama> {
    const res = await fetch(`${API_BASE}/panoramas/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch panorama: ${res.statusText}`);
    const data = await res.json();
    return data.panorama;
  },

  async create(panorama: Omit<Panorama, 'id' | 'created_at' | 'updated_at'>): Promise<Panorama> {
    const res = await fetch(`${API_BASE}/panoramas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(panorama),
    });
    if (!res.ok) throw new Error(`Failed to create panorama: ${res.statusText}`);
    const data = await res.json();
    return data.panorama;
  },

  async update(id: number, panorama: Partial<Panorama>): Promise<Panorama> {
    const res = await fetch(`${API_BASE}/panoramas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(panorama),
    });
    if (!res.ok) throw new Error(`Failed to update panorama: ${res.statusText}`);
    const data = await res.json();
    return data.panorama;
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/panoramas/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete panorama: ${res.statusText}`);
  },
};

// Map Pages API calls
export const mapPageService = {
  async getAll(): Promise<MapPage[]> {
    const res = await fetch(`${API_BASE}/map-pages`);
    if (!res.ok) throw new Error(`Failed to fetch map pages: ${res.statusText}`);
    const data = await res.json();
    return data.pages || [];
  },

  async getById(id: number): Promise<MapPage> {
    const res = await fetch(`${API_BASE}/map-pages/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch map page: ${res.statusText}`);
    const data = await res.json();
    return data.page;
  },

  async create(page: Omit<MapPage, 'id' | 'created_at' | 'updated_at'>): Promise<MapPage> {
    const res = await fetch(`${API_BASE}/map-pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page),
    });
    if (!res.ok) throw new Error(`Failed to create map page: ${res.statusText}`);
    const data = await res.json();
    return data.page;
  },

  async update(id: number, page: Partial<MapPage>): Promise<MapPage> {
    const res = await fetch(`${API_BASE}/map-pages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page),
    });
    if (!res.ok) throw new Error(`Failed to update map page: ${res.statusText}`);
    const data = await res.json();
    return data.page;
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/map-pages/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete map page: ${res.statusText}`);
  },
};

// Map Configs API calls
export const mapConfigService = {
  async getAll(): Promise<MapConfig[]> {
    const res = await fetch(`${API_BASE}/map-configs`);
    if (!res.ok) throw new Error(`Failed to fetch map configs: ${res.statusText}`);
    const data = await res.json();
    return data.configs || [];
  },

  async getActive(): Promise<MapConfig | null> {
    const res = await fetch(`${API_BASE}/map-configs/active`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch active map config: ${res.statusText}`);
    const data = await res.json();
    return data.config;
  },

  async create(config: Omit<MapConfig, 'id' | 'created_at' | 'updated_at'>): Promise<MapConfig> {
    const res = await fetch(`${API_BASE}/map-configs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`Failed to create map config: ${res.statusText}`);
    const data = await res.json();
    return data.config;
  },
};

// Spatial Files API calls
export const spatialFileService = {
  async getAll(): Promise<SpatialFile[]> {
    const res = await fetch(`${API_BASE}/spatial-files`);
    if (!res.ok) throw new Error(`Failed to fetch spatial files: ${res.statusText}`);
    const data = await res.json();
    return data.files || [];
  },

  async getById(id: number): Promise<SpatialFile> {
    const res = await fetch(`${API_BASE}/spatial-files/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch spatial file: ${res.statusText}`);
    const data = await res.json();
    return data.file;
  },

  async create(file: Omit<SpatialFile, 'id' | 'created_at' | 'updated_at'>): Promise<SpatialFile> {
    const res = await fetch(`${API_BASE}/spatial-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(file),
    });
    if (!res.ok) throw new Error(`Failed to create spatial file: ${res.statusText}`);
    const data = await res.json();
    return data.file;
  },
};

// Settings API calls
export const settingsService = {
  async getAll(): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error(`Failed to fetch settings: ${res.statusText}`);
    const data = await res.json();
    return data.settings || {};
  },

  async get(key: string): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/${key}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch setting: ${res.statusText}`);
    const data = await res.json();
    return data.setting?.setting_value;
  },

  async set(key: string, value: any): Promise<void> {
    const res = await fetch(`${API_BASE}/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) throw new Error(`Failed to set setting: ${res.statusText}`);
  },
};

// Health check
export const healthService = {
  async check(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async dbInfo(): Promise<{ version: string; tables: string[]; tableCount: number }> {
    const res = await fetch(`${API_BASE}/db-info`);
    if (!res.ok) throw new Error('Failed to fetch db info');
    const data = await res.json();
    return { version: data.version, tables: data.tables, tableCount: data.tableCount };
  },
};
