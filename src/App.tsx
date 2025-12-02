import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ImageGallery from './components/ImageGallery';
import PanoramaGallery from './components/PanoramaGallery';
import InteractiveMap from './components/InteractiveMap';
import AdminPanel from './components/AdminPanel';
import { AuthPage } from './components/AuthPage';
import { driveFolders as initialDriveFolders, getAllDriveFolders } from './config/driveFolders';

interface CustomButton {
  id: number;
  button_id: string;
  label: string;
  folder_id: string;
  source_type?: 'drive' | 'photos';
  is_enabled: boolean;
  order_index: number;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState('panorama');
  const [isBoundaryOpen, setIsBoundaryOpen] = useState(false);
  const [allFolders, setAllFolders] = useState(initialDriveFolders);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchCustomButtons = async () => {
      try {
        const response = await fetch('/api/sidebar-buttons');
        if (response.ok) {
          const data = await response.json();
          const enabledButtons = (data.buttons || [])
            .filter((btn: CustomButton) => btn.is_enabled)
            .sort((a: CustomButton, b: CustomButton) => a.order_index - b.order_index);
          setCustomButtons(enabledButtons);
        }
      } catch (error) {
        console.error('Failed to fetch custom buttons:', error);
      }
    };

    fetchCustomButtons();
  }, [sidebarRefresh]);


  useEffect(() => {
    getAllDriveFolders().then(setAllFolders);
  }, [sidebarRefresh]);

  const handleNavigate = (view: string) => {
    setActiveView(view);
    if (view !== 'purok' && view !== 'barangay' && view !== 'municipal') {
      setIsBoundaryOpen(false);
    }
  };

  const handleToggleBoundary = () => {
    setIsBoundaryOpen(!isBoundaryOpen);
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderContent = () => {
    if (activeView === 'login') {
      return (
        <AuthPage 
          onBack={() => handleNavigate('panorama')} 
          onSuccess={() => handleNavigate('admin')} 
        />
      );
    }

    if (activeView === 'admin') {
      if (!user) {
        return (
          <AuthPage 
            onBack={() => handleNavigate('panorama')} 
            onSuccess={() => handleNavigate('admin')} 
          />
        );
      }
      return null; // AdminPanel is now rendered separately
    }

    if (activeView === 'interactive') {
      return <InteractiveMap />;
    }

    // For the main panorama view, use Supabase instead of Google Drive
    if (activeView === 'panorama') {
      return <PanoramaGallery title="360° Panorama Gallery" useSupabase={true} />;
    }

    // Check if it's a custom button view
    const customButton = customButtons.find(btn => btn.button_id === activeView);
    if (customButton) {
      return <ImageGallery 
        folderId={customButton.source_type === 'drive' ? customButton.folder_id : undefined}
        sharedLink={customButton.source_type === 'photos' ? customButton.folder_id : undefined}
        type={customButton.source_type || 'drive'}
        title={customButton.label} 
      />;
    }

    const folder = allFolders[activeView];
    if (folder) {
      return (
        <ImageGallery 
          folderId={folder.folderId} 
          title={folder.title}
          type={folder.type}
          sharedLink={folder.sharedLink}
        />
      );
    }
    return (
      <div className="w-full h-full bg-white/40 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/50 flex items-center justify-center">
        <p className="text-[#1a1a2e] text-xl font-semibold">Select a view from the sidebar</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-pink-400 to-sky-500 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (activeView === 'login' || (activeView === 'admin' && !user)) {
    return renderContent();
  }

  const refreshSidebar = () => {
    setSidebarRefresh(prev => prev + 1);
    getAllDriveFolders().then(setAllFolders);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-pink-400 to-sky-500">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        isBoundaryOpen={isBoundaryOpen}
        onToggleBoundary={handleToggleBoundary}
        refreshTrigger={sidebarRefresh}
        isOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Main content area - responsive margin for sidebar */}
      <div 
        className={`min-h-screen flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : 'ml-0'
        }`}
      >
        <TopBar 
          activeView={activeView} 
          onNavigate={handleNavigate}
          onToggleSidebar={handleToggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Responsive padding - smaller on mobile, larger on desktop */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="h-full min-h-[calc(100vh-8rem)]">
            {activeView === 'admin' && user ? (
              <AdminPanel onNavigate={handleNavigate} onSidebarUpdate={refreshSidebar} />
            ) : (
              renderContent()
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
