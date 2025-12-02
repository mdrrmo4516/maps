import { useState, useEffect } from "react";
import {
  Loader2,
  ZoomIn,
  X,
  AlertCircle,
  Copy,
  Download,
  Check,
  Image as ImageIcon,
} from "lucide-react";

interface ImageData {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  viewUrl: string;
}

// Extend the interface to include optional type and sharedLink
interface ImageGalleryProps {
  folderId?: string; // Make folderId optional
  title: string;
  type?: 'drive' | 'photos'; // Add type to differentiate between drive and photos
  sharedLink?: string; // Add sharedLink for Google Photos
}

export default function ImageGallery({ folderId, title, type = 'drive', sharedLink }: ImageGalleryProps) {
  const [images, setImages] = useState<ImageData[]>([]); // Use the unified ImageData interface
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        setError(null);

        if (type === 'photos' && sharedLink) {
          // Load from Google Photos
          // Note: This assumes you have a googlePhotosLoader.ts with loadGooglePhotosAlbum and PhotoItem defined
          // and that PhotoItem has id, title, thumbnailUrl, and url properties.
          // You would need to implement googlePhotosLoader.ts based on your specific needs for Google Photos API or scraping.
          // For demonstration, let's mock the structure and assume it returns an array of objects conforming to ImageData.
          // In a real implementation, you'd need to parse the shared link and fetch the data.

          // Mock implementation for demonstration purposes:
          const mockPhotosData = [
            { id: 'gp1', name: 'Evacuation Map', url: 'https://photos.app.goo.gl/cgKzq3foeL54wdsB8/photo1.jpg', thumbnailUrl: 'https://photos.app.goo.gl/cgKzq3foeL54wdsB8/thumbnail1.jpg', viewUrl: 'https://photos.app.goo.gl/cgKzq3foeL54wdsB8/view1' },
            { id: 'gp2', name: 'Hazards Map', url: 'https://photos.app.goo.gl/cgKzq3foeL54wdsB8/photo2.jpg', thumbnailUrl: 'https://photos.app.goo.gl/cgKzq3foeL54wdsB8/thumbnail2.jpg', viewUrl: 'https://photos.app.goo.gl/cgKzq3foeL54wdsB8/view2' },
            { id: 'gp3', name: 'Elevation Map', url: 'https://photos.app.goo.gl/cgKzq3foeL54wdsB8/photo3.jpg', thumbnailUrl: 'https://photos.app.goo.gl/cgKzq3foeL54wdsB8/thumbnail3.jpg', viewUrl: 'https://photos.app.goo.gl/cgKzq3foeL54wdsB8/view3' },
          ];
          const fetchedImages = mockPhotosData.map((photo: any) => ({
            id: photo.id,
            name: photo.name,
            url: photo.url, // This should be the direct link to the image
            thumbnailUrl: photo.thumbnailUrl, // This should be the direct link to the thumbnail
            viewUrl: photo.viewUrl, // This could be the link to the Google Photos album page for the image
          }));
          setImages(fetchedImages);

          // Actual implementation would look more like this (if googlePhotosLoader exists and works):
          // const photos = await loadGooglePhotosAlbum(sharedLink);
          // const fetchedImages = photos.map((photo: PhotoItem) => ({
          //   id: photo.id,
          //   name: photo.title,
          //   url: photo.url, // Assuming photo.url is the direct image URL
          //   thumbnailUrl: photo.thumbnailUrl, // Assuming photo.thumbnailUrl is the direct thumbnail URL
          //   viewUrl: photo.url // Or a specific view URL if available
          // }));
          // setImages(fetchedImages);

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
  }, [folderId, sharedLink, type]); // Depend on folderId, sharedLink, and type

  const openImageModal = (image: ImageData) => {
    setSelectedImage(image);
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

  return (
    <div className="w-full h-full bg-white/40 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/50">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#1a1a2e] mb-2">{title}</h2>
        <div className="h-1 w-24 bg-gradient-to-r from-sky-400 to-blue-600 rounded-full"></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
            <p className="text-[#1a1a2e]/70 font-medium">
              {type === 'photos' ? 'Loading images from Google Photos...' : 'Loading images from Google Drive...'}
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-[#1a1a2e] font-semibold mb-2">
              Error Loading Images
            </p>
            <p className="text-[#1a1a2e]/70 text-sm break-words">{error}</p>
          </div>
        </div>
      ) : images.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-[#1a1a2e]/70 font-medium text-lg">
              No images found in this folder
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-[16/10.3] rounded-2xl overflow-hidden bg-white/60 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
              onClick={() => openImageModal(image)}
            >
              <img
                src={image.thumbnailUrl}
                alt={image.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
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
            </div>
          ))}
        </div>
      )}

              {selectedImage && (
                <div
                  className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                  onClick={closeImageModal}
                >
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyImageUrl();
                      }}
                      title="Copy image URL"
                    >
                      {copied ? (
                        <Check className="w-6 h-6 text-green-400" />
                      ) : (
                        <Copy className="w-6 h-6 text-white" />
                      )}
                    </button>
                    <button
                      className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage();
                      }}
                      title="Download image"
                    >
                      <Download className="w-6 h-6 text-white" />
                    </button>
                    <button
                      className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md"
                      onClick={closeImageModal}
                      title="Close"
                    >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div
            className="max-w-7xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://placehold.co/800x600/333/ddd?text=Preview+Unavailable`;
              }}
            />
            <p className="text-white text-center mt-4 font-medium bg-black/50 px-6 py-3 rounded-xl max-w-2xl">
              {getCleanFilename(selectedImage.name)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
