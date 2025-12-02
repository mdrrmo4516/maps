import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  AlertCircle,
  Copy,
  Download,
  Check,
  X,
  Info,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Eye,
  ImageOff
} from "lucide-react";
import { ReactPhotoSphereViewer } from "react-photo-sphere-viewer";
import "photo-sphere-viewer/dist/photo-sphere-viewer.css";
import { panoramaService } from "../lib/supabase-service";

declare global {
  interface Window {
    panoramaViewer: any;
  }
}

interface PanoramaImage {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  description?: string;
  date?: string;
  size?: string;
}

interface PanoramaGalleryProps {
  folderId?: string;
  title: string;
  useSupabase?: boolean;
}

export default function PanoramaGallery({
  folderId,
  title,
  useSupabase = true,
}: PanoramaGalleryProps) {
  const [images, setImages] = useState<PanoramaImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<PanoramaImage | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const viewerContainer = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  // Filter images based on search query
  const filteredImages = images.filter(image =>
    image.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (image.description && image.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchImages = async () => {
      setLoading(true);
      setError(null);

      try {
        if (useSupabase) {
          try {
            // Use the data service to fetch panoramas
            const panoramas = await panoramaService.getAll();

            if (!isMounted) return;

            const fetchedImages = panoramas.map((panorama) => ({
              id: String(panorama.id),
              name: panorama.name,
              url: panorama.image_url,
              thumbnailUrl: panorama.thumbnail_url || panorama.image_url,
              description: panorama.description,
              date: panorama.created_at ? new Date(panorama.created_at).toLocaleDateString() : undefined,
            }));

            setImages(fetchedImages);
          } catch (serviceError) {
            console.error("Error fetching from data service:", serviceError);
            // Fall back to fetch if service fails
            const response = await fetch("/api/panoramas");

            if (!isMounted) return;

            if (!response.ok) {
              console.error(`Failed to fetch panoramas: ${response.status} ${response.statusText}`);
              setImages([]);
              setLoading(false);
              return;
            }

            const data = await response.json();

            if (!isMounted) return;

            const fetchedImages = (data.panoramas || []).map((panorama: any) => ({
              id: String(panorama.id),
              name: panorama.name,
              url: panorama.image_url,
              thumbnailUrl: panorama.thumbnail_url || panorama.image_url,
              description: panorama.description,
              date: panorama.created_at ? new Date(panorama.created_at).toLocaleDateString() : undefined,
            }));

            setImages(fetchedImages);
          }
        } else {
          if (!folderId) {
            setError("No folder ID provided");
            setLoading(false);
            return;
          }

          const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
          if (!apiKey) {
            throw new Error(
              "Google Drive API key not configured. Please add VITE_GOOGLE_DRIVE_API_KEY to your environment variables.",
            );
          }

          const query = encodeURIComponent(
            `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
          );
          const fields = encodeURIComponent(
            "files(id, name, mimeType, thumbnailLink, webViewLink, createdTime)",
          );
          const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&key=${apiKey}&pageSize=100&orderBy=createdTime desc`;

          const response = await fetch(driveUrl);

          if (!response.ok) {
            throw new Error(`Failed to fetch images: ${response.statusText}`);
          }

          const data = await response.json();

          const fetchedImages = (data.files || []).map((file: any) => ({
            id: file.id,
            name: file.name,
            url: `https://drive.google.com/uc?export=view&id=${file.id}`,
            thumbnailUrl:
              file.thumbnailLink ||
              `https://drive.google.com/thumbnail?id=${file.id}&sz=w500`,
            date: file.createdTime ? new Date(file.createdTime).toLocaleDateString() : undefined,
          }));

          setImages(fetchedImages);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Error loading images:", errorMessage);
        if (isMounted) {
          setError(errorMessage);
          setImages([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchImages();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [folderId, useSupabase]);

  useEffect(() => {
    if (selectedImage) {
      const index = filteredImages.findIndex(img => img.id === selectedImage.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [selectedImage, filteredImages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;

      switch (e.key) {
        case "Escape":
          closePanorama();
          break;
        case "ArrowLeft":
          navigateImage(-1);
          break;
        case "ArrowRight":
          navigateImage(1);
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, currentIndex, filteredImages]);

  const openPanorama = (image: PanoramaImage) => {
    setSelectedImage(image);
    setViewerLoaded(false);
  };

  const closePanorama = () => {
    setSelectedImage(null);
    setCopied(false);
    setViewerLoaded(false);
    setIsFullscreen(false);
  };

  const navigateImage = (direction: number) => {
    if (!selectedImage || filteredImages.length === 0) return;

    const newIndex = (currentIndex + direction + filteredImages.length) % filteredImages.length;
    setCurrentIndex(newIndex);
    setSelectedImage(filteredImages[newIndex]);
    setViewerLoaded(false);
  };

  const copyImageUrl = async () => {
    if (!selectedImage) return;
    try {
      await navigator.clipboard.writeText(selectedImage.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const downloadImage = () => {
    if (!selectedImage) return;
    const link = document.createElement("a");
    link.href = selectedImage.url;
    link.download = selectedImage.name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    if (!fullscreenRef.current) return;

    if (!document.fullscreenElement) {
      fullscreenRef.current.requestFullscreen().catch(err => {
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

  const getCleanFilename = (filename: string) => {
    return filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  };

  // Handler for when the panorama viewer is ready
  const handleReady = () => {
    setViewerLoaded(true);
  };

  // Handler for errors in the panorama viewer
  const handleError = (error: any) => {
    console.error("Panorama viewer error:", error);
    setViewerLoaded(false);
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-blue-50/20 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-white/50">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-3xl font-bold text-[#1a1a2e] mb-1">{title}</h2>
            <div className="h-1 w-24 bg-gradient-to-r from-sky-400 to-blue-600 rounded-full"></div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search panoramas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl bg-white/80 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-400 text-gray-700 shadow-sm"
              />
              <Info className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${showThumbnails
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/80 text-gray-700 hover:bg-white'
                } shadow-sm`}
            >
              {showThumbnails ? <Eye className="w-4 h-4" /> : <ImageOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{showThumbnails ? 'Hide' : 'Show'} Thumbnails</span>
            </button>
          </div>
        </div>

        {filteredImages.length > 0 && (
          <div className="text-sm text-gray-600">
            Showing {filteredImages.length} of {images.length} panoramas
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
            <p className="text-[#1a1a2e]/70 font-medium">
              Loading 360° panorama images...
            </p>
            <p className="text-[#1a1a2e]/50 text-sm mt-2">
              Preparing immersive experience
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md bg-red-50 p-6 rounded-2xl border border-red-100">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-[#1a1a2e] font-semibold mb-2">
              Error Loading Images
            </p>
            <p className="text-[#1a1a2e]/70 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md bg-white/50 p-8 rounded-2xl border border-white">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-[#1a1a2e]/70 font-medium text-lg mb-2">
              No panorama images found
            </p>
            <p className="text-[#1a1a2e]/50 text-sm mb-4">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Panoramas can be added through the Admin Panel"}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`grid ${showThumbnails ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'hidden'} gap-6`}>
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-video rounded-2xl overflow-hidden bg-white/60 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 border border-white/50"
              onClick={() => openPanorama(image)}
              data-testid={`panorama-card-${image.id}`}
            >
              <img
                src={image.thumbnailUrl}
                alt={image.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://placehold.co/400x200/e2e8f0/94a3b8?text=Thumbnail+Unavailable";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="text-white font-semibold text-sm truncate block mb-1">
                    {getCleanFilename(image.name)}
                  </span>
                  {image.description && (
                    <span className="text-white/80 text-xs block truncate">
                      {image.description}
                    </span>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-white/70 text-xs">
                      Click to view 360°
                    </span>
                    {image.date && (
                      <span className="text-white/70 text-xs">
                        {image.date}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3">
                <h3 className="text-white font-semibold text-sm truncate text-center">
                  {getCleanFilename(image.name)}
                </h3>
              </div>
              <div className="absolute top-3 right-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Maximize2 className="w-3 h-3" />
                360°
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div
          ref={fullscreenRef}
          className={`fixed inset-0 bg-black/95 z-50 flex flex-col backdrop-blur-sm ${isFullscreen ? 'overflow-hidden' : ''
            }`}
          data-testid="panorama-viewer-modal"
        >
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <div className="bg-black/50 backdrop-blur-md rounded-full px-4 py-2">
              <span className="text-white font-medium truncate block max-w-md">
                {getCleanFilename(selectedImage.name)}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md"
                onClick={copyImageUrl}
                title="Copy image URL"
                data-testid="button-copy-url"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md"
                onClick={downloadImage}
                title="Download image"
                data-testid="button-download"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
              <button
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5 text-white" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md"
                onClick={closePanorama}
                title="Close"
                data-testid="button-close-viewer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 relative">
            {!viewerLoaded && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50 rounded-2xl">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
                  <p className="text-white font-medium">
                    Loading panorama...
                  </p>
                </div>
              </div>
            )}

            <div className="w-full h-full rounded-2xl overflow-hidden relative">
              <ReactPhotoSphereViewer
                src={selectedImage.url}
                height="100%"
                width="100%"
                onReady={handleReady}
                onError={handleError}
                navbar={false}
                defaultZoomLvl={50}
                minZoomLvl={10}
                maxZoomLvl={100}
                autorotate={false}
                mousewheel={true}
                touchmove={true}
              />
            </div>
          </div>

          <div className="bg-black/50 backdrop-blur-md p-4">
            <div className="flex justify-between items-center mb-3">
              <button
                onClick={() => navigateImage(-1)}
                disabled={filteredImages.length <= 1}
                className={`p-2 rounded-full ${filteredImages.length > 1
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'text-white/30 cursor-not-allowed'
                  }`}
                title="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="text-center max-w-2xl">
                {selectedImage.description && (
                  <p className="text-white/90 mb-2">{selectedImage.description}</p>
                )}
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <span className="bg-white/10 px-3 py-1 rounded-full">Drag to look around</span>
                  <span className="bg-white/10 px-3 py-1 rounded-full">Scroll to zoom</span>
                  <span className="bg-white/10 px-3 py-1 rounded-full">Arrow keys to navigate</span>
                  <span className="bg-white/10 px-3 py-1 rounded-full">F for fullscreen</span>
                </div>
              </div>

              <button
                onClick={() => navigateImage(1)}
                disabled={filteredImages.length <= 1}
                className={`p-2 rounded-full ${filteredImages.length > 1
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'text-white/30 cursor-not-allowed'
                  }`}
                title="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center text-white/70 text-sm">
              {currentIndex + 1} of {filteredImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}