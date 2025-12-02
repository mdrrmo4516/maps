import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Info,
  List,
  Grid,
  Database,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import type { SidebarButton, SidebarButtonFormData } from "./types";
import { useState, useEffect, useCallback } from "react";

interface SidebarTabProps {
  sidebarButtons: SidebarButton[];
  showButtonForm: boolean;
  setShowButtonForm: (show: boolean) => void;
  editingButton: SidebarButton | null;
  buttonForm: SidebarButtonFormData;
  setButtonForm: (form: SidebarButtonFormData) => void;
  onCreateButton: () => void;
  onEditButton: (button: SidebarButton) => void;
  onSaveButton: () => void;
  onDeleteButton: (id: number) => void;
  onToggleButton: (button: SidebarButton) => void;
  onRefresh: () => void;
  saving: boolean;
  loading: boolean;
  error: string | null;
}

export default function SidebarTab({
  sidebarButtons,
  showButtonForm,
  setShowButtonForm,
  editingButton,
  buttonForm,
  setButtonForm,
  onCreateButton,
  onEditButton,
  onSaveButton,
  onDeleteButton,
  onToggleButton,
  onRefresh,
  saving,
  loading,
  error,
}: SidebarTabProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'order_index' | 'label' | 'created_at'>('order_index');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Local fetch state (component can fetch directly from Supabase if parent doesn't provide data)
  const [localButtons, setLocalButtons] = useState<SidebarButton[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Choose data source: parent props override local fetch
  const effectiveButtons = (sidebarButtons && sidebarButtons.length > 0) ? sidebarButtons : localButtons;
  const effectiveLoading = loading || localLoading;
  const effectiveError = error || localError;

  const fetchSidebarButtons = useCallback(async () => {
    setLocalLoading(true);
    setLocalError(null);
    try {
      const res = await fetch('/api/sidebar-buttons');
      if (!res.ok) throw new Error('Failed to fetch sidebar buttons');
      const data = await res.json();
      setLocalButtons(data.buttons || []);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setLocalLoading(false);
    }
  }, []);

  // Filter and sort buttons
  const filteredAndSortedButtons = [...(effectiveButtons || [])]
    .filter(button => {
      if (filterStatus === 'enabled') return button.is_enabled;
      if (filterStatus === 'disabled') return !button.is_enabled;
      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'order_index':
          aValue = a.order_index;
          bValue = b.order_index;
          break;
        case 'label':
          aValue = a.label.toLowerCase();
          bValue = b.label.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = a.order_index;
          bValue = b.order_index;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Fetch buttons from database on mount
  useEffect(() => {
    // If parent provided buttons, prefer those. Otherwise fetch locally.
    if (!sidebarButtons || sidebarButtons.length === 0) {
      fetchSidebarButtons();
    }
  }, [sidebarButtons, fetchSidebarButtons]);

  // When parent triggers refresh, call local fetch too
  const handleRefresh = async () => {
    if (onRefresh) onRefresh();
    await fetchSidebarButtons();
  };

  return (
    <div className="space-y-6">
      {showButtonForm ? (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-white/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              {editingButton ? "Edit Sidebar Button" : "Create New Sidebar Button"}
            </h3>
            <button
              onClick={() => setShowButtonForm(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              data-testid="button-close-sidebar-form"
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
                    button_id: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                  })
                }
                placeholder="custom_gallery"
                disabled={!!editingButton}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                data-testid="input-button-id"
              />
              <p className="mt-1 text-xs text-gray-500">
                {editingButton
                  ? "Button ID cannot be changed"
                  : "Unique identifier (lowercase, underscores only)"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Label *</label>
              <input
                type="text"
                value={buttonForm.label}
                onChange={(e) => setButtonForm({ ...buttonForm, label: e.target.value })}
                placeholder="CUSTOM GALLERY"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="input-button-label"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Source Type *
              </label>
              <select
                value={buttonForm.source_type || 'drive'}
                onChange={(e) => setButtonForm({ ...buttonForm, source_type: e.target.value as 'drive' | 'photos', folder_id: '' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="select-source-type"
              >
                <option value="drive">Google Drive Folder</option>
                <option value="photos">Google Photos Share Link</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {buttonForm.source_type === 'photos' ? 'Google Photos Share Link *' : 'Google Drive Folder ID *'}
              </label>
              <input
                type="text"
                value={buttonForm.folder_id}
                onChange={(e) => setButtonForm({ ...buttonForm, folder_id: e.target.value })}
                placeholder={buttonForm.source_type === 'photos' ? 'https://photos.app.goo.gl/xxxxx' : '1nkaUS4tu2UIX9yD1x3T-6NI0DQK6L8-U'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                data-testid="input-folder-id"
              />
              <p className="mt-1 text-xs text-gray-500">
                {buttonForm.source_type === 'photos' 
                  ? 'Full Google Photos share link (e.g., https://photos.app.goo.gl/xxxxx)'
                  : 'From Google Drive folder URL (the part after /folders/)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Order Index</label>
              <input
                type="number"
                value={buttonForm.order_index}
                onChange={(e) =>
                  setButtonForm({ ...buttonForm, order_index: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                data-testid="input-order-index"
              />
              <p className="mt-1 text-xs text-gray-500">Lower numbers appear first in sidebar</p>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={buttonForm.is_enabled}
                  onChange={(e) => setButtonForm({ ...buttonForm, is_enabled: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  data-testid="checkbox-enabled"
                />
                <span className="text-sm font-semibold text-gray-700">Enable this button</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onSaveButton}
              disabled={saving}
              className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              data-testid="button-save-sidebar-button"
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
              data-testid="button-cancel-sidebar-form"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Sidebar Menu Configuration</h2>
              <p className="text-gray-600">
                Manage custom sidebar buttons and their Google Drive folders
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'list' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="List view"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${
                    viewMode === 'grid' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="Grid view"
                >
                  <Grid size={18} />
                </button>
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
              
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="order_index-asc">Order (Low to High)</option>
                <option value="order_index-desc">Order (High to Low)</option>
                <option value="label-asc">Label (A-Z)</option>
                <option value="label-desc">Label (Z-A)</option>
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
              </select>
              
              <button
                onClick={handleRefresh}
                disabled={effectiveLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                data-testid="button-refresh-sidebar"
              >
                <RefreshCw size={18} className={effectiveLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={onCreateButton}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                data-testid="button-create-sidebar-button"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Button</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-500" size={20} />
              <div>
                <p className="font-medium text-red-800">Error loading sidebar buttons</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button
                onClick={onRefresh}
                className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Loading sidebar buttons...
              </h3>
              <p className="text-gray-500">
                Fetching data from database
              </p>
            </div>
          ) : sidebarButtons.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
              <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No custom buttons configured
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first custom sidebar button to add a new menu item linked to a Google
                Drive folder
              </p>
              <button
                onClick={onCreateButton}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                data-testid="button-create-first-button"
              >
                Create Button
              </button>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-start gap-3">
                    <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">Sidebar Menu Info</p>
                      <p className="text-blue-700">
                        <strong>Total Buttons:</strong> {sidebarButtons.length} |
                        <strong className="ml-2">Enabled:</strong>{" "}
                        {sidebarButtons.filter((b) => b.is_enabled).length} |
                        <strong className="ml-2">Disabled:</strong>{" "}
                        {sidebarButtons.filter((b) => !b.is_enabled).length}
                      </p>
                    </div>
                  </div>
                  
                  {filteredAndSortedButtons.length !== sidebarButtons.length && (
                    <div className="ml-auto flex items-center gap-2 text-sm">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Showing {filteredAndSortedButtons.length} of {sidebarButtons.length}
                      </span>
                      <button 
                        onClick={() => {
                          setFilterStatus('all');
                          setSortBy('order_index');
                          setSortOrder('asc');
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {viewMode === 'list' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Order</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Label</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Button ID</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Source</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">ID/Link</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Created</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredAndSortedButtons.map((button) => (
                        <tr key={button.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full font-bold text-gray-700">
                              {button.order_index}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{button.label}</div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                              {button.button_id}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded ${
                              button.source_type === 'photos' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {button.source_type === 'photos' ? 'Photos' : 'Drive'}
                            </span>
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
                              className={`px-3 py-1.5 text-xs rounded-full font-semibold ${
                                button.is_enabled
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {button.is_enabled ? "Enabled" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(button.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => onToggleButton(button)}
                                className={`p-2 rounded-lg transition ${
                                  button.is_enabled
                                    ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                                    : "bg-green-100 hover:bg-green-200 text-green-700"
                                }`}
                                title={button.is_enabled ? "Disable" : "Enable"}
                                data-testid={`button-toggle-${button.id}`}
                              >
                                {button.is_enabled ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                              <button
                                onClick={() => onEditButton(button)}
                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition"
                                title="Edit"
                                data-testid={`button-edit-${button.id}`}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => onDeleteButton(button.id)}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                                title="Delete"
                                data-testid={`button-delete-${button.id}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredAndSortedButtons.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No buttons match your current filters</p>
                      <button 
                        onClick={() => setFilterStatus('all')}
                        className="mt-2 text-blue-600 hover:text-blue-800"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAndSortedButtons.map((button) => (
                    <div 
                      key={button.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-bold text-gray-700">
                              {button.order_index}
                            </span>
                            <h3 className="font-semibold text-gray-900">{button.label}</h3>
                          </div>
                          <code className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                            {button.button_id}
                          </code>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          button.source_type === 'photos' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {button.source_type === 'photos' ? 'Photos' : 'Drive'}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <div 
                          className="text-xs font-mono text-gray-600 truncate"
                          title={button.folder_id}
                        >
                          {button.folder_id}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Created: {new Date(button.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-semibold ${
                            button.is_enabled
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {button.is_enabled ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle size={12} /> Enabled
                            </span>
                          ) : "Disabled"}
                        </span>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => onToggleButton(button)}
                            className={`p-1.5 rounded transition ${
                              button.is_enabled
                                ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                                : "bg-green-100 hover:bg-green-200 text-green-700"
                            }`}
                            title={button.is_enabled ? "Disable" : "Enable"}
                          >
                            {button.is_enabled ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => onEditButton(button)}
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteButton(button.id)}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredAndSortedButtons.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No buttons match your current filters</p>
                      <button 
                        onClick={() => setFilterStatus('all')}
                        className="mt-2 text-blue-600 hover:text-blue-800"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}