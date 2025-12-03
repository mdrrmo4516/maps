import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Map,
  RefreshCw,
  X,
  Upload,
  Layers,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Table,
  Pin,
  Globe,
  Save,
  CheckCircle,
  AlertCircle,
  Info,
  Import,
  MapPin
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import type { MapConfig, MapLayer, MapConfigFormData, MapLayerFormData } from "./types";

interface MapConfigTabProps {
  mapConfigs: MapConfig[];
  showMapConfigForm: boolean;
  setShowMapConfigForm: (show: boolean) => void;
  editingMapConfig: MapConfig | null;
  mapConfigForm: MapConfigFormData;
  setMapConfigForm: (form: MapConfigFormData) => void;
  onCreateMapConfig: () => void;
  onEditMapConfig: (config: MapConfig) => void;
  onSaveMapConfig: () => void;
  onDeleteMapConfig: (id: number) => void;
  onToggleMapConfigActive: (config: MapConfig) => Promise<void>;
  saving: boolean;
}

export default function MapConfigTab({
  mapConfigs,
  showMapConfigForm,
  setShowMapConfigForm,
  editingMapConfig,
  mapConfigForm,
  setMapConfigForm,
  onCreateMapConfig,
  onEditMapConfig,
  onSaveMapConfig,
  onDeleteMapConfig,
  onToggleMapConfigActive,
  saving,
}: MapConfigTabProps) {
  const [mapLayers, setMapLayers] = useState<MapLayer[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [showLayerForm, setShowLayerForm] = useState(false);
  const [editingLayer, setEditingLayer] = useState<MapLayer | null>(null);
  const [layerForm, setLayerForm] = useState<MapLayerFormData>({
    layer_name: "",
    description: "",
    file_type: "kml",
    file_data: null,
    original_filename: "",
    file_size: 0,
    layer_color: "#3b82f6",
    is_visible: true,
    is_active: true,
    display_order: 0,
    config_id: null,
  });
  const [uploadingLayer, setUploadingLayer] = useState(false);
  const [layerError, setLayerError] = useState<string | null>(null);
  const [layerSuccess, setLayerSuccess] = useState<string | null>(null);
  const [expandedConfig, setExpandedConfig] = useState<number | null>(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [layerData, setLayerData] = useState<any[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'map' | 'table'>('map');
  
  // New states for modals
  const [showAddMarkModal, setShowAddMarkModal] = useState(false);
  const [showAddPolygonModal, setShowAddPolygonModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // New states for forms
  const [markForm, setMarkForm] = useState({
    icon: "default",
    latitude: "",
    longitude: "",
    title: "",
    details: ""
  });
  
  const [polygonForm, setPolygonForm] = useState({
    coordinates: "",
    title: "",
    details: "",
    color: "#3b82f6"
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#84cc16', '#06b6d4', '#7c3aed', '#f43f5e'
  ];

  const loadLayers = useCallback(async (configId: number) => {
    try {
      // Mock implementation
      setMapLayers([
        {
          id: 1,
          layer_name: "Sample Layer",
          description: "A sample layer for demonstration",
          file_type: "kml",
          file_data: null,
          original_filename: "sample.kml",
          file_size: 1024,
          layer_color: "#3b82f6",
          is_visible: true,
          is_active: true,
          display_order: 0,
          config_id: configId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error('Failed to load layers:', err);
    }
  }, []);

  const handleConfigExpand = (configId: number) => {
    if (expandedConfig === configId) {
      setExpandedConfig(null);
      setMapLayers([]);
    } else {
      setExpandedConfig(configId);
      loadLayers(configId);
    }
  };

  // Enhanced parsing functions
  const parseKMLToGeoJSON = (kmlText: string): object | null => {
    try {
      const parser = new DOMParser();
      const kml = parser.parseFromString(kmlText, "text/xml");
      const placemarks = kml.getElementsByTagName("Placemark");
      const features: object[] = [];

      for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i];
        const name = placemark.getElementsByTagName("name")[0]?.textContent || "";
        const description = placemark.getElementsByTagName("description")[0]?.textContent || "";
        const coordinates = placemark.getElementsByTagName("coordinates")[0]?.textContent;
        
        if (coordinates) {
          const coords = coordinates.trim().split(/\s+/).map((coord) => {
            const [lng, lat, alt] = coord.split(",").map(Number);
            return [lng, lat, alt || 0];
          });

          const polygon = placemark.getElementsByTagName("Polygon")[0];
          const lineString = placemark.getElementsByTagName("LineString")[0];
          const point = placemark.getElementsByTagName("Point")[0];

          let geometry: object;
          if (polygon) {
            geometry = { type: "Polygon", coordinates: [coords.map((c) => [c[0], c[1]])] };
          } else if (lineString) {
            geometry = { type: "LineString", coordinates: coords.map((c) => [c[0], c[1]]) };
          } else if (point) {
            geometry = { type: "Point", coordinates: [coords[0][0], coords[0][1]] };
          } else {
            continue;
          }

          features.push({ type: "Feature", properties: { name, description }, geometry });
        }
      }

      return { type: "FeatureCollection", features };
    } catch {
      return null;
    }
  };

  const parseCSVToGeoJSON = (csvText: string): object | null => {
    try {
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const features: object[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(',');
        const properties: any = {};
        
        for (let j = 0; j < headers.length; j++) {
          let value = values[j]?.trim() || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          properties[headers[j]] = value;
        }

        // Try to extract coordinates from WKT or lat/lng columns
        let coords: [number, number] | null = null;
        
        if (properties.WKT) {
          const match = properties.WKT.match(/POINT\s*\(\s*([0-9.-]+)\s+([0-9.-]+)\s*\)/i);
          if (match) {
            coords = [parseFloat(match[1]), parseFloat(match[2])];
          }
        } else if (properties.longitude && properties.latitude) {
          coords = [parseFloat(properties.longitude), parseFloat(properties.latitude)];
        } else if (properties.lng && properties.lat) {
          coords = [parseFloat(properties.lng), parseFloat(properties.lat)];
        }

        if (coords) {
          features.push({
            type: "Feature",
            properties,
            geometry: { type: "Point", coordinates: coords }
          });
        }
      }

      return { type: "FeatureCollection", features };
    } catch {
      return null;
    }
  };

  const parseGeoJSON = (jsonText: string): object | null => {
    try {
      const geoJson = JSON.parse(jsonText);
      if (geoJson.type === "FeatureCollection" || geoJson.type === "Feature") {
        return geoJson;
      }
      return null;
    } catch {
      return null;
    }
  };

  const extractTableData = (geoJson: any): any[] => {
    if (!geoJson || !geoJson.features) return [];
    
    return geoJson.features.map((feature: any, index: number) => {
      const props = feature.properties || {};
      const geom = feature.geometry || {};
      
      return {
        id: index,
        name: props.name || `Feature ${index + 1}`,
        description: props.description || '',
        type: geom.type || 'Unknown',
        coordinates: geom.coordinates ? JSON.stringify(geom.coordinates) : 'N/A',
        ...props
      };
    });
  };

  const extractMarkers = (geoJson: any): any[] => {
    if (!geoJson || !geoJson.features) return [];
    
    return geoJson.features
      .filter((feature: any) => feature.geometry && feature.geometry.type === "Point")
      .map((feature: any, index: number) => ({
        id: index,
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        name: feature.properties?.name || `Marker ${index + 1}`,
        description: feature.properties?.description || '',
        color: layerForm.layer_color
      }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLayerError(null);
    setUploadingLayer(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let fileType: 'kml' | 'csv' | 'json' | 'geojson' = 'kml';
      let fileData: any = null;

      const text = await file.text();

      if (ext === "kml") {
        fileType = "kml";
        fileData = parseKMLToGeoJSON(text);
        if (!fileData) {
          throw new Error("Invalid KML file format");
        }
      } else if (ext === "csv") {
        fileType = "csv";
        fileData = parseCSVToGeoJSON(text);
        if (!fileData) {
          throw new Error("Invalid CSV file format");
        }
      } else if (ext === "json" || ext === "geojson") {
        fileType = ext === "geojson" ? "geojson" : "json";
        fileData = parseGeoJSON(text);
        if (!fileData) {
          throw new Error("Invalid GeoJSON file format");
        }
      } else {
        throw new Error("Unsupported file type. Please upload KML, CSV, or JSON files.");
      }

      // Extract data for table view and markers
      const tableData = extractTableData(fileData);
      const markerData = extractMarkers(fileData);
      
      setLayerData(tableData);
      setMarkers(markerData);

      setLayerForm(prev => ({
        ...prev,
        file_type: fileType,
        file_data: fileData,
        original_filename: file.name,
        file_size: file.size,
        layer_name: prev.layer_name || file.name.replace(/\.[^/.]+$/, ""),
      }));
    } catch (err) {
      setLayerError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setUploadingLayer(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCreateLayer = (configId: number) => {
    setEditingLayer(null);
    setLayerForm({
      layer_name: "",
      description: "",
      file_type: "kml",
      file_data: null,
      original_filename: "",
      file_size: 0,
      layer_color: colors[mapLayers.length % colors.length],
      is_visible: true,
      is_active: true,
      display_order: mapLayers.length,
      config_id: configId,
    });
    setSelectedConfigId(configId);
    setShowLayerForm(true);
    setLayerData([]);
    setMarkers([]);
  };

  const handleEditLayer = (layer: MapLayer) => {
    setEditingLayer(layer);
    setLayerForm({
      layer_name: layer.layer_name,
      description: layer.description || "",
      file_type: layer.file_type,
      file_data: layer.file_data,
      original_filename: layer.original_filename,
      file_size: layer.file_size,
      layer_color: layer.layer_color,
      is_visible: layer.is_visible,
      is_active: layer.is_active,
      display_order: layer.display_order,
      config_id: layer.config_id,
    });
    
    // Re-extract data for editing
    if (layer.file_data) {
      const tableData = extractTableData(layer.file_data);
      const markerData = extractMarkers(layer.file_data);
      setLayerData(tableData);
      setMarkers(markerData);
    }
    
    setShowLayerForm(true);
  };

  const handleSaveLayer = async () => {
    if (!layerForm.layer_name || !layerForm.file_data) {
      setLayerError("Layer name and file are required");
      return;
    }

    setUploadingLayer(true);
    setLayerError(null);

    try {
      // Mock save implementation
      setShowLayerForm(false);
      setLayerSuccess("Layer saved successfully");
      setTimeout(() => setLayerSuccess(null), 3000);
      if (selectedConfigId) {
        loadLayers(selectedConfigId);
      }
    } catch (err) {
      setLayerError(err instanceof Error ? err.message : "Failed to save layer");
    } finally {
      setUploadingLayer(false);
    }
  };

  const handleDeleteLayer = async (layerId: number) => {
    if (!confirm("Are you sure you want to delete this layer?")) return;

    try {
      // Mock delete implementation
      setLayerSuccess("Layer deleted successfully");
      setTimeout(() => setLayerSuccess(null), 3000);
      if (selectedConfigId) {
        loadLayers(selectedConfigId);
      }
    } catch (err) {
      setLayerError(err instanceof Error ? err.message : "Failed to delete layer");
    }
  };

  const handleToggleLayerVisibility = async (layer: MapLayer) => {
    try {
      // Mock toggle implementation
      if (selectedConfigId) {
        loadLayers(selectedConfigId);
      }
    } catch (err) {
      setLayerError(err instanceof Error ? err.message : "Failed to update layer");
    }
  };

  const handleToggleLayerActive = async (layer: MapLayer) => {
    try {
      // Mock toggle implementation
      if (selectedConfigId) {
        loadLayers(selectedConfigId);
      }
    } catch (err) {
      setLayerError(err instanceof Error ? err.message : "Failed to update layer");
    }
  };

  const exportLayerData = (format: 'geojson' | 'csv') => {
    if (!layerForm.file_data) return;

    if (format === 'geojson') {
      const dataStr = JSON.stringify(layerForm.file_data, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      const exportFileDefaultName = `${layerForm.layer_name || 'layer'}.geojson`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else {
      // Export as CSV
      if (layerData.length === 0) return;
      
      const headers = Object.keys(layerData[0]).join(',');
      const rows = layerData.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
        ).join(',')
      ).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
      const exportFileDefaultName = `${layerForm.layer_name || 'layer'}.csv`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  // Handle adding mark
  const handleAddMark = () => {
    // Validate form
    if (!markForm.latitude || !markForm.longitude || !markForm.title) {
      alert("Please fill in all required fields");
      return;
    }
    
    // Add mark logic here
    console.log("Adding mark:", markForm);
    setShowAddMarkModal(false);
    setMarkForm({
      icon: "default",
      latitude: "",
      longitude: "",
      title: "",
      details: ""
    });
  };

  // Handle adding polygon
  const handleAddPolygon = () => {
    // Validate form
    if (!polygonForm.coordinates || !polygonForm.title) {
      alert("Please fill in all required fields");
      return;
    }
    
    // Add polygon logic here
    console.log("Adding polygon:", polygonForm);
    setShowAddPolygonModal(false);
    setPolygonForm({
      coordinates: "",
      title: "",
      details: "",
      color: "#3b82f6"
    });
  };

  // Handle importing file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Import logic here
    console.log("Importing file:", file);
    setShowImportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Add Mark Modal */}
      {showAddMarkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Add New Marker</h3>
                <button
                  onClick={() => setShowAddMarkModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Icon
                  </label>
                  <select
                    value={markForm.icon}
                    onChange={(e) => setMarkForm({...markForm, icon: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="default">Default</option>
                    <option value="star">Star</option>
                    <option value="heart">Heart</option>
                    <option value="flag">Flag</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={markForm.latitude}
                      onChange={(e) => setMarkForm({...markForm, latitude: e.target.value})}
                      placeholder="40.7128"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={markForm.longitude}
                      onChange={(e) => setMarkForm({...markForm, longitude: e.target.value})}
                      placeholder="-74.0060"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={markForm.title}
                    onChange={(e) => setMarkForm({...markForm, title: e.target.value})}
                    placeholder="Marker Title"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Details
                  </label>
                  <textarea
                    value={markForm.details}
                    onChange={(e) => setMarkForm({...markForm, details: e.target.value})}
                    placeholder="Additional details..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddMark}
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <MapPin size={18} />
                  Add Marker
                </button>
                <button
                  onClick={() => setShowAddMarkModal(false)}
                  className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Polygon Modal */}
      {showAddPolygonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Add New Polygon</h3>
                <button
                  onClick={() => setShowAddPolygonModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Coordinates *
                  </label>
                  <textarea
                    value={polygonForm.coordinates}
                    onChange={(e) => setPolygonForm({...polygonForm, coordinates: e.target.value})}
                    placeholder="[[lat1,lng1],[lat2,lng2],[lat3,lng3],...]"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter coordinates as array of [latitude,longitude] pairs</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={polygonForm.title}
                    onChange={(e) => setPolygonForm({...polygonForm, title: e.target.value})}
                    placeholder="Polygon Title"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Details
                  </label>
                  <textarea
                    value={polygonForm.details}
                    onChange={(e) => setPolygonForm({...polygonForm, details: e.target.value})}
                    placeholder="Additional details..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setPolygonForm({...polygonForm, color})}
                        className={`w-8 h-8 rounded-lg border-2 transition ${
                          polygonForm.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddPolygon}
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Map size={18} />
                  Add Polygon
                </button>
                <button
                  onClick={() => setShowAddPolygonModal(false)}
                  className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Import Geo Data</h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select File *
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => document.getElementById('import-file-input')?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                    >
                      <Import size={16} />
                      Choose File
                    </button>
                    <input
                      id="import-file-input"
                      type="file"
                      accept=".kml,.csv,.json,.geojson,.shp,.gpx"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Supported formats: KML, CSV, GeoJSON, SHP, GPX</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Import Tips</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Ensure coordinates are in WGS84 format</li>
                    <li>• CSV files should have latitude/longitude columns</li>
                    <li>• Large files may take longer to process</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layer Form Modal */}
      {showLayerForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingLayer ? "Edit Layer" : "Add New Layer"}
                </h3>
                <button
                  onClick={() => setShowLayerForm(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              {layerError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {layerError}
                </div>
              )}

              {layerSuccess && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  {layerSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Layer Name *
                    </label>
                    <input
                      type="text"
                      value={layerForm.layer_name}
                      onChange={(e) => setLayerForm({ ...layerForm, layer_name: e.target.value })}
                      placeholder="My Layer"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={layerForm.description}
                      onChange={(e) => setLayerForm({ ...layerForm, description: e.target.value })}
                      placeholder="Layer description..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload File (KML, CSV, GeoJSON) *
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLayer}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition disabled:opacity-50"
                      >
                        {uploadingLayer ? (
                          <>
                            <RefreshCw className="animate-spin" size={16} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            Choose File
                          </>
                        )}
                      </button>
                      {layerForm.original_filename && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                          <FileText size={16} className="text-gray-600" />
                          <span className="text-sm text-gray-700 truncate max-w-[150px]">{layerForm.original_filename}</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".kml,.csv,.json,.geojson"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Layer Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setLayerForm({ ...layerForm, layer_color: color })}
                          className={`w-8 h-8 rounded-lg border-2 transition ${
                            layerForm.layer_color === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layerForm.is_visible}
                        onChange={(e) => setLayerForm({ ...layerForm, is_visible: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">Visible by default</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layerForm.is_active}
                        onChange={(e) => setLayerForm({ ...layerForm, is_active: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Info size={18} className="text-blue-500" />
                      Data Preview
                    </h4>
                    
                    {layerData.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActiveTab('map')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                              activeTab === 'map' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <Globe size={14} />
                            Map View
                          </button>
                          <button
                            onClick={() => setActiveTab('table')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                              activeTab === 'table' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <Table size={14} />
                            Table View
                          </button>
                        </div>

                        {activeTab === 'map' ? (
                          <div className="bg-white rounded-lg border border-gray-200 p-3 h-64 overflow-auto">
                            <div className="flex items-center gap-2 mb-2">
                              <Pin className="text-red-500" size={16} />
                              <span className="font-medium text-gray-700">Markers ({markers.length})</span>
                            </div>
                            <div className="space-y-2">
                              {markers.slice(0, 10).map((marker) => (
                                <div key={marker.id} className="flex items-center gap-2 text-sm">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: marker.color }}
                                  />
                                  <span className="truncate">{marker.name}</span>
                                </div>
                              ))}
                              {markers.length > 10 && (
                                <div className="text-xs text-gray-500">
                                  +{markers.length - 10} more markers
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div 
                            ref={tableRef}
                            className="bg-white rounded-lg border border-gray-200 p-3 h-64 overflow-auto"
                          >
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-gray-50">
                                <tr>
                                  {Object.keys(layerData[0]).slice(0, 4).map((header) => (
                                    <th key={header} className="text-left p-2 border-b">{header}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {layerData.slice(0, 10).map((row, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    {Object.values(row).slice(0, 4).map((cell: any, cellIdx) => (
                                      <td key={cellIdx} className="p-2 border-b truncate max-w-[100px]">
                                        {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {layerData.length > 10 && (
                              <div className="text-xs text-gray-500 mt-2">
                                Showing 10 of {layerData.length} records
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => exportLayerData('geojson')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm"
                          >
                            <Save size={14} />
                            Export GeoJSON
                          </button>
                          <button
                            onClick={() => exportLayerData('csv')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm"
                          >
                            <Table size={14} />
                            Export CSV
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Upload a file to preview data</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveLayer}
                  disabled={uploadingLayer || !layerForm.layer_name || !layerForm.file_data}
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploadingLayer ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    "Save Layer"
                  )}
                </button>
                <button
                  onClick={() => setShowLayerForm(false)}
                  className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMapConfigForm ? (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-white/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              {editingMapConfig ? "Edit Map Configuration" : "Create Map Configuration"}
            </h3>
            <button
              onClick={() => setShowMapConfigForm(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              data-testid="button-close-config-form"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Configuration Name *
              </label>
              <input
                type="text"
                value={mapConfigForm.config_name}
                onChange={(e) =>
                  setMapConfigForm({ ...mapConfigForm, config_name: e.target.value })
                }
                placeholder="Default Map Config"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="input-config-name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={mapConfigForm.description}
                onChange={(e) =>
                  setMapConfigForm({ ...mapConfigForm, description: e.target.value })
                }
                placeholder="Configuration description..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="input-config-description"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Default Center Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={mapConfigForm.default_center_lat}
                onChange={(e) =>
                  setMapConfigForm({
                    ...mapConfigForm,
                    default_center_lat: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="input-default-lat"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Default Center Longitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={mapConfigForm.default_center_lng}
                onChange={(e) =>
                  setMapConfigForm({
                    ...mapConfigForm,
                    default_center_lng: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="input-default-lng"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Default Zoom</label>
              <input
                type="number"
                min="1"
                max="20"
                value={mapConfigForm.default_zoom}
                onChange={(e) =>
                  setMapConfigForm({
                    ...mapConfigForm,
                    default_zoom: parseInt(e.target.value) || 14,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="input-default-zoom"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Min Zoom / Max Zoom
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={mapConfigForm.min_zoom}
                  onChange={(e) =>
                    setMapConfigForm({
                      ...mapConfigForm,
                      min_zoom: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  data-testid="input-min-zoom"
                />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={mapConfigForm.max_zoom}
                  onChange={(e) =>
                    setMapConfigForm({
                      ...mapConfigForm,
                      max_zoom: parseInt(e.target.value) || 19,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  data-testid="input-max-zoom"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reference Circle Radius (meters)
              </label>
              <input
                type="number"
                value={mapConfigForm.reference_circle_radius}
                onChange={(e) =>
                  setMapConfigForm({
                    ...mapConfigForm,
                    reference_circle_radius: parseInt(e.target.value) || 1000,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="input-circle-radius"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reference Circle Color
              </label>
              <input
                type="color"
                value={mapConfigForm.reference_circle_color}
                onChange={(e) =>
                  setMapConfigForm({
                    ...mapConfigForm,
                    reference_circle_color: e.target.value,
                  })
                }
                className="w-full h-12 px-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="input-circle-color"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Max File Size (MB)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={mapConfigForm.max_file_size_mb}
                onChange={(e) =>
                  setMapConfigForm({
                    ...mapConfigForm,
                    max_file_size_mb: parseInt(e.target.value) || 10,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="input-max-file-size"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tile Layer URL</label>
              <input
                type="text"
                value={mapConfigForm.tile_layer_url}
                onChange={(e) =>
                  setMapConfigForm({ ...mapConfigForm, tile_layer_url: e.target.value })
                }
                placeholder="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                data-testid="input-tile-url"
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={mapConfigForm.enable_location_marker}
                  onChange={(e) =>
                    setMapConfigForm({
                      ...mapConfigForm,
                      enable_location_marker: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  data-testid="checkbox-location-marker"
                />
                <span className="text-sm font-semibold text-gray-700">Enable Location Marker</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={mapConfigForm.enable_reference_circle}
                  onChange={(e) =>
                    setMapConfigForm({
                      ...mapConfigForm,
                      enable_reference_circle: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  data-testid="checkbox-reference-circle"
                />
                <span className="text-sm font-semibold text-gray-700">Enable Reference Circle</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={mapConfigForm.is_active}
                  onChange={(e) =>
                    setMapConfigForm({ ...mapConfigForm, is_active: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  data-testid="checkbox-active-config"
                />
                <span className="text-sm font-semibold text-gray-700">Set as Active Config</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onSaveMapConfig}
              disabled={saving}
              className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              data-testid="button-save-config"
            >
              {saving ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </button>
            <button
              onClick={() => setShowMapConfigForm(false)}
              className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              data-testid="button-cancel-config"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Map Configuration & Layers</h2>
              <p className="text-gray-600">
                Configure settings and manage layers for the Interactive Map component
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddMarkModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <MapPin size={16} />
                Add Mark
              </button>
              <button
                onClick={() => setShowAddPolygonModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Map size={16} />
                Add Polygon
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Import size={16} />
                Import
              </button>
              <button
                onClick={onCreateMapConfig}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                data-testid="button-create-config"
              >
                <Plus size={18} />
                Create Config
              </button>
            </div>
          </div>

          {mapConfigs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
              <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No map configurations yet
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first map configuration to customize the interactive map
              </p>
              <button
                onClick={onCreateMapConfig}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                data-testid="button-create-first-config"
              >
                Create Configuration
              </button>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="space-y-4">
                {mapConfigs.map((config) => (
                  <div
                    key={config.id}
                    className={`border rounded-xl transition-all ${
                      config.is_active
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`card-config-${config.id}`}
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-900 text-lg">{config.config_name}</h3>
                            {config.is_active && (
                              <span className="px-2.5 py-1 bg-green-500 text-white text-xs rounded-full font-medium">
                                Active
                              </span>
                            )}
                          </div>
                          {config.description && (
                            <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfigExpand(config.id)}
                            className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition"
                            title="Manage Layers"
                          >
                            {expandedConfig === config.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            onClick={() => onToggleMapConfigActive(config)}
                            className={`p-2 rounded-lg transition ${
                              config.is_active
                                ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                                : "bg-green-100 hover:bg-green-200 text-green-700"
                            }`}
                            title={config.is_active ? "Deactivate" : "Activate"}
                            data-testid={`button-toggle-config-${config.id}`}
                          >
                            {config.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => onEditMapConfig(config)}
                            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition"
                            title="Edit"
                            data-testid={`button-edit-config-${config.id}`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => onDeleteMapConfig(config.id)}
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                            title="Delete"
                            data-testid={`button-delete-config-${config.id}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-500 text-xs mb-1">Center</p>
                          <p className="font-semibold text-gray-900">
                            {Number(config.default_center_lat).toFixed(4)},{" "}
                            {Number(config.default_center_lng).toFixed(4)}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-500 text-xs mb-1">Zoom</p>
                          <p className="font-semibold text-gray-900">
                            {config.default_zoom} ({config.min_zoom}-{config.max_zoom})
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-500 text-xs mb-1">Circle Radius</p>
                          <p className="font-semibold text-gray-900">
                            {config.reference_circle_radius}m
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-500 text-xs mb-1">Max File Size</p>
                          <p className="font-semibold text-gray-900">{config.max_file_size_mb} MB</p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-3 text-xs">
                        {config.enable_location_marker && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            Location Marker
                          </span>
                        )}
                        {config.enable_reference_circle && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                            Reference Circle
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {(config.allowed_file_types || []).join(", ")}
                        </span>
                      </div>
                    </div>

                    {/* Layer Management Section */}
                    {expandedConfig === config.id && (
                      <div className="border-t border-gray-200 p-5 bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-gray-700" />
                            <h4 className="font-bold text-gray-800">Layers ({mapLayers.length})</h4>
                          </div>
                          <button
                            onClick={() => handleCreateLayer(config.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
                          >
                            <Plus size={14} />
                            Add Layer
                          </button>
                        </div>

                        {mapLayers.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No layers yet. Add your first layer to get started.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {mapLayers.map((layer) => (
                              <div
                                key={layer.id}
                                className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition"
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className="w-4 h-4 rounded mt-0.5 flex-shrink-0"
                                    style={{ backgroundColor: layer.layer_color }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-gray-800 text-sm truncate">
                                        {layer.layer_name}
                                      </p>
                                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded uppercase">
                                        {layer.file_type}
                                      </span>
                                      {!layer.is_active && (
                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                                          Inactive
                                        </span>
                                      )}
                                    </div>
                                    {layer.description && (
                                      <p className="text-xs text-gray-500 mt-1">{layer.description}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">{layer.original_filename}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleToggleLayerVisibility(layer)}
                                      className="p-1.5 hover:bg-gray-100 rounded transition"
                                      title={layer.is_visible ? 'Hide' : 'Show'}
                                    >
                                      {layer.is_visible ? (
                                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                                      ) : (
                                        <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleEditLayer(layer)}
                                      className="p-1.5 hover:bg-gray-100 rounded transition"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLayer(layer.id)}
                                      className="p-1.5 hover:bg-red-100 rounded transition"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}