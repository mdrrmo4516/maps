import { useEffect, useRef, useState } from "react";
import { RotateCcw, ZoomIn, ZoomOut, Loader, X, Info, Maximize } from "lucide-react";
import * as THREE from "three";

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
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&h=1000&fit=crop",
    description: "Central gathering area with emergency exits marked",
    coordinates: { lat: 13.1388, lng: 123.7336 },
    features: ["Emergency Exits", "First Aid Stations", "Communication Hub"],
  },
  {
    name: "Site B - Emergency Center",
    id: "site-b",
    imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=2000&h=1000&fit=crop",
    description: "Command and control hub for emergency response",
    coordinates: { lat: 13.1400, lng: 123.7350 },
    features: ["Control Room", "Radio Equipment", "Backup Power"]
  },
  {
    name: "Site C - Evacuation Point",
    id: "site-c",
    imageUrl: "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=2000&h=1000&fit=crop",
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

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const lonRef = useRef(0);
  const latRef = useRef(0);
  const phiRef = useRef(0);
  const thetaRef = useRef(0);
  const animationFrameRef = useRef<number>();

  const currentLocation = locations.find((l) => l.id === selectedLocation)!;

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0.1);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create sphere geometry (inverted for inside view)
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Invert the sphere

    // Load texture
    const textureLoader = new THREE.TextureLoader();
    setIsLoading(true);
    setError(null);

    textureLoader.load(
      currentLocation.imageUrl,
      (texture: THREE.Texture) => {
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        sphereRef.current = sphere;
        setIsLoading(false);
      },
      undefined,
      (err: unknown) => {
        console.error("Error loading texture:", err);
        setError("Failed to load panorama image. Please try again.");
        setIsLoading(false);
      }
    );

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      latRef.current = Math.max(-85, Math.min(85, latRef.current));
      phiRef.current = THREE.MathUtils.degToRad(90 - latRef.current);
      thetaRef.current = THREE.MathUtils.degToRad(lonRef.current);

      camera.position.x = 100 * Math.sin(phiRef.current) * Math.cos(thetaRef.current);
      camera.position.y = 100 * Math.cos(phiRef.current);
      camera.position.z = 100 * Math.sin(phiRef.current) * Math.sin(thetaRef.current);
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Mouse/touch events
    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePositionRef.current = { x: clientX, y: clientY };
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - previousMousePositionRef.current.x;
      const deltaY = clientY - previousMousePositionRef.current.y;

      lonRef.current += deltaX * 0.1;
      latRef.current -= deltaY * 0.1;

      previousMousePositionRef.current = { x: clientX, y: clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const newFov = camera.fov + e.deltaY * 0.05;
      camera.fov = THREE.MathUtils.clamp(newFov, 20, 100);
      camera.updateProjectionMatrix();
      setZoomLevel(Math.round(((100 - camera.fov) / 80) * 100));
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleMouseDown);
    canvas.addEventListener('touchmove', handleMouseMove);
    canvas.addEventListener('touchend', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleMouseDown);
      canvas.removeEventListener('touchmove', handleMouseMove);
      canvas.removeEventListener('touchend', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        containerRef.current?.removeChild(rendererRef.current.domElement);
      }
      if (sphereRef.current) {
        sphereRef.current.geometry.dispose();
        if (sphereRef.current.material instanceof THREE.Material) {
          sphereRef.current.material.dispose();
        }
      }
    };
  }, [selectedLocation]);

  const handleZoomIn = () => {
    if (cameraRef.current) {
      const newFov = THREE.MathUtils.clamp(cameraRef.current.fov - 10, 20, 100);
      cameraRef.current.fov = newFov;
      cameraRef.current.updateProjectionMatrix();
      setZoomLevel(Math.round(((100 - newFov) / 80) * 100));
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      const newFov = THREE.MathUtils.clamp(cameraRef.current.fov + 10, 20, 100);
      cameraRef.current.fov = newFov;
      cameraRef.current.updateProjectionMatrix();
      setZoomLevel(Math.round(((100 - newFov) / 80) * 100));
    }
  };

  const handleResetView = () => {
    lonRef.current = 0;
    latRef.current = 0;
    if (cameraRef.current) {
      cameraRef.current.fov = 75;
      cameraRef.current.updateProjectionMatrix();
      setZoomLevel(50);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current?.parentElement) return;
    
    const fullscreenElement = containerRef.current.parentElement;
    
    if (!document.fullscreenElement) {
      fullscreenElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
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
        className="flex-1 rounded-2xl overflow-hidden shadow-inner bg-gray-900 relative group"
        style={{ minHeight: '500px' }}
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
                  setSelectedLocation(selectedLocation); // Trigger reload
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />

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

        {showHelp && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-black/80 backdrop-blur-sm text-white p-6 rounded-2xl text-center max-w-md pointer-events-auto border border-white/10">
              <div className="text-4xl mb-3">👋</div>
              <h3 className="text-xl font-bold mb-2">
                Interactive Panorama Viewer
              </h3>
              <p className="text-gray-300 mb-4">
                Drag to look around, scroll to zoom in/out. Explore the 360° environment.
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