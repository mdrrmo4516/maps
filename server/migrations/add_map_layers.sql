-- Create map_layers table for Interactive Map layer management
CREATE TABLE IF NOT EXISTS map_layers (
  id SERIAL PRIMARY KEY,
  layer_name VARCHAR(255) NOT NULL,
  description TEXT,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('kml', 'csv', 'json', 'geojson')),
  file_data JSONB NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INTEGER,
  layer_color VARCHAR(20) DEFAULT '#3b82f6',
  is_visible BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  config_id INTEGER REFERENCES interactive_map_configs(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_map_layers_config_id ON map_layers(config_id);
CREATE INDEX IF NOT EXISTS idx_map_layers_is_active ON map_layers(is_active);

-- Enable RLS
ALTER TABLE map_layers ENABLE ROW LEVEL SECURITY;

-- Public read for active layers, authenticated write
DROP POLICY IF EXISTS "map_layers_public_read" ON map_layers;
CREATE POLICY "map_layers_public_read" ON map_layers
  FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "map_layers_auth_write" ON map_layers;
CREATE POLICY "map_layers_auth_write" ON map_layers
  FOR ALL USING (auth.role() = 'authenticated');