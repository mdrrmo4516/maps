import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  X, 
  Layers, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Trash2, 
  Eye, 
  EyeOff, 
  MapPin, 
  Download,
  RotateCcw,
  Info,
  FileText,
  Minus,
  Plus
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for missing marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Layer {
  id: string;
  name: string;
  layer: L.LayerGroup;
  visible: boolean;
  color: string;
  fileName: string;
  type: 'kml' | 'csv';
}

interface MapConfig {
  id: number;
  config_name: string;
  description: string;
  default_center_lat: number;
  default_center_lng: number;
  default_zoom: number;
  min_zoom: number;
  max_zoom: number;
  reference_circle_radius: number;
  reference_circle_color: string;
  max_file_size_mb: number;
  tile_layer_url: string;
  enable_location_marker: boolean;
  enable_reference_circle: boolean;
  is_active: boolean;
  allowed_file_types: string[];
}

interface MapLayer {
  id: number;
  layer_name: string;
  description: string;
  file_type: string;
  file_data: any;
  original_filename: string;
  file_size: number;
  layer_color: string;
  is_visible: boolean;
  is_active: boolean;
  display_order: number;
  config_id: number;
}

interface InteractiveMapProps {
  mapConfigs?: MapConfig[];
  activeConfigId?: number | null;
  mapLayers?: MapLayer[];
  onLayerUpdate?: (layer: MapLayer) => void;
}

// CSV Data
const csvData = `WKT,name,description
"POINT (123.446605 13.03076)",SLTCFPDI,"SCHOOL (Private) 

FID 0 
Id 1 
Evac_Code
EvacCenter SLTCFPDI 
Location 0 
Capacity 190 
Category SCHOOL
Latitude 13.03076 
Longitude 123.446605"
"POINT (123.450466 13.037648)",West Coast College,"SCHOOL (Private) 

FID 1 
Id 2 
Evac_Code 
EvacCenter West Coast College 
Location 0 
Capacity 250 
Category 0 
Latitude 13.037648 
Longitude 123.450466"
"POINT (123.459913 13.066302)",PDNHS,"SCHOOL (Public) 

FID 2 
Id 3 
Evac_Code 
EvacCenter Pio Duran National High School 
Location 0 
Capacity 200 
Category 0 
Latitude 13.066302 
Longitude 123.459913"
"POINT (123.458171 13.061385)",Binodegahan ES,"SCHOOL (Public) 

FID 3 
Id 4 
Evac_Code 
EvacCenter Binodegahan Elementary School 
Location 0 
Capacity 200 
Category 0 
Latitude 13.061385 
Longitude 123.458171"
"POINT (123.45316 13.044291)",SLA,"SCHOOL (Public) 

FID 4 
Id 5 
Evac_Code 
EvacCenter San Lorenzo Academy 
Location 0 
Capacity 200 
Category 0 
Latitude 13.044291 
Longitude 123.45316"
"POINT (123.457286 13.044403)",PECS,"SCHOOL (Public) 

FID 5 
Id 6 
Evac_Code 
EvacCenter Pio Duran East Central School 
Location 0 
Capacity 250 
Category 0 
Latitude 13.044403 
Longitude 123.457286"
"POINT (123.444675 13.047211)",BINODEGAHAN ES,"SCHOOL (Public) 

FID 6 
Id 7 
Evac_Code 
EvacCenter La Medalla Elementary School 
Location 0 
Capacity 140 
Category 0 
Latitude 13.047211 
Longitude 123.444675"
"POINT (123.514811 13.067618)",SUKIP ES,"SCHOOL (Public) 

FID 7 
Id 8 
Evac_Code 
EvacCenter Sukip Elementary School 
Location 0 
Capacity 80 
Category 0 
Latitude 13.067618 
Longitude 123.514811"
"POINT (123.490586 13.072097)",MALAPAY HS,"SCHOOL (Public) 

FID 8 
Id 9 
Evac_Code 
EvacCenter Malapay Elementary School 
Location 0 
Capacity 125 
Category 0 
Latitude 13.072097 
Longitude 123.490586"
"POINT (123.461864 13.086464)",AGOL ES,"SCHOOL (Public)

FID 9 
Id 10 
Evac_Code 
EvacCenter Agol Elementary School 
Location 0 
Capacity 100 
Category 0 
Latitude 13.086464 
Longitude 123.461864"
"POINT (123.500205 13.026739)",MAMLAD ES,"SCHOOL (Public) 

FID 10 
Id 11 
Evac_Code 
EvacCenter Mamlad Elementary School 
Location 0 
Capacity 100 
Category 0 
Latitude 13.026739 
Longitude 123.500205"
"POINT (123.485698 13.050347)",ALABANGPURO HS,"SCHOOL (Public) 

FID 11 
Id 12 
Evac_Code 
EvacCenter Alabangpuro Elementary School 
Location 0 
Capacity 100 
Category 0 
Latitude 13.049767 
Longitude 123.485905"
"POINT (123.404682 13.047222)",BASICAO COASTAL ES,"SCHOOL (Public) 

FID 12 
Id 13 
Evac_Code 
EvacCenter Basicao Coastal Elementary School 
Location 0 
Capacity 120 
Category 0 
Latitude 13.047222 
Longitude 123.404682"
"POINT (123.511542 13.040754)",RAWIS ES,"SCHOOL (Public) 

FID 13 
Id 14 
Evac_Code 
EvacCenter Rawis Elementary School 
Location 0 
Capacity 90 
Category 0 
Latitude 13.040754 
Longitude 123.511542"
"POINT (123.496518 13.05592)",MACASITAS ES,"SCHOOL (Public) 

FID 14 
Id 15 
Evac_Code 
EvacCenter Macasitas Elementary School 
Location 0 
Capacity 80 
Category 0 
Latitude 13.05592 
Longitude 123.496518"
"POINT (123.505548 13.083624)",Salvacion ES,"SCHOOL (Public) 

FID 15 
Id 16 
Evac_Code 
EvacCenter Salvacion Elementary School 
Location 0 
Capacity 70 
Category 0 
Latitude 13.083624 
Longitude 123.505548"
"POINT (123.491935 13.102897)",Tibabo ES,"SCHOOL (Public) 

FID 16 
Id 17 
Evac_Code 
EvacCenter Tibabo Elementary School 
Location 0 
Capacity 140 
Category 0 
Latitude 13.102897 
Longitude 123.491935"
"POINT (123.410157 13.087033)",Panganiran ES,"SCHOOL (Public) 

FID 17 
Id 18 
Evac_Code 
EvacCenter Panganiran Elementary School 
Location 0 
Capacity 150 
Category 0 
Latitude 13.087033 
Longitude 123.410157"
"POINT (123.529638 13.050375)",Buyo ES,"SCHOOL (Public) 

FID 18 
Id 19 
Evac_Code 
EvacCenter Buyo Elementary School 
Location 0 
Capacity 55 
Category 0 
Latitude 13.050375 
Longitude 123.529638"
"POINT (123.476396 13.059784)",Nablangbulod ES,"SCHOOL (Public) 

FID 19 
Id 20 
Evac_Code 
EvacCenter Nablangbulod Elementary School 
Location 0 
Capacity 55 
Category 0 
Latitude 13.059784 
Longitude 123.476396"
"POINT (123.439386 13.091788)",Flores ES,"SCHOOL (Public) 

FID 20 
Id 21 
Evac_Code 
EvacCenter Flores Elementary School 
Location 0 
Capacity 80 
Category 0 
Latitude 13.091788 
Longitude 123.439386"
"POINT (123.487848 13.080943)",Basicao Interior ES,"SCHOOL (Public) 

FID 21 
Id 22 
Evac_Code 
EvacCenter Basicao Interior Elementary School 
Location 0 
Capacity 80 
Category 0 
Latitude 13.080943 
Longitude 123.487848"
"POINT (123.469715 13.111998)",Palapas ES,"SCHOOL (Public) 

FID 22 
Id 23 
Evac_Code 
EvacCenter Palapas Elementary School 
Location 0 
Capacity 80 
Category 0 
Latitude 13.111998 
Longitude 123.469715"
"POINT (123.491552 13.011444)",Lawinon ES,"SCHOOL (Public) 

FID 23 
Id 24 
Evac_Code 
EvacCenter Lawinon Elementary School 
Location 0 
Capacity 70 
Category 0 
Latitude 13.011444 
Longitude 123.491552"
"POINT (123.532203 13.077718)",Matanglad ES,"SCHOOL (Public) 

FID 24 
Id 25 
Evac_Code 
EvacCenter Matanglad Elementary School 
Location 0 
Capacity 80 
Category 0 
Latitude 13.077718 
Longitude 123.532203"
"POINT (123.480805 12.989386)",Buenavista EC,"SCHOOL (Public) 

FID 25 
Id 26 
Evac_Code 
EvacCenter Buenavista Evac. Center 
Location 0 
Capacity 120 
Category 0 
Latitude 12.989386 
Longitude 123.480805"
"POINT (123.465327 13.109744)",Sitio Papantayan,"SCHOOL (Public) 

FID 26 
Id 27 
Evac_Code 
EvacCenter Sitio Papantayan (Palapas) DDC 
Location 0 
Capacity 100 
Category 0 
Latitude 13.109744 
Longitude 123.458335"
"POINT (123.453052 13.043625)",Caratagan BH,"SCHOOL (Public) 

FID 27 
Id 28 
Evac_Code 
EvacCenter Caratagan Barangay Hall 
Location 0 
Capacity 30 
Category 0 
Latitude 13.043625 
Longitude 123.453052"
"POINT (123.455219 13.046383)",Seventh Day Adventist,"SCHOOL (Public) 

FID 28 
Id 29 
Evac_Code 
EvacCenter Seventh Day Adventist Church 
Location 0 
Capacity 70 
Category 0 
Latitude 13.046383 
Longitude 123.455219"
"POINT (123.453556 13.043838)",Mormons,"SCHOOL (Public) 

FID 29 
Id 30 
Evac_Code 
EvacCenter Mormons 
Location 0 
Capacity 60 
Category 0 
Latitude 13.043838 
Longitude 123.453556"
"POINT (123.446361 13.028495)",Our Lady Of Salvation,"SCHOOL (Public) 

FID 30 
Id 31 
Evac_Code 
EvacCenter Our Lady Of Salvation Parish Church 
Location 0 
Capacity 50 
Category 0 
Latitude 13.028495 
Longitude 123.446361"
"POINT (123.517172 13.066563)",Sukip Day Care,"SCHOOL (Public) 

FID 31 
Id 32 
Evac_Code 
EvacCenter Sukip Day Care Center 
Location 0 
Capacity 20 
Category 0 
Latitude 13.066563 
Longitude 123.517172"
"POINT (123.517455 13.066594)",Sukip BH,"SCHOOL (Public) 

FID 32 
Id 33 
Evac_Code 
EvacCenter Sukip Barangay Hall 
Location 0 
Capacity 45 
Category 0 
Latitude 13.066594 
Longitude 123.517455"
"POINT (123.404362 13.046048)",Basicao Coastal Day Care,"SCHOOL (Public) 

FID 33 
Id 34 
Evac_Code 
EvacCenter Basicao Coastal Day Care Center 
Location 0 
Capacity 20 
Category 0 
Latitude 13.046048 
Longitude 123.404362"
"POINT (123.495147 13.056612)",Macasitas Day care,"SCHOOL (Public) 

FID 34 
Id 35 
Evac_Code 
EvacCenter Macasitas Day care 
Location 0 
Capacity 35 
Category 0 
Latitude 13.056612 
Longitude 123.495147"
"POINT (123.456376 13.044222)",Municipal Multi-Purpose Hall,"SCHOOL (Public) 

FID 35 
Id 36 
Evac_Code 
EvacCenter Municipal Multi-Purpose Hall 
Location 0 
Capacity 120 
Category 0 
Latitude 13.044222 
Longitude 123.456376"
"POINT (123.44409 13.047189)",La Medalla Day Care,"SCHOOL (Public) 

FID 36 
Id 37 
Evac_Code 
EvacCenter La Medalla Day Care 
Location 0 
Capacity 36 
Category 0 
Latitude 13.047189 
Longitude 123.44409"`;

// Parse CSV data
const parseCSV = (csv: string) => {
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = lines[i].split(',');
    const obj: any = {};
    
    for (let j = 0; j < headers.length; j++) {
      let value = values[j]?.trim() || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      obj[headers[j]] = value;
    }
    
    data.push(obj);
  }
  
  return data;
};

// Extract coordinates from WKT
const extractCoordinates = (wkt: string) => {
  const match = wkt.match(/POINT\s*\(\s*([0-9.]+)\s+([0-9.]+)\s*\)/i);
  if (match) {
    return [parseFloat(match[1]), parseFloat(match[2])];
  }
  return null;
};

export default function InteractiveMap({
  mapConfigs = [],
  activeConfigId = null,
  mapLayers = [],
  onLayerUpdate,
}: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Get active config or use defaults
  const activeConfig = activeConfigId 
    ? mapConfigs.find(c => c.id === activeConfigId)
    : mapConfigs.find(c => c.is_active);
  
  const defaultCenter: [number, number] = activeConfig 
    ? [activeConfig.default_center_lat, activeConfig.default_center_lng]
    : [13.037063508747957, 123.45890718599736];
  
  const defaultZoom = activeConfig?.default_zoom ?? 14;
  const minZoom = activeConfig?.min_zoom ?? 2;
  const maxZoom = activeConfig?.max_zoom ?? 20;
  const referenceRadius = activeConfig?.reference_circle_radius ?? 1000;
  const referenceColor = activeConfig?.reference_circle_color ?? '#3b82f6';
  const tileLayerUrl = activeConfig?.tile_layer_url ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [currentZoom, setCurrentZoom] = useState<number>(defaultZoom);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#84cc16', '#06b6d4', '#7c3aed', '#f43f5e'
  ];

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Initialize map with enhanced options for free zoom
    const map = L.map(mapContainer.current, {
      center: mapCenter,
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: false,
      minZoom: minZoom,
      maxZoom: maxZoom,
      wheelDebounceTime: 40,
      wheelPxPerZoomLevel: 60,
      touchZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
      inertia: true,
      inertiaDeceleration: 3000,
      inertiaMaxSpeed: 1500,
      zoomAnimation: true,
      zoomAnimationThreshold: 4,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    // Add tile layer with config or default
    L.tileLayer(tileLayerUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 22,
      minZoom: 2,
      tileSize: 256,
      zoomOffset: 0,
      detectRetina: true,
    }).addTo(map);

    // Add attribution control
    L.control.attribution({ position: 'bottomright' }).addTo(map);

    // Add location marker if enabled in config
    if (activeConfig?.enable_location_marker !== false) {
      const mainMarker = L.marker(mapCenter)
        .addTo(map)
        .bindPopup(`Primary Location<br>Lat: ${mapCenter[0].toFixed(5)}<br>Lng: ${mapCenter[1].toFixed(5)}`)
        .openPopup();
    }

    // Add reference circle if enabled in config
    if (activeConfig?.enable_reference_circle !== false) {
      L.circle(mapCenter, {
        color: referenceColor,
        fillColor: referenceColor,
        fillOpacity: 0.1,
        radius: referenceRadius
      }).addTo(map);
    }

    mapInstance.current = map;

    // Handle map events
    const updateMapState = () => {
      if (mapInstance.current) {
        const center = mapInstance.current.getCenter();
        setMapCenter([center.lat, center.lng]);
        setCurrentZoom(mapInstance.current.getZoom());
      }
    };
    
    map.on('moveend', updateMapState);
    map.on('zoomend', updateMapState);
    map.on('dragstart', () => setIsDragging(true));
    map.on('dragend', () => setIsDragging(false));

    return () => {
      if (mapInstance.current) {
        mapInstance.current.off('moveend', updateMapState);
        mapInstance.current.off('zoomend', updateMapState);
        mapInstance.current.off('dragstart');
        mapInstance.current.off('dragend');
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [mapCenter, activeConfig]);

  // Load CSV data on mount
  useEffect(() => {
    loadCSVData();
  }, []);

  // Load mapLayers from props when activeConfigId changes
  useEffect(() => {
    if (!mapInstance.current || !activeConfigId) return;
    
    const activeLayers = mapLayers.filter(
      layer => layer.config_id === activeConfigId && layer.is_active
    );
    
    activeLayers.forEach(async (mapLayer) => {
      try {
        if (!mapLayer.file_data) return;
        
        const layerGroup = L.layerGroup();
        
        // Parse based on file type
        if (mapLayer.file_type === 'kml') {
          // KML parsing would be handled here
          // For now, we'll show a placeholder
          console.log(`Loading KML layer: ${mapLayer.layer_name}`);
        } else if (mapLayer.file_type === 'csv') {
          const parsedData = parseCSV(mapLayer.file_data);
          parsedData.forEach((item: any) => {
            const coords = extractCoordinates(item.WKT);
            if (coords) {
              const [lng, lat] = coords;
              const marker = L.marker([lat, lng], {
                icon: L.icon({
                  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                  iconSize: [25, 41],
                  shadowSize: [41, 41],
                  iconAnchor: [12, 41],
                  shadowAnchor: [13, 41],
                  popupAnchor: [1, -34],
                })
              });
              marker.bindPopup(`<div class="font-semibold">${mapLayer.layer_name}</div><div class="text-sm">${item.name || ''}</div>`);
              layerGroup.addLayer(marker);
            }
          });
        } else if (mapLayer.file_type === 'geojson') {
          if (typeof mapLayer.file_data === 'string') {
            const geoJSON = JSON.parse(mapLayer.file_data);
            L.geoJSON(geoJSON, {
              pointToLayer: (feature, latlng) => {
                return L.marker(latlng);
              },
              style: () => ({
                color: mapLayer.layer_color,
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.3
              }),
              onEachFeature: (feature, layer) => {
                if (feature.properties) {
                  layer.bindPopup(JSON.stringify(feature.properties));
                }
              }
            }).addTo(layerGroup);
          }
        }
        
        if (mapInstance.current && mapLayer.is_visible) {
          layerGroup.addTo(mapInstance.current);
        }
        
        const newLayer: Layer = {
          id: `layer-${mapLayer.id}`,
          name: mapLayer.layer_name,
          layer: layerGroup,
          visible: mapLayer.is_visible,
          color: mapLayer.layer_color,
          fileName: mapLayer.original_filename,
          type: mapLayer.file_type as 'kml' | 'csv'
        };
        
        setLayers(prev => {
          const filtered = prev.filter(l => !l.id.startsWith('layer-'));
          return [...filtered, newLayer];
        });
      } catch (err) {
        console.error(`Error loading layer ${mapLayer.layer_name}:`, err);
      }
    });
  }, [activeConfigId, mapLayers]);

  // Reset success message after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadCSVData = () => {
    try {
      const parsedData = parseCSV(csvData);
      const layerGroup = L.layerGroup();
      
      parsedData.forEach((item, index) => {
        const coords = extractCoordinates(item.WKT);
        if (coords) {
          const [lng, lat] = coords;
          const marker = L.marker([lat, lng]);
          
          // Format popup content
          const popupContent = `
            <div class="font-semibold text-blue-800">${item.name}</div>
            <div class="text-sm mt-1">${item.description.replace(/\n/g, '<br>')}</div>
          `;
          
          marker.bindPopup(popupContent);
          layerGroup.addLayer(marker);
        }
      });

      const newLayer: Layer = {
        id: `csv-${Date.now()}`,
        name: 'Evacuation Centers',
        layer: layerGroup,
        visible: true,
        color: '#3b82f6',
        fileName: 'evacuation_centers.csv',
        type: 'csv'
      };

      setLayers([newLayer]);
      layerGroup.addTo(mapInstance.current!);
      
      // Fit bounds to show all markers
      const group = new L.FeatureGroup(Array.from(layerGroup.getLayers()));
      mapInstance.current!.fitBounds(group.getBounds().pad(0.1));
      
      setSuccess('CSV data loaded successfully');
    } catch (err) {
      console.error('Error loading CSV data:', err);
      setError('Failed to load CSV data');
    }
  };

  const toggleLayerVisibility = useCallback((id: string) => {
    setLayers(prev =>
      prev.map(layer => {
        if (layer.id === id) {
          const newVisible = !layer.visible;
          if (newVisible) {
            mapInstance.current?.addLayer(layer.layer);
          } else {
            mapInstance.current?.removeLayer(layer.layer);
          }
          return { ...layer, visible: newVisible };
        }
        return layer;
      })
    );
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === id);
      if (layer && mapInstance.current) {
        mapInstance.current.removeLayer(layer.layer);
      }
      return prev.filter(l => l.id !== id);
    });
  }, []);

  const zoomToLayer = useCallback((id: string) => {
    const layer = layers.find(l => l.id === id);
    if (layer && mapInstance.current) {
      const group = new L.FeatureGroup(Array.from(layer.layer.getLayers()));
      const bounds = group.getBounds();
      if (bounds.isValid()) {
        mapInstance.current.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
      }
    }
  }, [layers]);

  const handleZoomIn = () => {
    if (mapInstance.current) {
      mapInstance.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstance.current) {
      mapInstance.current.zoomOut();
    }
  };

  const handleZoomByStep = (delta: number) => {
    if (mapInstance.current) {
      const currentZoom = mapInstance.current.getZoom();
      const newZoom = Math.max(2, Math.min(22, currentZoom + delta));
      mapInstance.current.setZoom(newZoom);
    }
  };

  const handleFullscreen = () => {
    if (!mapContainer.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      mapContainer.current.requestFullscreen();
    }
  };

  const flyToLocation = () => {
    if (mapInstance.current) {
      mapInstance.current.flyTo(mapCenter, 14, {
        animate: true,
        duration: 1.5
      });
    }
  };

  const resetView = () => {
    if (mapInstance.current) {
      mapInstance.current.setView(mapCenter, 14);
    }
  };

  const exportImage = () => {
    if (!mapInstance.current) return;
    
    // Create a temporary canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = 1200;
    canvas.height = 800;
    
    // Fill background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add title
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Interactive Map Export', 50, 50);
    
    // Add map details
    ctx.fillStyle = '#475569';
    ctx.font = '16px Arial';
    ctx.fillText(`Center: ${mapCenter[0].toFixed(6)}, ${mapCenter[1].toFixed(6)}`, 50, 90);
    ctx.fillText(`Zoom Level: ${currentZoom}`, 50, 120);
    ctx.fillText(`Layers: ${layers.length}`, 50, 150);
    ctx.fillText(`Exported: ${new Date().toLocaleString()}`, 50, 180);
    
    // Add decorative elements
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 200);
    ctx.lineTo(canvas.width - 50, 200);
    ctx.stroke();
    
    // Create download link
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `map-export-${new Date().getTime()}.png`;
    link.href = dataUrl;
    link.click();
    
    setSuccess('Map image exported successfully');
  };

  return (
    <div className="w-full h-screen bg-white/40 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-[#1a1a2e]">Interactive Map</h2>
              <div className="relative group">
                <Info className="w-4 h-4 text-gray-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-gray-800 text-white text-xs p-2 rounded-lg z-10">
                  Visualize geographic data with advanced controls. Layers will appear in the sidebar.
                </div>
              </div>
            </div>
            <p className="text-sm text-[#1a1a2e]/70 mt-1">Visualize geographic data with advanced controls</p>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={resetView}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow transition-all text-sm"
              title="Reset view"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            
            <button
              onClick={exportImage}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg shadow transition-all text-sm"
              title="Export as image"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Image</span>
            </button>
            
            <button
              onClick={flyToLocation}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg shadow transition-all text-sm"
              title="Go to primary location"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Go to Location</span>
            </button>
          </div>
        </div>
        
        {/* Status Messages */}
        {(error || success) && (
          <div className={`flex items-center gap-2 p-3 mt-3 rounded-lg text-sm ${
            error 
              ? 'bg-red-100 border border-red-300 text-red-700' 
              : 'bg-green-100 border border-green-300 text-green-700'
          }`}>
            {error ? <X className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            {error || success}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative flex">
        <div 
          ref={mapContainer} 
          className="flex-1 relative"
          style={{ height: '100%' }}
        >
          {/* Enhanced Map Controls */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            {/* Zoom Slider */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2 flex flex-col items-center">
              <button
                onClick={() => handleZoomByStep(1)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Zoom In"
                disabled={currentZoom >= 22}
              >
                <Plus className="w-4 h-4 text-gray-700" />
              </button>
              
              <div className="py-1 flex flex-col items-center">
                <span className="text-xs font-medium text-gray-600">{currentZoom.toFixed(1)}</span>
                <input
                  type="range"
                  min="2"
                  max="22"
                  step="0.1"
                  value={currentZoom}
                  onChange={(e) => {
                    if (mapInstance.current) {
                      mapInstance.current.setZoom(parseFloat(e.target.value));
                    }
                  }}
                  className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                />
                <span className="text-xs text-gray-500">2-22</span>
              </div>
              
              <button
                onClick={() => handleZoomByStep(-1)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Zoom Out"
                disabled={currentZoom <= 2}
              >
                <Minus className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            
            {/* Action Buttons */}
            <button
              onClick={handleFullscreen}
              className="w-9 h-9 bg-white hover:bg-gray-100 rounded-lg shadow-md flex items-center justify-center transition-all border border-gray-200"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <Maximize2 className="w-4 h-4 text-gray-700" />
            </button>
            
            <button
              onClick={flyToLocation}
              className="w-9 h-9 bg-white hover:bg-gray-100 rounded-lg shadow-md flex items-center justify-center transition-all border border-gray-200"
              title="Go to primary location"
            >
              <MapPin className="w-4 h-4 text-gray-700" />
            </button>
          </div>
          
          {/* Coordinates Display */}
          {mapInstance.current && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-white/50">
              <div>Lat: {mapCenter[0].toFixed(6)}</div>
              <div>Lng: {mapCenter[1].toFixed(6)}</div>
              <div className="text-xs mt-1">Zoom: {currentZoom.toFixed(1)}</div>
            </div>
          )}
          
          {/* Free Zoom Indicator */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium text-gray-700 border border-white/50">
            <div>Free Zoom Enabled</div>
            <div className="text-blue-600">Use mouse wheel to zoom</div>
          </div>
        </div>

        {/* Layers Panel */}
        {layers.length > 0 && (
          <div className="w-72 bg-white/95 backdrop-blur-sm border-l border-white/50 p-4 overflow-y-auto max-h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-gray-800">Layers ({layers.length})</h3>
              </div>
              <button
                onClick={() => layers.forEach(layer => removeLayer(layer.id))}
                className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                title="Remove all layers"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-3 h-3 rounded mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: layer.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-semibold text-gray-800 truncate" title={layer.fileName}>
                          {layer.name}
                        </p>
                        {layer.type === 'csv' && (
                          <FileText className="w-3 h-3 text-blue-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1" title={layer.fileName}>
                        {layer.fileName}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => toggleLayerVisibility(layer.id)}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title={layer.visible ? 'Hide layer' : 'Show layer'}
                        >
                          {layer.visible ? (
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => zoomToLayer(layer.id)}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Zoom to layer"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => removeLayer(layer.id)}
                          className="p-1.5 hover:bg-red-100 rounded transition-colors ml-auto"
                          title="Remove layer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {layers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg max-w-md">
            <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-700 mb-2">No layers loaded</p>
            <p className="text-sm text-gray-500 mb-4">Evacuation centers data is displayed on the map</p>
            <div className="bg-blue-50 p-3 rounded-lg text-left mt-2">
              <p className="text-sm font-medium text-blue-800 mb-1">Primary Location:</p>
              <p className="text-xs text-blue-700">Latitude: {mapCenter[0].toFixed(6)}</p>
              <p className="text-xs text-blue-700">Longitude: {mapCenter[1].toFixed(6)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}