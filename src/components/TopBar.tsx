import { User, LogOut, Settings, Menu, X, MoreVertical } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

interface TopBarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function TopBar({ 
  activeView, 
  onNavigate, 
  onToggleSidebar,
  isSidebarOpen 
}: TopBarProps) {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const handleLogout = async () => {
    await signOut();
    onNavigate('panorama');
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Handle window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false); // Close menu when transitioning to desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <div className="h-16 bg-gradient-to-r from-blue-900 to-blue-800 flex items-center justify-between px-2 sm:px-4 md:px-6 shadow-lg sticky top-0 z-30">
      {/* Left section - Logo and menu toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Sidebar toggle button - visible on all screen sizes */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        
        {/* Logo - hidden on very small phones, truncated on mobile */}
        <h1 className="text-white text-base sm:text-lg md:text-xl font-bold tracking-wide truncate">
          <span className="hidden sm:inline">MDRRMO PIO DURAN</span>
          <span className="sm:hidden">MDRRMO</span>
        </h1>
      </div>
      
      {/* Desktop Navigation - visible on md and above */}
      {user && !isMobile && (
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 min-w-0">
            <User className="w-5 h-5 text-white flex-shrink-0" />
            <span className="text-white text-sm font-medium truncate max-w-[200px]">{user.email}</span>
          </div>
          
          <button
            onClick={() => onNavigate('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
              activeView === 'admin'
                ? 'bg-white text-blue-900 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className="hidden lg:inline">Admin Panel</span>
            <span className="lg:hidden">Admin</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/90 text-white font-medium text-sm hover:bg-red-500 transition-all whitespace-nowrap flex-shrink-0"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="hidden lg:inline">Logout</span>
          </button>
        </div>
      )}

      {/* Login button for non-authenticated desktop users */}
      {!user && !isMobile && (
        <button
          onClick={() => onNavigate('login')}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 text-white font-medium text-sm hover:bg-white/30 transition-all whitespace-nowrap"
        >
          <User className="w-5 h-5" />
          <span>Login</span>
        </button>
      )}
      
      {/* Mobile Menu - icon-only buttons for authenticated mobile users */}
      {user && isMobile && (
        <div className="mobile-menu-container flex items-center gap-1">
          {/* Admin icon button on mobile */}
          <button
            onClick={() => {
              onNavigate('admin');
              setIsMenuOpen(false);
            }}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              activeView === 'admin'
                ? 'bg-white text-blue-900'
                : 'text-white hover:bg-white/10'
            }`}
            aria-label="Admin Panel"
            title="Admin Panel"
          >
            <Settings size={20} />
          </button>

          {/* More options menu button */}
          <button
            onClick={toggleMenu}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="More options"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      )}

      {/* Mobile login button for non-authenticated users */}
      {!user && isMobile && (
        <button
          onClick={() => onNavigate('login')}
          className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Login"
          title="Login"
        >
          <User size={20} />
        </button>
      )}
      
      {/* Mobile Dropdown Menu */}
      {isMenuOpen && user && isMobile && (
        <div className="mobile-menu-container absolute top-16 right-0 w-full sm:w-64 bg-white shadow-xl rounded-b-lg py-2 z-50 border-t-4 border-blue-500 animate-slideDown">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{user.email}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              onNavigate('admin');
              setIsMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              activeView === 'admin'
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-500'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Admin Panel</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}