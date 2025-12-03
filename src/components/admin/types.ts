export interface Page {
  id: number;
  type: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MapPage {
  id: number;
  slug: string;
  title: string;
  description: string;
  is_published: boolean;
  layers: string[];
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

export interface DBInfo {
  version: string;
  tables: string[];
  tableCount: number;
}

export interface AppSettings {
  theme?: { mode: string; primaryColor: string; accentColor: string };
  app_config?: { appName: string; offlineSync: boolean };
  roles?: { admin: string[]; editor: string[]; viewer: string[] };
}

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

export interface MapConfig {
  id: number;
  config_name: string;
  description: string;
  default_center_lat: number;
  default_center_lng: number;
  default_zoom: number;
  max_zoom: number;
  min_zoom: number;
  tile_layer_url: string;
  tile_layer_attribution: string;
  enable_location_marker: boolean;
  enable_reference_circle: boolean;
  reference_circle_radius: number;
  reference_circle_color: string;
  allowed_file_types: string[];
  max_file_size_mb: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SidebarButton {
  id: number;
  button_id: string;
  label: string;
  folder_id: string;
  source_type: 'drive' | 'photos';
  is_enabled: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface MapLayer {
  id: number;
  layer_name: string;
  description: string;
  file_type: 'kml' | 'csv' | 'json' | 'geojson';
  file_data: any;
  original_filename: string;
  file_size: number;
  layer_color: string;
  is_visible: boolean;
  is_active: boolean;
  display_order: number;
  config_id: number | null;
  created_at: string;
  updated_at: string;
}

export type Tab =
  | "pages"
  | "database"
  | "settings"
  | "rbac"
  | "sidebar"
  | "panoramas"
  | "map_config";

export type PagesSubTab = "system" | "map";

export interface MapPageFormData {
  slug: string;
  title: string;
  description: string;
  is_published: boolean;
  layers: string[];
  center_lat: number;
  center_lng: number;
  zoom_level: number;
}

export interface PanoramaFormData {
  name: string;
  description: string;
  image_url: string;
  thumbnail_url: string;
  is_active: boolean;
  order_index: number;
}

export interface MapConfigFormData {
  config_name: string;
  description: string;
  default_center_lat: number;
  default_center_lng: number;
  default_zoom: number;
  max_zoom: number;
  min_zoom: number;
  tile_layer_url: string;
  tile_layer_attribution: string;
  enable_location_marker: boolean;
  enable_reference_circle: boolean;
  reference_circle_radius: number;
  reference_circle_color: string;
  allowed_file_types: string[];
  max_file_size_mb: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SidebarButtonFormData {
  button_id: string;
  label: string;
  folder_id: string;
  source_type: 'drive' | 'photos';
  is_enabled: boolean;
  order_index: number;
}

export interface MapLayerFormData {
  layer_name: string;
  description: string;
  file_type: 'kml' | 'csv' | 'json' | 'geojson';
  file_data: any;
  original_filename: string;
  file_size: number;
  layer_color: string;
  is_visible: boolean;
  is_active: boolean;
  display_order: number;
  config_id: number | null;
}
