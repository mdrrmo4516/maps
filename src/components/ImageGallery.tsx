import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  ZoomIn,
  X,
  AlertCircle,
  Copy,
  Download,
  Check,
  Image as ImageIcon,
  Search,
  Filter
} from "lucide-react";

interface ImageData {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  viewUrl: string;
}

interface ImageGalleryProps {
  folderId?: string;
  title: string;
  type?: 'drive' | 'photos';
  sharedLink?: string;
}

export default function ImageGallery({ folderId, title, type = 'drive', sharedLink }: ImageGalleryProps) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState<Record<string, 'loading' | 'loaded' | 'error'>>({});

  // Filter images based on search query
  const filteredImages = useMemo(() => {
    if (!searchQuery) return images;
    return images.filter(image => 
      image.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [images, searchQuery]);

  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        setError(null);

        if (type === 'photos' && sharedLink) {
          // Mock implementation for Google Photos
          const mockPhotosData = [
            { id: 'gp1', name: 'Evacuation Map', url: 'https://placehold.co/800x600/3b82f6/white?text=Evacuation+Map', thumbnailUrl: 'https://placehold.co/400x300/3b82f6/white?text=Evacuation+Map', viewUrl: '#' },
            { id: 'gp2', name: 'Hazards Map', url: 'https://placehold.co/800x600/ef4444/white?text=Hazards+Map', thumbnailUrl: 'https://placehold.co/400x300/ef4444/white?text=Hazards+Map', viewUrl: '#' },
            { id: 'gp3', name: 'Elevation Map', url: 'https://placehold.co/800x600/10b981/white?text=Elevation+Map', thumbnailUrl: 'https://placehold.co/400x300/10b981/white?text=Elevation+Map', viewUrl: '#' },
            { id: 'gp4', name: 'Boundary Map', url: 'https://placehold.co/800x600/f59e0b/white?text=Boundary+Map', thumbnailUrl: 'https://placehold.co/400x300/f59e0b/white?text=Boundary+Map', viewUrl: '#' },
            { id: 'gp5', name: 'Infrastructure Map', url: 'https://placehold.co/800x600/8b5cf6/white?text=Infrastructure+Map', thumbnailUrl: 'https://placehold.co/400x300/8b5cf6/white?text=Infrastructure+Map', viewUrl: '#' },
          ];
          setImages(mockPhotosData);
        } else if (folderId) {
          // Load from Google Drive
          const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
          if (!apiKey) {
            throw new Error(
              "Google Drive API key not configured. Please add VITE_GOOGLE_DRIVE_API_KEY to your environment variables.",
            );
          }

          const query = encodeURIComponent(
            `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
          );
          const fields =
            "files(id, name, mimeType, thumbnailLink, webViewLink, createdTime)";
          const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${encodeURIComponent(fields)}&key=${apiKey}&pageSize=100&orderBy=createdTime desc`;

          const response = await fetch(driveUrl);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `HTTP ${response.status}: ${response.statusText}. Details: ${errorText}`,
            );
          }

          const data = await response.json();

          const fetchedImages = (data.files || []).map((file: any) => {
            const cleanId = file.id.trim();
            const url = `https://drive.google.com/uc?export=view&id=${cleanId}`;
            let thumbnailUrl =
              file.thumbnailLink?.replace(/=s\d+$/, "=s500") ||
              `https://drive.google.com/thumbnail?id=${cleanId}&sz=w500`;

            return {
              id: cleanId,
              name: file.name,
              url,
              thumbnailUrl,
              viewUrl: `https://drive.google.com/file/d/${cleanId}/view`,
            };
          });

          setImages(fetchedImages);
        } else {
          setError("No folder ID or shared link provided");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Error loading images:", errorMessage);
        setError(errorMessage);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [folderId, sharedLink, type]);

  const openImageModal = (image: ImageData) => {
    setSelectedImage(image);
    // Preload the full-size image
    const img = new Image();
    img.src = image.url;
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setCopied(false);
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

  const getCleanFilename = (filename: string) => {
    return filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  };

  const handleImageLoad = (id: string, status: 'loaded' | 'error') => {
    setImageLoadStates(prev => ({
      ...prev,
      [id]: status
    }));
  };

  const preloadFullImage = (imageUrl: string) => {
    const img = new Image();
    img.src = imageUrl;
  };

  return (
    <div className="w-full h-full bg-white/40 backdrop-blur-md rounded-3xl shadow-2xl p-4 sm:p-6 border border-white/50 flex flex-col">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1a1a2e] mb-1">{title}</h2>
            <div className="h-1 w-16 sm:w-24 bg-gradient-to-r from-sky-400 to-blue-600 rounded-full"></div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile search button */}
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="sm:hidden p-2 rounded-lg bg-white/80 border border-white/60 text-gray-700 hover:bg-white transition-colors"
              aria-label="Search images"
            >
              <Search size={20} />
            </button>
            
            {/* Desktop search */}
            <div className="hidden sm:flex items-center relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl bg-white/80 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-400 text-gray-700 shadow-sm w-48 md:w-64"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
            
            <div className="bg-white/80 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-white/60">
              {filteredImages.length} images
            </div>
          </div>
        </div>
        
        {/* Mobile search - shown when search button is clicked */}
        {isSearchOpen && (
          <div className="sm:hidden mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/80 border border-white/60 focus:outline-none focus:ring-2 focus:ring-sky-400 text-gray-700 shadow-sm"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
            <p className="text-[#1a1a2e]/70 font-medium">
              {type === 'photos' ? 'Loading images from Google Photos...' : 'Loading images from Google Drive...'}
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center max-w-md p-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-[#1a1a2e] font-semibold mb-2">
              Error Loading Images
            </p>
            <p className="text-[#1a1a2e]/70 text-sm break-words">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center p-4">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-[#1a1a2e]/70 font-medium text-lg">
              {searchQuery ? 'No matching images found' : 'No images found in this folder'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-[16/10.3] rounded-2xl overflow-hidden bg-white/60 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border border-white/50"
                onClick={() => openImageModal(image)}
                onMouseEnter={() => preloadFullImage(image.url)}
              >
                {imageLoadStates[image.id] !== 'loaded' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  </div>
                )}
                <img
                  src={image.thumbnailUrl}
                  alt={image.name}
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${imageLoadStates[image.id] === 'loaded' ? 'block' : 'hidden'}`}
                  loading="lazy"
                  onLoad={() => handleImageLoad(image.id, 'loaded')}
                  onError={(e) => {
                    handleImageLoad(image.id, 'error');
                    (e.target as HTMLImageElement).src =
                      `https://placehold.co/600x400/eee/aaa?text=${encodeURIComponent(image.name)}`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60">
                  <h3 className="text-white font-semibold text-sm truncate text-center">
                    {getCleanFilename(image.name)}
                  </h3>
                </div>
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="w-4 h-4 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={closeImageModal}
        >
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md"
              onClick={(e) => {
                e.stopPropagation();
                copyImageUrl();
              }}
              title="Copy image URL"
            >
              {copied ? (
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              )}
            </button>
            <button
              className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md"
              onClick={(e) => {
                e.stopPropagation();
                downloadImage();
              }}
              title="Download image"
            >
              <Download className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
            <button
              className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md"
              onClick={closeImageModal}
              title="Close"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
          </div>
          <div
            className="max-w-7xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-w-full max-h-[70vh] sm:max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://placehold.co/800x600/333/ddd?text=Preview+Unavailable`;
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Loader2 className="w-12 h-12 text-white/50 animate-spin" />
              </div>
            </div>
            <p className="text-white text-center mt-4 font-medium bg-black/50 px-4 py-3 rounded-xl max-w-2xl text-sm sm:text-base">
              {getCleanFilename(selectedImage.name)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}