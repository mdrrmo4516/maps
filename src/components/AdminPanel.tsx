import { useEffect, useState, useCallback, useRef } from "react";
import {
  Settings,
  Database,
  FileText,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Map,
  Layers,
  Moon,
  Sun,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Users,
  Info,
  Shield,
  Image,
  Search,
  Filter,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import RBACManagement from "./RBACManagement";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  PagesTab,
  DatabaseTab,
  SidebarTab,
  PanoramasTab,
  MapConfigTab,
  SettingsTab,
} from "./admin";
import type {
  Page,
  MapPage,
  SpatialFile,
  DBInfo,
  AppSettings,
  Panorama,
  MapConfig,
  SidebarButton,
  Tab,
  PagesSubTab,
  MapPageFormData,
  PanoramaFormData,
  MapConfigFormData,
  SidebarButtonFormData,
} from "./admin/types";

interface AdminPanelProps {
  onNavigate?: (view: string) => void;
  onSidebarUpdate?: () => void;
}

export default function AdminPanel({
  onNavigate,
  onSidebarUpdate,
}: AdminPanelProps) {
  const { user, signOut, isConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("pages");
  const [pagesSubTab, setPagesSubTab] = useState<PagesSubTab>("map");
  const [pages, setPages] = useState<Page[]>([]);
  const [mapPages, setMapPages] = useState<MapPage[]>([]);
  const [spatialFiles, setSpatialFiles] = useState<SpatialFile[]>([]);
  const [dbInfo, setDbInfo] = useState<DBInfo | null>(null);
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const [showMapPageForm, setShowMapPageForm] = useState(false);
  const [editingMapPage, setEditingMapPage] = useState<MapPage | null>(null);
  const [mapPageForm, setMapPageForm] = useState<MapPageFormData>({
    slug: "",
    title: "",
    description: "",
    is_published: false,
    layers: [],
    center_lat: 13.037,
    center_lng: 123.4589,
    zoom_level: 12,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeLayers, setActiveLayers] = useState<number[]>([]);

  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");

  const [sidebarButtons, setSidebarButtons] = useState<SidebarButton[]>([]);
  const [showButtonForm, setShowButtonForm] = useState(false);
  const [editingButton, setEditingButton] = useState<SidebarButton | null>(
    null,
  );
  const [buttonForm, setButtonForm] = useState<SidebarButtonFormData>({
    button_id: "",
    label: "",
    folder_id: "",
    source_type: 'drive',
    is_enabled: true,
    order_index: 0,
  });

  const [panoramas, setPanoramas] = useState<Panorama[]>([]);
  const [showPanoramaForm, setShowPanoramaForm] = useState(false);
  const [editingPanorama, setEditingPanorama] = useState<Panorama | null>(null);
  const [panoramaForm, setPanoramaForm] = useState<PanoramaFormData>({
    name: "",
    description: "",
    image_url: "",
    thumbnail_url: "",
    is_active: true,
    order_index: 0,
  });
  const [panoramaUploading, setPanoramaUploading] = useState(false);
  const panoramaFileRef = useRef<HTMLInputElement>(null);

  const [mapConfigs, setMapConfigs] = useState<MapConfig[]>([]);
  const [showMapConfigForm, setShowMapConfigForm] = useState(false);
  const [editingMapConfig, setEditingMapConfig] = useState<MapConfig | null>(
    null,
  );
  const [mapConfigForm, setMapConfigForm] = useState<MapConfigFormData>({
    config_name: "",
    description: "",
    default_center_lat: 13.037063,
    default_center_lng: 123.458907,
    default_zoom: 14,
    max_zoom: 19,
    min_zoom: 1,
    tile_layer_url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    tile_layer_attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    enable_location_marker: true,
    enable_reference_circle: true,
    reference_circle_radius: 1000,
    reference_circle_color: "#3b82f6",
    allowed_file_types: [".kml", ".geojson", ".csv"],
    max_file_size_mb: 10,
    is_active: false,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "pages") {
        if (pagesSubTab === "system") {
          const res = await fetch("/api/pages");
          if (res.ok) {
            const data = await res.json();
            setPages(data.pages || []);
          } else {
            throw new Error("Failed to load system pages");
          }
        } else {
          const res = await fetch("/api/map-pages");
          if (res.ok) {
            const data = await res.json();
            setMapPages(data.pages || []);
          } else {
            throw new Error("Failed to load map pages");
          }
        }
      } else if (activeTab === "database") {
        const [dbRes, filesRes] = await Promise.all([
          fetch("/api/db-info"),
          fetch("/api/spatial-files"),
        ]);

        if (dbRes.ok) {
          const data = await dbRes.json();
          setDbInfo(data);
        }

        if (filesRes.ok) {
          const data = await filesRes.json();
          setSpatialFiles(data.files || []);
        }
      } else if (activeTab === "settings") {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings || {});
        }
      } else if (activeTab === "sidebar") {
        const res = await fetch('/api/sidebar-buttons');
        if (res.ok) {
          const data = await res.json();
          setSidebarButtons(data.buttons || []);
        } else {
          throw new Error('Failed to load sidebar buttons');
        }
      } else if (activeTab === "panoramas") {
        const res = await fetch("/api/panoramas/admin");
        if (res.ok) {
          const data = await res.json();
          setPanoramas(data.panoramas || []);
        }
      } else if (activeTab === "map_config") {
        const res = await fetch("/api/map-configs");
        if (res.ok) {
          const data = await res.json();
          setMapConfigs(data.configs || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagesSubTab]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData, activeTab, pagesSubTab]);

  const handleEditPage = async (page: Page) => {
    try {
      const res = await fetch(`/api/page?type=${page.type}`);
      if (res.ok) {
        const data = await res.json();
        setEditingPage(page.type);
        setEditTitle(data.page.title || page.title);
        setEditContent(data.page.content || "");
      } else {
        throw new Error("Failed to load page content");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load page content",
      );
    }
  };

  const handleSavePage = async () => {
    if (!editingPage || !editTitle || !editContent) {
      setError("All fields are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/page/${editingPage}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });

      if (res.ok) {
        setEditingPage(null);
        await loadData();
        showSuccess("Page saved successfully");
      } else {
        throw new Error("Failed to save page");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMapPage = () => {
    setEditingMapPage(null);
    setMapPageForm({
      slug: "",
      title: "",
      description: "",
      is_published: false,
      layers: [],
      center_lat: 13.037,
      center_lng: 123.4589,
      zoom_level: 12,
    });
    setShowMapPageForm(true);
  };

  const handleEditMapPage = (page: MapPage) => {
    setEditingMapPage(page);
    setMapPageForm({
      slug: page.slug,
      title: page.title,
      description: page.description || "",
      is_published: Boolean(page.is_published),
      layers: page.layers || [],
      center_lat: Number(page.center_lat) || 13.037,
      center_lng: Number(page.center_lng) || 123.4589,
      zoom_level: Number(page.zoom_level) || 12,
    });
    setShowMapPageForm(true);
  };

  const handleSaveMapPage = async () => {
    if (!mapPageForm.slug || !mapPageForm.title) {
      setError("Slug and title are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingMapPage
        ? `/api/map-pages/${editingMapPage.id}`
        : "/api/map-pages";
      const method = editingMapPage ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapPageForm),
      });

      if (res.ok) {
        setShowMapPageForm(false);
        await loadData();
        showSuccess(editingMapPage ? "Map page updated" : "Map page created");
      } else {
        throw new Error(
          editingMapPage
            ? "Failed to update map page"
            : "Failed to create map page",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save map page");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapPage = async (pageId: number) => {
    if (!confirm("Are you sure you want to delete this map page?")) return;
    try {
      const res = await fetch(`/api/map-pages/${pageId}`, { method: "DELETE" });
      if (res.ok) {
        await loadData();
        showSuccess("Map page deleted");
      } else {
        throw new Error("Failed to delete map page");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete map page",
      );
    }
  };

  const handleTogglePublish = async (page: MapPage) => {
    try {
      const res = await fetch(`/api/map-pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !page.is_published }),
      });

      if (res.ok) {
        await loadData();
        showSuccess(page.is_published ? "Page unpublished" : "Page published");
      } else {
        throw new Error("Failed to update page status");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update page status",
      );
    }
  };

  const parseKMLToGeoJSON = (kmlText: string): object | null => {
    try {
      const parser = new DOMParser();
      const kml = parser.parseFromString(kmlText, "text/xml");
      const placemarks = kml.getElementsByTagName("Placemark");

      const features: object[] = [];

      for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i];
        const name =
          placemark.getElementsByTagName("name")[0]?.textContent || "";
        const description =
          placemark.getElementsByTagName("description")[0]?.textContent || "";

        const coordinates =
          placemark.getElementsByTagName("coordinates")[0]?.textContent;
        if (coordinates) {
          const coords = coordinates
            .trim()
            .split(/\s+/)
            .map((coord) => {
              const [lng, lat, alt] = coord.split(",").map(Number);
              return [lng, lat, alt || 0];
            });

          const polygon = placemark.getElementsByTagName("Polygon")[0];
          const lineString = placemark.getElementsByTagName("LineString")[0];
          const point = placemark.getElementsByTagName("Point")[0];

          let geometry: object;
          if (polygon) {
            geometry = {
              type: "Polygon",
              coordinates: [coords.map((c) => [c[0], c[1]])],
            };
          } else if (lineString) {
            geometry = {
              type: "LineString",
              coordinates: coords.map((c) => [c[0], c[1]]),
            };
          } else if (point) {
            geometry = {
              type: "Point",
              coordinates: [coords[0][0], coords[0][1]],
            };
          } else {
            continue;
          }

          features.push({
            type: "Feature",
            properties: { name, description },
            geometry,
          });
        }
      }

      return { type: "FeatureCollection", features };
    } catch {
      return null;
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFiles = async (files: File[]) => {
    setUploadingFile(true);
    setError(null);
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileType = ext === 'kml' ? 'kml' : ext === 'csv' ? 'csv' : (ext === 'geojson' || ext === 'json') ? 'geojson' : ext;
      let geojsonData: object | null = null;

      try {
        // Parse KML/GeoJSON/CSV client-side to attach geojson_data when possible
        if (ext === 'kml') {
          const text = await file.text();
          geojsonData = parseKMLToGeoJSON(text);
        } else if (ext === 'geojson' || ext === 'json') {
          const text = await file.text();
          try { geojsonData = JSON.parse(text); } catch {}
        } else if (ext === 'csv') {
          // CSV parsing could be implemented here if needed
          // geojsonData = parseCSVToGeoJSON(text);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('original_name', file.name || '');
        formData.append('file_type', fileType || '');
        formData.append('category', 'uncategorized');
        formData.append('description', '');
        formData.append('file_size', String(file.size));
        if (geojsonData) formData.append('geojson_data', JSON.stringify(geojsonData));

        const res = await fetch('/api/spatial-files/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to upload: ${file.name}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to upload: ${file.name}`);
      }
    }

    await loadData();
    setUploadingFile(false);
    showSuccess('Files uploaded successfully');
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      const res = await fetch(`/api/spatial-files/${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
        showSuccess("File deleted");
      } else {
        throw new Error("Failed to delete file");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  const handleUpdateFileCategory = async (
    fileId: number,
    newCategory: string,
  ) => {
    try {
      const res = await fetch(`/api/spatial-files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      });
      if (res.ok) {
        await loadData();
        showSuccess("Category updated");
      } else {
        throw new Error("Failed to update category");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update category",
      );
    }
  };

  const toggleLayer = (fileId: number) => {
    setActiveLayers((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const handleSaveTheme = async (mode: "light" | "dark") => {
    try {
      const res = await fetch("/api/settings/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (res.ok) {
        setThemeMode(mode);
        showSuccess("Theme updated");
      } else {
        throw new Error("Failed to update theme");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update theme");
    }
  };

  const handleLogout = async () => {
    await signOut();
    onNavigate?.("panorama");
  };

  const handleCreateButton = () => {
    setEditingButton(null);
    setButtonForm({
      button_id: "",
      label: "",
      folder_id: "",
      source_type: "drive",
      is_enabled: true,
      order_index: sidebarButtons.length,
    });
    setShowButtonForm(true);
  };

  const handleEditButton = (button: SidebarButton) => {
    setEditingButton(button);
    setButtonForm({
      button_id: button.button_id,
      label: button.label,
      folder_id: button.folder_id,
      source_type: button.source_type || "drive",
      is_enabled: button.is_enabled,
      order_index: button.order_index,
    });
    setShowButtonForm(true);
  };

  const handleSaveButton = async () => {
    if (!buttonForm.button_id || !buttonForm.label || !buttonForm.folder_id) {
      setError("All fields are required");
      return;
    }

    setSaving(true);
    // Optimistic update: prepare new or updated button locally
    if (!editingButton) {
      const tempId = `temp-${Date.now()}`;
      const newButton: any = {
        id: tempId,
        button_id: buttonForm.button_id,
        label: buttonForm.label,
        folder_id: buttonForm.folder_id,
        source_type: buttonForm.source_type || 'drive',
        is_enabled: buttonForm.is_enabled,
        order_index: buttonForm.order_index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // apply optimistic UI
      setSidebarButtons((prev) => [newButton, ...prev]);
      setShowButtonForm(false);

      try {
        const res = await fetch('/api/sidebar-buttons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            button_id: buttonForm.button_id,
            label: buttonForm.label,
            folder_id: buttonForm.folder_id,
            source_type: buttonForm.source_type || 'drive',
            is_enabled: buttonForm.is_enabled,
            order_index: buttonForm.order_index,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Create failed');
        const data = await res.json();
        // replace temp with server row
        setSidebarButtons((prev) => prev.map((b) => (String(b.id) === tempId ? data.button : b)));
        onSidebarUpdate?.();
        showSuccess('Button created');
      } catch (err) {
        // rollback
        setSidebarButtons((prev) => prev.filter((b) => String(b.id) !== tempId));
        setError(err instanceof Error ? err.message : 'Failed to create button');
      } finally {
        setSaving(false);
      }
    } else {
      // editing existing
      const prevButtons = sidebarButtons.slice();
      // optimistic update in-place
      setSidebarButtons((prev) => prev.map((b) => (b.id === editingButton.id ? { ...b, label: buttonForm.label, folder_id: buttonForm.folder_id, source_type: buttonForm.source_type || 'drive', is_enabled: buttonForm.is_enabled, order_index: buttonForm.order_index, updated_at: new Date().toISOString() } : b)));
      setShowButtonForm(false);

      try {
        const res = await fetch(`/api/sidebar-buttons/${editingButton.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            button_id: buttonForm.button_id,
            label: buttonForm.label,
            folder_id: buttonForm.folder_id,
            source_type: buttonForm.source_type || 'drive',
            is_enabled: buttonForm.is_enabled,
            order_index: buttonForm.order_index,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
        const data = await res.json();
        // reconcile with server response
        setSidebarButtons((prev) => prev.map((b) => (b.id === editingButton.id ? data.button : b)));
        onSidebarUpdate?.();
        showSuccess('Button updated');
      } catch (err) {
        // rollback
        setSidebarButtons(prevButtons);
        setError(err instanceof Error ? err.message : 'Failed to update button');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeleteButton = async (buttonId: number) => {
    if (!confirm("Are you sure you want to delete this button?")) return;
    // optimistic delete locally
    const previous = sidebarButtons.slice();
    setSidebarButtons((prev) => prev.filter((b) => b.id !== buttonId));
    try {
      const res = await fetch(`/api/sidebar-buttons/${buttonId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      onSidebarUpdate?.(); // Refresh sidebar menu
      showSuccess('Button deleted');
    } catch (err) {
      // rollback
      setSidebarButtons(previous);
      setError(err instanceof Error ? err.message : 'Failed to delete button');
    }
  };

  const handleToggleButton = async (button: SidebarButton) => {
    // optimistic toggle
    const previous = sidebarButtons.slice();
    setSidebarButtons((prev) => prev.map((b) => (b.id === button.id ? { ...b, is_enabled: !b.is_enabled } : b)));
    try {
      const res = await fetch(`/api/sidebar-buttons/${button.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !button.is_enabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      const data = await res.json();
      setSidebarButtons((prev) => prev.map((b) => (b.id === button.id ? data.button : b)));
      onSidebarUpdate?.(); // Refresh sidebar menu
      showSuccess(button.is_enabled ? 'Button disabled' : 'Button enabled');
    } catch (err) {
      setSidebarButtons(previous);
      setError(err instanceof Error ? err.message : 'Failed to update button status');
    }
  };

  const handleCreatePanorama = () => {
    setEditingPanorama(null);
    setPanoramaForm({
      name: "",
      description: "",
      image_url: "",
      thumbnail_url: "",
      is_active: true,
      order_index: panoramas.length,
    });
    setShowPanoramaForm(true);
  };

  const handleEditPanorama = (panorama: Panorama) => {
    setEditingPanorama(panorama);
    setPanoramaForm({
      name: panorama.name,
      description: panorama.description || "",
      image_url: panorama.image_url,
      thumbnail_url: panorama.thumbnail_url || "",
      is_active: Boolean(panorama.is_active),
      order_index: Number(panorama.order_index) || 0,
    });
    setShowPanoramaForm(true);
  };

  const handlePanoramaFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSize) {
      setError("Image size must be less than 10MB");
      return;
    }

    setPanoramaUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPanoramaForm((prev) => ({
          ...prev,
          image_url: dataUrl,
          thumbnail_url: dataUrl,
        }));
        setPanoramaUploading(false);
      };
      reader.onerror = () => {
        setError("Failed to read image file");
        setPanoramaUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to process image");
      setPanoramaUploading(false);
    }

    if (panoramaFileRef.current) {
      panoramaFileRef.current.value = "";
    }
  };

  const handleSavePanorama = async () => {
    if (!panoramaForm.name || !panoramaForm.image_url) {
      setError("Name and image are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingPanorama
        ? `/api/panoramas/${editingPanorama.id}`
        : "/api/panoramas";
      const method = editingPanorama ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(panoramaForm),
      });

      if (res.ok) {
        setShowPanoramaForm(false);
        await loadData();
        showSuccess(editingPanorama ? "Panorama updated" : "Panorama created");
      } else {
        const data = await res.json();
        throw new Error(
          data.error ||
            (editingPanorama
              ? "Failed to update panorama"
              : "Failed to create panorama"),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save panorama");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePanorama = async (panoramaId: number) => {
    if (!confirm("Are you sure you want to delete this panorama?")) return;
    try {
      const res = await fetch(`/api/panoramas/${panoramaId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
        showSuccess("Panorama deleted");
      } else {
        throw new Error("Failed to delete panorama");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete panorama",
      );
    }
  };

  const handleTogglePanorama = async (panorama: Panorama) => {
    try {
      const res = await fetch(`/api/panoramas/${panorama.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !panorama.is_active }),
      });

      if (res.ok) {
        await loadData();
        showSuccess(
          panorama.is_active ? "Panorama hidden" : "Panorama visible",
        );
      } else {
        throw new Error("Failed to update panorama status");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update panorama status",
      );
    }
  };

  const filteredFiles =
    selectedCategory === "all"
      ? spatialFiles
      : spatialFiles.filter((f) => f.category === selectedCategory);

  const categories = ["all", ...new Set(spatialFiles.map((f) => f.category))];

  const handleCreateMapConfig = () => {
    setEditingMapConfig(null);
    setMapConfigForm({
      config_name: "",
      description: "",
      default_center_lat: 13.037063,
      default_center_lng: 123.458907,
      default_zoom: 14,
      max_zoom: 19,
      min_zoom: 1,
      tile_layer_url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      tile_layer_attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      enable_location_marker: true,
      enable_reference_circle: true,
      reference_circle_radius: 1000,
      reference_circle_color: "#3b82f6",
      allowed_file_types: [".kml", ".geojson", ".csv"],
      max_file_size_mb: 10,
      is_active: false,
    });
    setShowMapConfigForm(true);
  };

  const handleEditMapConfig = (config: MapConfig) => {
    setEditingMapConfig(config);
    setMapConfigForm({
      config_name: config.config_name,
      description: config.description || "",
      default_center_lat: Number(config.default_center_lat) || 13.037063,
      default_center_lng: Number(config.default_center_lng) || 123.458907,
      default_zoom: Number(config.default_zoom) || 14,
      max_zoom: Number(config.max_zoom) || 19,
      min_zoom: Number(config.min_zoom) || 1,
      tile_layer_url: config.tile_layer_url,
      tile_layer_attribution: config.tile_layer_attribution,
      enable_location_marker: Boolean(config.enable_location_marker),
      enable_reference_circle: Boolean(config.enable_reference_circle),
      reference_circle_radius: Number(config.reference_circle_radius) || 1000,
      reference_circle_color: config.reference_circle_color || "#3b82f6",
      allowed_file_types: config.allowed_file_types || [".kml", ".geojson", ".csv"],
      max_file_size_mb: Number(config.max_file_size_mb) || 10,
      is_active: Boolean(config.is_active),
    });
    setShowMapConfigForm(true);
  };

  const handleSaveMapConfig = async () => {
    if (!mapConfigForm.config_name) {
      setError("Config name is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingMapConfig
        ? `/api/map-configs/${editingMapConfig.id}`
        : "/api/map-configs";
      const method = editingMapConfig ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapConfigForm),
      });

      if (res.ok) {
        setShowMapConfigForm(false);
        await loadData();
        showSuccess(
          editingMapConfig ? "Map config updated" : "Map config created",
        );
      } else {
        const data = await res.json();
        throw new Error(
          data.error ||
            (editingMapConfig
              ? "Failed to update map config"
              : "Failed to create map config"),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save map config",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapConfig = async (configId: number) => {
    if (!confirm("Are you sure you want to delete this map configuration?"))
      return;
    try {
      const res = await fetch(`/api/map-configs/${configId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
        showSuccess("Map config deleted");
      } else {
        throw new Error("Failed to delete map config");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete map config",
      );
    }
  };

  const handleToggleMapConfigActive = async (config: MapConfig) => {
    try {
      const res = await fetch(`/api/map-configs/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !config.is_active }),
      });

      if (res.ok) {
        await loadData();
        showSuccess(
          config.is_active ? "Config deactivated" : "Config activated",
        );
      } else {
        throw new Error("Failed to update config status");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update config status",
      );
    }
  };

  const sortedMapPages = [...mapPages]
    .sort((a, b) => {
      if (sortOrder === "asc") {
        return a[sortBy as keyof MapPage] > b[sortBy as keyof MapPage] ? 1 : -1;
      } else {
        return a[sortBy as keyof MapPage] < b[sortBy as keyof MapPage] ? 1 : -1;
      }
    })
    .filter(
      (page) =>
        page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.description.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  const sortedPanoramas = [...panoramas]
    .sort((a, b) => {
      if (sortOrder === "asc") {
        return a[sortBy as keyof Panorama] > b[sortBy as keyof Panorama]
          ? 1
          : -1;
      } else {
        return a[sortBy as keyof Panorama] < b[sortBy as keyof Panorama]
          ? 1
          : -1;
      }
    })
    .filter(
      (panorama) =>
        panorama.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        panorama.description.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/50 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="mb-4 text-gray-600">
              {!isConfigured
                ? "Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment."
                : "You must be logged in to access the admin panel."}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => onNavigate?.("login")}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                data-testid="button-go-to-login"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white/40 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 flex flex-col overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 font-medium"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      <div className="flex border-b border-white/30 bg-white/10 px-6">
        <button
          onClick={() => setActiveTab("pages")}
          className={`px-4 py-3 font-semibold flex items-center gap-2 transition-all duration-200 border-b-2 ${
            activeTab === "pages"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-700 hover:text-gray-900"
          }`}
        >
          <FileText size={18} />
          <span className="hidden sm:inline">Pages</span>
        </button>
        <button
          onClick={() => setActiveTab("database")}
          className={`px-4 py-3 font-semibold flex items-center gap-2 transition-all duration-200 border-b-2 ${
            activeTab === "database"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-700 hover:text-gray-900"
          }`}
        >
          <Database size={18} />
          <span className="hidden sm:inline">Database</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-3 font-semibold flex items-center gap-2 transition-all duration-200 border-b-2 ${
            activeTab === "settings"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-700 hover:text-gray-900"
          }`}
        >
          <Settings size={18} />
          <span className="hidden sm:inline">Settings</span>
        </button>
        <button
          onClick={() => setActiveTab("rbac")}
          className={`px-4 py-3 font-semibold flex items-center gap-2 transition-all duration-200 border-b-2 ${
            activeTab === "rbac"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-700 hover:text-gray-900"
          }`}
        >
          <Shield size={18} />
          <span className="hidden sm:inline">RBAC</span>
        </button>
        <button
          onClick={() => setActiveTab("sidebar")}
          className={`px-4 py-3 font-semibold flex items-center gap-2 transition-all duration-200 border-b-2 ${
            activeTab === "sidebar"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-700 hover:text-gray-900"
          }`}
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Sidebar</span>
        </button>
        <button
          onClick={() => setActiveTab("panoramas")}
          className={`px-4 py-3 font-semibold flex items-center gap-2 transition-all duration-200 border-b-2 ${
            activeTab === "panoramas"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-700 hover:text-gray-900"
          }`}
        >
          <Image size={18} />
          <span className="hidden sm:inline">Panoramas</span>
        </button>
        <button
          onClick={() => setActiveTab("map_config")}
          className={`px-4 py-3 font-semibold flex items-center gap-2 transition-all duration-200 border-b-2 ${
            activeTab === "map_config"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-700 hover:text-gray-900"
          }`}
        >
          <Map size={18} />
          <span className="hidden sm:inline">Map Config</span>
        </button>
      </div>

      {successMessage && (
        <div className="mx-6 mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-700 hover:text-green-900"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-700 hover:text-red-900"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="animate-spin text-blue-500" size={32} />
              <p className="text-gray-600">Loading data...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "pages" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <button
                    onClick={() => setPagesSubTab("map")}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                      pagesSubTab === "map"
                        ? "bg-blue-500 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                    }`}
                  >
                    <Map size={16} />
                    Map Pages
                  </button>
                  <button
                    onClick={() => setPagesSubTab("system")}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                      pagesSubTab === "system"
                        ? "bg-blue-500 text-white shadow-md"
                        : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                    }`}
                  >
                    <FileText size={16} />
                    System Pages
                  </button>
                </div>

                {pagesSubTab === "map" && (
                  <>
                    {showMapPageForm ? (
                      <div className="bg-white p-6 rounded-xl shadow-lg border border-white/50">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold text-gray-800">
                            {editingMapPage
                              ? "Edit Map Page"
                              : "Create New Map Page"}
                          </h3>
                          <button
                            onClick={() => setShowMapPageForm(false)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Slug *
                            </label>
                            <input
                              type="text"
                              value={mapPageForm.slug}
                              onChange={(e) =>
                                setMapPageForm({
                                  ...mapPageForm,
                                  slug: e.target.value
                                    .toLowerCase()
                                    .replace(/\s+/g, "-"),
                                })
                              }
                              placeholder="evacuation-routes"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Used in URLs (e.g., /maps/evacuation-routes)
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Title *
                            </label>
                            <input
                              type="text"
                              value={mapPageForm.title}
                              onChange={(e) =>
                                setMapPageForm({
                                  ...mapPageForm,
                                  title: e.target.value,
                                })
                              }
                              placeholder="Evacuation Routes Map"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Description
                            </label>
                            <textarea
                              value={mapPageForm.description}
                              onChange={(e) =>
                                setMapPageForm({
                                  ...mapPageForm,
                                  description: e.target.value,
                                })
                              }
                              rows={3}
                              placeholder="Brief description of this map page..."
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Center Latitude
                            </label>
                            <input
                              type="number"
                              step="0.0001"
                              value={mapPageForm.center_lat}
                              onChange={(e) =>
                                setMapPageForm({
                                  ...mapPageForm,
                                  center_lat: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Center Longitude
                            </label>
                            <input
                              type="number"
                              step="0.0001"
                              value={mapPageForm.center_lng}
                              onChange={(e) =>
                                setMapPageForm({
                                  ...mapPageForm,
                                  center_lng: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Zoom Level
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={mapPageForm.zoom_level}
                              onChange={(e) =>
                                setMapPageForm({
                                  ...mapPageForm,
                                  zoom_level: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                          </div>

                          <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mapPageForm.is_published}
                                onChange={(e) =>
                                  setMapPageForm({
                                    ...mapPageForm,
                                    is_published: e.target.checked,
                                  })
                                }
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-semibold text-gray-700">
                                Publish this page
                              </span>
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                          <button
                            onClick={handleSaveMapPage}
                            disabled={saving}
                            className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {saving ? (
                              <>
                                <RefreshCw className="animate-spin" size={18} />
                                Saving...
                              </>
                            ) : (
                              "Save Page"
                            )}
                          </button>
                          <button
                            onClick={() => setShowMapPageForm(false)}
                            className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-800">
                              Map Pages
                            </h2>
                            <p className="text-gray-600">
                              Manage your interactive map pages
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <div className="relative">
                              <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                size={18}
                              />
                              <input
                                type="text"
                                placeholder="Search map pages..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                            </div>
                            <select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                              <option value="title">Title</option>
                              <option value="created_at">Created Date</option>
                              <option value="updated_at">Updated Date</option>
                            </select>
                            <button
                              onClick={() =>
                                setSortOrder(
                                  sortOrder === "asc" ? "desc" : "asc",
                                )
                              }
                              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </button>
                            <button
                              onClick={handleCreateMapPage}
                              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              <Plus size={18} />
                              Create Page
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {sortedMapPages.length === 0 ? (
                            <div className="col-span-full bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
                              <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                No map pages found
                              </h3>
                              <p className="text-gray-500 mb-4">
                                {searchTerm
                                  ? "Try adjusting your search"
                                  : "Create your first interactive map page to get started"}
                              </p>
                              <button
                                onClick={handleCreateMapPage}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                              >
                                Create Your First Page
                              </button>
                            </div>
                          ) : (
                            sortedMapPages.map((page) => (
                              <div
                                key={page.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
                              >
                                <div className="p-5">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <h3 className="font-bold text-gray-900 text-lg">
                                        {page.title}
                                      </h3>
                                      <p className="text-sm text-gray-500 mt-1">
                                        /{page.slug}
                                      </p>
                                    </div>
                                    <span
                                      className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                                        page.is_published
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {page.is_published
                                        ? "Published"
                                        : "Draft"}
                                    </span>
                                  </div>

                                  {page.description && (
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                      {page.description}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                                    <span>
                                      Lat: {Number(page.center_lat).toFixed(4)}
                                    </span>
                                    <span>
                                      Lng: {Number(page.center_lng).toFixed(4)}
                                    </span>
                                    <span>Zoom: {page.zoom_level}</span>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleTogglePublish(page)}
                                      className={`p-2 rounded-lg transition flex-1 flex items-center justify-center gap-1 ${
                                        page.is_published
                                          ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                                          : "bg-green-100 hover:bg-green-200 text-green-700"
                                      }`}
                                      title={
                                        page.is_published
                                          ? "Unpublish"
                                          : "Publish"
                                      }
                                    >
                                      {page.is_published ? (
                                        <EyeOff size={16} />
                                      ) : (
                                        <Eye size={16} />
                                      )}
                                      <span>
                                        {page.is_published
                                          ? "Unpublish"
                                          : "Publish"}
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => handleEditMapPage(page)}
                                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition flex items-center justify-center"
                                      title="Edit"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteMapPage(page.id)
                                      }
                                      className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition flex items-center justify-center"
                                      title="Delete"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}

                {pagesSubTab === "system" && (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          System Pages
                        </h2>
                        <p className="text-gray-600">
                          Manage static content pages
                        </p>
                      </div>
                    </div>

                    {editingPage ? (
                      <div className="bg-white p-6 rounded-xl shadow-lg border border-white/50">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold text-gray-800">
                            Edit Page: {editingPage}
                          </h3>
                          <button
                            onClick={() => setEditingPage(null)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="space-y-5">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Title
                            </label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Content
                            </label>
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={12}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={handleSavePage}
                              disabled={saving}
                              className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {saving ? (
                                <>
                                  <RefreshCw
                                    className="animate-spin"
                                    size={18}
                                  />
                                  Saving...
                                </>
                              ) : (
                                "Save Changes"
                              )}
                            </button>
                            <button
                              onClick={() => setEditingPage(null)}
                              className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {pages.map((page) => (
                          <div
                            key={page.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
                          >
                            <div className="p-5">
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-gray-900 text-lg">
                                  {page.title}
                                </h3>
                                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                  {page.type}
                                </span>
                              </div>

                              <div className="text-sm text-gray-500 mb-4">
                                <p>
                                  Last updated:{" "}
                                  {new Date(
                                    page.updated_at,
                                  ).toLocaleDateString()}
                                </p>
                              </div>

                              <button
                                onClick={() => handleEditPage(page)}
                                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                <Edit2 size={16} />
                                Edit Content
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "database" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                      <Database className="text-blue-500" size={24} />
                      Database Information
                    </h2>

                    {dbInfo && (
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600">
                            Database Version
                          </p>
                          <p className="text-lg font-semibold text-gray-900">
                            {dbInfo.version}
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Total Tables</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {dbInfo.tableCount}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-3">
                            Database Tables
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {dbInfo.tables.map((table) => (
                              <span
                                key={table}
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg font-medium"
                              >
                                {table}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={`bg-white p-6 rounded-xl shadow-sm border-2 border-dashed transition-all duration-200 ${
                      isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                  >
                    <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                      <Upload className="text-green-500" size={24} />
                      Upload Spatial Data
                    </h2>

                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload size={32} className="text-gray-400" />
                      </div>

                      <p className="text-gray-600 mb-2 font-medium">
                        {isDragging
                          ? "Drop files here"
                          : "Drag & drop files to upload"}
                      </p>
                      <p className="text-sm text-gray-500 mb-5">
                        Supports KML, GeoJSON, and CSV formats
                      </p>

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".kml,.geojson,.json,.csv"
                        multiple
                        className="hidden"
                      />

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                      >
                        {uploadingFile ? (
                          <>
                            <RefreshCw className="animate-spin" size={18} />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            Browse Files
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Layers className="text-purple-500" size={24} />
                        Spatial Files
                      </h2>
                      <p className="text-gray-600">
                        Manage your geospatial data files
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          type="text"
                          placeholder="Search files..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Filter size={18} className="text-gray-500" />
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat === "all"
                                ? "All Categories"
                                : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {filteredFiles.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} className="text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No spatial files found
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Upload your first geospatial file to get started
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Upload Files
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              Preview
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              File Name
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              Type
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              Category
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              Size
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredFiles.map((file) => (
                            <tr
                              key={file.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => toggleLayer(file.id)}
                                  className={`p-2 rounded-lg transition ${
                                    activeLayers.includes(file.id)
                                      ? "bg-blue-500 text-white"
                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  }`}
                                  title={
                                    activeLayers.includes(file.id)
                                      ? "Hide on map"
                                      : "Show on map"
                                  }
                                >
                                  <Eye size={16} />
                                </button>
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900">
                                <div
                                  className="max-w-xs truncate"
                                  title={file.original_name}
                                >
                                  {file.original_name}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                                    file.file_type === "kml"
                                      ? "bg-green-100 text-green-800"
                                      : file.file_type === "geojson"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {file.file_type.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={file.category}
                                  onChange={(e) =>
                                    handleUpdateFileCategory(
                                      file.id,
                                      e.target.value,
                                    )
                                  }
                                  className="px-2.5 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                  <option value="uncategorized">
                                    Uncategorized
                                  </option>
                                  <option value="evacuation">Evacuation</option>
                                  <option value="hazard">Hazard Zones</option>
                                  <option value="boundaries">Boundaries</option>
                                  <option value="infrastructure">
                                    Infrastructure
                                  </option>
                                </select>
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {file.file_size > 1024
                                  ? `${(file.file_size / 1024).toFixed(1)} KB`
                                  : `${file.file_size} B`}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {activeLayers.length > 0 && (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                      <Map className="text-indigo-500" size={24} />
                      Map Preview
                    </h2>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg h-64 flex items-center justify-center border border-gray-200">
                      <div className="text-center">
                        <Map className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">
                          {activeLayers.length} layer
                          {activeLayers.length > 1 ? "s" : ""} selected for
                          preview
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Interactive map preview would appear here
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "rbac" && <RBACManagement />}

            {activeTab === "sidebar" && (
              <div className="space-y-6">
                {showButtonForm ? (
                  <div className="bg-white p-6 rounded-xl shadow-lg border border-white/50">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800">
                        {editingButton
                          ? "Edit Sidebar Button"
                          : "Create New Sidebar Button"}
                      </h3>
                      <button
                        onClick={() => setShowButtonForm(false)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Button ID *
                        </label>
                        <input
                          type="text"
                          value={buttonForm.button_id}
                          onChange={(e) =>
                            setButtonForm({
                              ...buttonForm,
                              button_id: e.target.value
                                .toLowerCase()
                                .replace(/\s+/g, "_"),
                            })
                          }
                          placeholder="custom_gallery"
                          disabled={!!editingButton}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          {editingButton
                            ? "Button ID cannot be changed"
                            : "Unique identifier (lowercase, underscores only)"}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Label *
                        </label>
                        <input
                          type="text"
                          value={buttonForm.label}
                          onChange={(e) =>
                            setButtonForm({
                              ...buttonForm,
                              label: e.target.value,
                            })
                          }
                          placeholder="CUSTOM GALLERY"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Google Drive Folder ID *
                        </label>
                        <input
                          type="text"
                          value={buttonForm.folder_id}
                          onChange={(e) =>
                            setButtonForm({
                              ...buttonForm,
                              folder_id: e.target.value,
                            })
                          }
                          placeholder="1nkaUS4tu2UIX9yD1x3T-6NI0DQK6L8-U"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          From Google Drive folder URL (the part after
                          /folders/)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Order Index
                        </label>
                        <input
                          type="number"
                          value={buttonForm.order_index}
                          onChange={(e) =>
                            setButtonForm({
                              ...buttonForm,
                              order_index: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Lower numbers appear first in sidebar
                        </p>
                      </div>

                      <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={buttonForm.is_enabled}
                            onChange={(e) =>
                              setButtonForm({
                                ...buttonForm,
                                is_enabled: e.target.checked,
                              })
                            }
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-semibold text-gray-700">
                            Enable this button
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                      <button
                        onClick={handleSaveButton}
                        disabled={saving}
                        className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="animate-spin" size={18} />
                            Saving...
                          </>
                        ) : (
                          "Save Button"
                        )}
                      </button>
                      <button
                        onClick={() => setShowButtonForm(false)}
                        className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          Sidebar Menu Configuration
                        </h2>
                        <p className="text-gray-600">
                          Manage custom sidebar buttons and their Google Drive
                          folders
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={loadData}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          <RefreshCw size={18} />
                          Refresh
                        </button>
                        <button
                          onClick={handleCreateButton}
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          <Plus size={18} />
                          Add Button
                        </button>
                      </div>
                    </div>

                    {sidebarButtons.length === 0 ? (
                      <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
                        <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                          No custom buttons configured
                        </h3>
                        <p className="text-gray-500 mb-4">
                          Create your first custom sidebar button to add a new
                          menu item linked to a Google Drive folder
                        </p>
                        <button
                          onClick={handleCreateButton}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                        >
                          Create Button
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-start gap-3">
                            <Info
                              className="text-blue-500 mt-0.5 flex-shrink-0"
                              size={20}
                            />
                            <div className="text-sm">
                              <p className="font-medium text-blue-900 mb-1">
                                Sidebar Menu Info
                              </p>
                              <p className="text-blue-700">
                                <strong>Total Buttons:</strong>{" "}
                                {sidebarButtons.length} |
                                <strong className="ml-2">Enabled:</strong>{" "}
                                {
                                  sidebarButtons.filter((b) => b.is_enabled)
                                    .length
                                }{" "}
                                |<strong className="ml-2">Disabled:</strong>{" "}
                                {
                                  sidebarButtons.filter((b) => !b.is_enabled)
                                    .length
                                }
                              </p>
                              <p className="text-blue-600 mt-1 text-xs">
                                Only enabled buttons will appear in the sidebar
                                menu. Changes are reflected immediately.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                  Order
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                  Label
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                  Button ID
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                  Folder ID
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                  Created
                                </th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {sidebarButtons.map((button) => (
                                <tr
                                  key={button.id}
                                  className="hover:bg-gray-50 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full font-bold text-gray-700">
                                      {button.order_index}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-gray-900">
                                      {button.label}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <code className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                                      {button.button_id}
                                    </code>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div
                                      className="max-w-xs truncate font-mono text-xs text-gray-600"
                                      title={button.folder_id}
                                    >
                                      {button.folder_id}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`px-3 py-1.5 text-xs rounded-full font-semibold ${button.is_enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                                    >
                                      {button.is_enabled
                                        ? "✓ Enabled"
                                        : "✗ Disabled"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-500">
                                    {new Date(
                                      button.created_at,
                                    ).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          handleToggleButton(button)
                                        }
                                        className={`p-2 rounded-lg transition ${button.is_enabled ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-700" : "bg-green-100 hover:bg-green-200 text-green-700"}`}
                                        title={
                                          button.is_enabled
                                            ? "Disable"
                                            : "Enable"
                                        }
                                      >
                                        {button.is_enabled ? (
                                          <EyeOff size={16} />
                                        ) : (
                                          <Eye size={16} />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => handleEditButton(button)}
                                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition"
                                        title="Edit"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteButton(button.id)
                                        }
                                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                                        title="Delete"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "panoramas" && (
              <div className="space-y-6">
                {showPanoramaForm ? (
                  <div className="bg-white p-6 rounded-xl shadow-lg border border-white/50">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800">
                        {editingPanorama ? "Edit Panorama" : "Add New Panorama"}
                      </h3>
                      <button
                        onClick={() => setShowPanoramaForm(false)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={panoramaForm.name}
                          onChange={(e) =>
                            setPanoramaForm({
                              ...panoramaForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Municipal Hall 360"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Order Index
                        </label>
                        <input
                          type="number"
                          value={panoramaForm.order_index}
                          onChange={(e) =>
                            setPanoramaForm({
                              ...panoramaForm,
                              order_index: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Lower numbers appear first
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={panoramaForm.description}
                          onChange={(e) =>
                            setPanoramaForm({
                              ...panoramaForm,
                              description: e.target.value,
                            })
                          }
                          rows={3}
                          placeholder="Brief description of this panorama location..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Panorama Image *
                        </label>
                        <div className="space-y-4">
                          <div
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                              panoramaForm.image_url
                                ? "border-green-300 bg-green-50"
                                : "border-gray-300 hover:border-blue-400"
                            }`}
                          >
                            {panoramaForm.image_url ? (
                              <div className="space-y-4">
                                <div className="relative inline-block">
                                  <img
                                    src={panoramaForm.image_url}
                                    alt="Preview"
                                    className="max-h-48 rounded-lg shadow-md mx-auto"
                                  />
                                  <button
                                    onClick={() =>
                                      setPanoramaForm({
                                        ...panoramaForm,
                                        image_url: "",
                                        thumbnail_url: "",
                                      })
                                    }
                                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                                <p className="text-sm text-green-600 font-medium">
                                  Image uploaded successfully
                                </p>
                              </div>
                            ) : (
                              <div>
                                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 mb-2">
                                  {panoramaUploading
                                    ? "Processing image..."
                                    : "Click to upload or drag and drop"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  PNG, JPG, WEBP up to 10MB
                                </p>
                                <input
                                  ref={panoramaFileRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePanoramaFileSelect}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  disabled={panoramaUploading}
                                />
                              </div>
                            )}
                          </div>

                          <div className="text-center text-sm text-gray-500">
                            — or —
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Or paste image URL
                            </label>
                            <input
                              type="url"
                              value={
                                panoramaForm.image_url.startsWith("data:")
                                  ? ""
                                  : panoramaForm.image_url
                              }
                              onChange={(e) =>
                                setPanoramaForm({
                                  ...panoramaForm,
                                  image_url: e.target.value,
                                  thumbnail_url: e.target.value,
                                })
                              }
                              placeholder="https://example.com/panorama.jpg"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={panoramaForm.is_active}
                            onChange={(e) =>
                              setPanoramaForm({
                                ...panoramaForm,
                                is_active: e.target.checked,
                              })
                            }
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-semibold text-gray-700">
                            Show in gallery
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                      <button
                        onClick={handleSavePanorama}
                        disabled={saving || panoramaUploading}
                        className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="animate-spin" size={18} />
                            Saving...
                          </>
                        ) : (
                          "Save Panorama"
                        )}
                      </button>
                      <button
                        onClick={() => setShowPanoramaForm(false)}
                        className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          Panorama Management
                        </h2>
                        <p className="text-gray-600">
                          Upload and manage 360° panorama images for the gallery
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="relative">
                          <Search
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                            size={18}
                          />
                          <input
                            type="text"
                            placeholder="Search panoramas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </div>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                          <option value="name">Name</option>
                          <option value="created_at">Created Date</option>
                          <option value="order_index">Order Index</option>
                        </select>
                        <button
                          onClick={() =>
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </button>
                        <button
                          onClick={loadData}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          <RefreshCw size={18} />
                          Refresh
                        </button>
                        <button
                          onClick={handleCreatePanorama}
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          <Plus size={18} />
                          Add Panorama
                        </button>
                      </div>
                    </div>

                    {sortedPanoramas.length === 0 ? (
                      <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
                        <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                          {searchTerm
                            ? "No panoramas found"
                            : "No panoramas yet"}
                        </h3>
                        <p className="text-gray-500 mb-4">
                          {searchTerm
                            ? "Try adjusting your search"
                            : "Upload your first 360° panorama image to display in the gallery"}
                        </p>
                        <button
                          onClick={handleCreatePanorama}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                        >
                          Add First Panorama
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-start gap-3">
                            <Info
                              className="text-blue-500 mt-0.5 flex-shrink-0"
                              size={20}
                            />
                            <div className="text-sm">
                              <p className="font-medium text-blue-900 mb-1">
                                Panorama Gallery Info
                              </p>
                              <p className="text-blue-700">
                                <strong>Total:</strong> {panoramas.length} |
                                <strong className="ml-2">Active:</strong>{" "}
                                {panoramas.filter((p) => p.is_active).length} |
                                <strong className="ml-2">Hidden:</strong>{" "}
                                {panoramas.filter((p) => !p.is_active).length}
                              </p>
                              <p className="text-blue-600 mt-1 text-xs">
                                Only active panoramas are visible in the public
                                gallery view.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {sortedPanoramas.map((panorama) => (
                            <div
                              key={panorama.id}
                              className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 ${
                                panorama.is_active
                                  ? "border-gray-200"
                                  : "border-gray-200 opacity-60"
                              }`}
                            >
                              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                <img
                                  src={
                                    panorama.thumbnail_url || panorama.image_url
                                  }
                                  alt={panorama.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                <div className="absolute top-2 right-2">
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                                      panorama.is_active
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-500 text-white"
                                    }`}
                                  >
                                    {panorama.is_active ? "Active" : "Hidden"}
                                  </span>
                                </div>
                                <div className="absolute top-2 left-2">
                                  <span className="px-2 py-1 bg-sky-500 text-white text-xs rounded-full font-bold">
                                    360°
                                  </span>
                                </div>
                              </div>
                              <div className="p-4">
                                <h4 className="font-semibold text-gray-900 mb-1 truncate">
                                  {panorama.name}
                                </h4>
                                {panorama.description && (
                                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                                    {panorama.description}
                                  </p>
                                )}
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                                  <span>Order: {panorama.order_index}</span>
                                  <span>
                                    {new Date(
                                      panorama.created_at,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      handleTogglePanorama(panorama)
                                    }
                                    className={`p-2 rounded-lg transition flex-1 flex items-center justify-center gap-1 ${
                                      panorama.is_active
                                        ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                                        : "bg-green-100 hover:bg-green-200 text-green-700"
                                    }`}
                                    title={panorama.is_active ? "Hide" : "Show"}
                                  >
                                    {panorama.is_active ? (
                                      <EyeOff size={16} />
                                    ) : (
                                      <Eye size={16} />
                                    )}
                                    <span className="text-xs">
                                      {panorama.is_active ? "Hide" : "Show"}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleEditPanorama(panorama)}
                                    className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition flex items-center justify-center"
                                    title="Edit"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeletePanorama(panorama.id)
                                    }
                                    className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition flex items-center justify-center"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "map_config" && (
              <MapConfigTab
                mapConfigs={mapConfigs}
                showMapConfigForm={showMapConfigForm}
                setShowMapConfigForm={setShowMapConfigForm}
                editingMapConfig={editingMapConfig}
                mapConfigForm={mapConfigForm}
                setMapConfigForm={setMapConfigForm}
                onCreateMapConfig={handleCreateMapConfig}
                onEditMapConfig={handleEditMapConfig}
                onSaveMapConfig={handleSaveMapConfig}
                onDeleteMapConfig={handleDeleteMapConfig}
                onToggleMapConfigActive={handleToggleMapConfigActive}
                saving={saving}
              />
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <Sun className="text-yellow-500" size={24} />
                    Theme Settings
                  </h2>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Color Mode
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => handleSaveTheme("light")}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                            themeMode === "light"
                              ? "border-blue-500 bg-blue-50 shadow-sm"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                            <Sun size={24} className="text-yellow-500" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900">
                              Light Mode
                            </p>
                            <p className="text-sm text-gray-600">
                              Bright and clean interface
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleSaveTheme("dark")}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                            themeMode === "dark"
                              ? "border-blue-500 bg-blue-50 shadow-sm"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                            <Moon size={24} className="text-indigo-300" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900">
                              Dark Mode
                            </p>
                            <p className="text-sm text-gray-600">
                              Reduced eye strain in low light
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <Settings className="text-blue-500" size={24} />
                    Application Configuration
                  </h2>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Application Name
                      </label>
                      <input
                        type="text"
                        defaultValue={
                          settings.app_config?.appName ||
                          "MDRRMO Pio Duran Dashboard"
                        }
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                      />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <RefreshCw className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Offline Sync
                        </p>
                        <p className="text-sm text-gray-600">
                          Coming soon in future updates
                        </p>
                      </div>
                      <div className="ml-auto">
                        <div className="relative inline-block w-12 h-6">
                          <input
                            type="checkbox"
                            className="opacity-0 w-0 h-0 peer"
                            disabled
                          />
                          <span className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full transition peer-checked:bg-blue-500 peer-disabled:bg-gray-200"></span>
                          <span className="absolute h-4 w-4 bg-white rounded-full left-1 top-1 transition peer-checked:translate-x-6 peer-disabled:bg-gray-300"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <Users className="text-purple-500" size={24} />
                    Role-Based Access Control
                  </h2>

                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Configure user roles and permissions for different access
                      levels
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {settings.roles &&
                        Object.entries(settings.roles).map(
                          ([role, permissions]) => (
                            <div
                              key={role}
                              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                            >
                              <h4 className="font-bold text-gray-900 capitalize mb-3">
                                {role}
                              </h4>
                              <div className="space-y-2">
                                {(permissions as string[]).length > 0 ? (
                                  (permissions as string[]).map((perm) => (
                                    <span
                                      key={perm}
                                      className="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium mr-1 mb-1"
                                    >
                                      {perm.replace(/_/g, " ")}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-500 text-sm">
                                    No permissions assigned
                                  </span>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                    </div>

                    <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="flex items-start gap-3">
                        <Info
                          className="text-purple-500 mt-0.5 flex-shrink-0"
                          size={20}
                        />
                        <div>
                          <p className="font-medium text-purple-900">
                            RBAC Feature Coming Soon
                          </p>
                          <p className="text-sm text-purple-700 mt-1">
                            Advanced role-based access control will be available
                            in the next major update.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
