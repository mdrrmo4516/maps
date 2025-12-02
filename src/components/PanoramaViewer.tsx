import { useEffect, useRef, useState } from "react";
import { RotateCcw, ZoomIn, ZoomOut, Loader, X, Info, Maximize } from "lucide-react";
import { ReactPhotoSphereViewer } from "react-photo-sphere-viewer";
import "photo-sphere-viewer/dist/photo-sphere-viewer.css";

interface Location {
  name: string;
  id: string;
  imageUrl: string;
  description?: string;
  coordinates?: { lat: number; lng: number };
  features?: string[];
}

const locations: Location[] = [
  {
    name: "Site A - Main Plaza",
    id: "site-a",
    imageUrl: "/Panorama.jpg",
    description: "Central gathering area with emergency exits marked",
    coordinates: { lat: 13.1388, lng: 123.7336 },
    features: ["Emergency Exits", "First Aid Stations", "Communication Hub"]
  },
  {
    name: "Site B - Emergency Center",
    id: "site-b",
    imageUrl:
      "https://placehold.co/2000x1000/7e22ce/white?text=Emergency+Center+Operations+Room",
    description: "Command and control hub for emergency response",
    coordinates: { lat: 13.1400, lng: 123.7350 },
    features: ["Control Room", "Radio Equipment", "Backup Power"]
  },
  {
    name: "Site C - Evacuation Point",
    id: "site-c",
    imageUrl:
      "https://placehold.co/2000x1000/0d9488/white?text=Evacuation+Point+Assembly+Area",
    description: "Designated safe zone for personnel assembly",
    coordinates: { lat: 13.1375, lng: 123.7320 },
    features: ["Shelter Area", "Water Supply", "Medical Tent"]
  },
];

export default function PanoramaViewer() {
  const [selectedLocation, setSelectedLocation] = useState<string>(locations[0].id);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(50);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLocation = locations.find((l) => l.id === selectedLocation)!;

  const handleViewerReady = (viewer: any) => {
    viewerRef.current = viewer;
    setIsLoading(false);
    setError(null);
    
    // Set up zoom level listener
    viewer.on('zoom-updated', (e: any, zoom: number) => {
      setZoomLevel(Math.round(zoom * 100));
    });
  };

  const handleViewerError = (error: any) => {
    console.error("Panorama viewer error:", error);
    setError("Failed to load panorama image. Please try again.");
    setIsLoading(false);
  };

  const handleZoomIn = () => {
    if (viewerRef.current) {
      const currentZoom = viewerRef.current.getZoomLevel?.();
      if (currentZoom !== undefined) {
        const newZoom = Math.min(100, currentZoom + 10);
        viewerRef.current.setZoomLevel?.(newZoom);
        setZoomLevel(Math.round(newZoom * 100));
      }
    }
  };

  const handleZoomOut = () => {
    if (viewerRef.current) {
      const currentZoom = viewerRef.current.getZoomLevel?.();
      if (currentZoom !== undefined) {
        const newZoom = Math.max(0, currentZoom - 10);
        viewerRef.current.setZoomLevel?.(newZoom);
        setZoomLevel(Math.round(newZoom * 100));
      }
    }
  };

  const handleResetView = () => {
    if (viewerRef.current) {
      viewerRef.current.setPitch?.(0);
      viewerRef.current.setYaw?.(0);
      viewerRef.current.setZoomLevel?.(50);
      setZoomLevel(50);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50/30 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/50 flex flex-col">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-[#1a1a2e] font-semibold text-sm">
            Select Location:
          </label>
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Info size={14} />
            Details
          </button>
        </div>
        
        <div className="relative">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/90 border-2 border-white/60 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 font-medium transition-all appearance-none pr-10"
            disabled={isLoading}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Location Details Panel */}
      {showDetails && (
        <div className="mb-4 bg-white/80 rounded-xl p-4 shadow-inner border border-white">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-gray-800">{currentLocation.name}</h3>
            <button 
              onClick={() => setShowDetails(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>
          
          {currentLocation.description && (
            <p className="text-gray-600 text-sm mb-3">{currentLocation.description}</p>
          )}
          
          {currentLocation.coordinates && (
            <div className="flex items-center text-xs text-gray-500 mb-2">
              <span className="font-medium mr-2">Coordinates:</span>
              <span>{currentLocation.coordinates.lat}, {currentLocation.coordinates.lng}</span>
            </div>
          )}
          
          {currentLocation.features && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Key Features:</div>
              <div className="flex flex-wrap gap-1">
                {currentLocation.features.map((feature, index) => (
                  <span 
                    key={index} 
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div 
        ref={containerRef}
        className="flex-1 rounded-2xl overflow-hidden shadow-inner bg-gray-900 relative group"
      >
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-white font-medium text-lg">
                Loading panorama view...
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Preparing immersive experience
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
            <div className="text-center p-8 bg-red-500/20 rounded-xl max-w-md backdrop-blur-sm">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Panorama Load Error
              </h3>
              <p className="text-red-200 mb-6">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <ReactPhotoSphereViewer
          src={currentLocation.imageUrl}
          height="100%"
          width="100%"
          onReady={handleViewerReady}
          onError={handleViewerError}
          options={{
            navbar: false,
            defaultZoomLvl: 50,
            minZoomLvl: 10,
            maxZoomLvl: 100,
            autorotate: false,
            mousewheel: true,
            touchmove: true,
          }}
        />

        {/* Top info panel */}
        <div className="absolute top-4 left-4 right-4 bg-black/60 backdrop-blur-sm text-white px-4 py-3 rounded-xl z-10 shadow-lg transition-all">
          <div className="flex justify-between items-start">
            <div className="max-w-[70%]">
              <h3 className="font-bold text-lg truncate">{currentLocation.name}</h3>
              {currentLocation.description && (
                <p className="text-sm text-gray-300 mt-1 line-clamp-1">
                  {currentLocation.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                <Maximize size={12} className="mr-1" />
                360°
              </div>
              <button 
                onClick={toggleFullscreen}
                className="bg-white/20 hover:bg-white/30 p-1 rounded transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                <Maximize size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom controls overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <span>Drag to explore • Scroll to zoom</span>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm flex items-center">
              <span className="font-mono">{zoomLevel}%</span>
            </div>
            
            <div className="flex gap-1">
              <button
                onClick={handleResetView}
                className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white p-2 rounded-lg transition-all shadow-lg"
                title="Reset view"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white p-2 rounded-lg transition-all shadow-lg"
                title="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={handleZoomIn}
                className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white p-2 rounded-lg transition-all shadow-lg"
                title="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Help overlay */}
        {showHelp && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-black/80 backdrop-blur-sm text-white p-6 rounded-2xl text-center max-w-md pointer-events-auto border border-white/10">
              <div className="text-4xl mb-3">👋</div>
              <h3 className="text-xl font-bold mb-2">
                Interactive Panorama Viewer
              </h3>
              <p className="text-gray-300 mb-4">
                Drag to look around, scroll to zoom in/out. Click and drag markers for details.
              </p>
              <div className="flex gap-3 justify-center mb-4">
                <div className="bg-white/10 px-3 py-1 rounded-full text-xs">
                  Drag: Look around
                </div>
                <div className="bg-white/10 px-3 py-1 rounded-full text-xs">
                  Scroll: Zoom
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium shadow-lg"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-blue-700 font-semibold uppercase tracking-wide mb-1">
            Current View
          </div>
          <div className="text-sm font-bold text-gray-800 truncate">
            {currentLocation?.name}
          </div>
        </div>
        <div className="bg-gradient-to-br from-cyan-50/80 to-cyan-100/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-cyan-700 font-semibold uppercase tracking-wide mb-1">
            Zoom Level
          </div>
          <div className="text-sm font-bold text-gray-800">{zoomLevel}%</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-purple-700 font-semibold uppercase tracking-wide mb-1">
            Navigation
          </div>
          <div className="text-sm font-bold text-gray-800">Drag & Scroll</div>
        </div>
      </div>
    </div>
  );
}