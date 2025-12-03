import { ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isBoundaryOpen: boolean;
  onToggleBoundary: () => void;
  refreshTrigger?: number;
  isOpen?: boolean;
  onToggleSidebar?: () => void;
}

interface CustomButton {
  id: string;
  label: string;
  button_id: string;
  folder_id: string;
  is_enabled: boolean;
  order_index: number;
}

export default function Sidebar({ 
  activeView, 
  onNavigate, 
  isBoundaryOpen, 
  onToggleBoundary, 
  refreshTrigger,
  isOpen = true,
  onToggleSidebar
}: SidebarProps) {
  const { user } = useAuth();
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);

  useEffect(() => {
    const fetchCustomButtons = async () => {
      try {
        const response = await fetch('/api/sidebar-buttons');
        if (!response.ok) {
          console.error('Failed to fetch custom buttons:', response.status, response.statusText);
          setCustomButtons([]);
          return;
        }
        const result = await response.json();
        if (!result.success) {
          console.error('API returned error:', result.error || 'Unknown error');
          setCustomButtons([]);
          return;
        }
        const data: CustomButton[] = result.buttons || [];
        const enabledButtons = data
          .filter(btn => btn.is_enabled)
          .sort((a, b) => a.order_index - b.order_index);
        setCustomButtons(enabledButtons);
      } catch (error) {
        console.error('Error fetching custom buttons:', error instanceof Error ? error.message : error);
        setCustomButtons([]);
      }
    };

    fetchCustomButtons();
  }, [refreshTrigger]);

  // Close sidebar when view changes on mobile
  useEffect(() => {
    if (window.innerWidth < 1024 && onToggleSidebar && isOpen) {
      onToggleSidebar();
    }
  }, [activeView]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onToggleSidebar) {
        onToggleSidebar();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when mobile sidebar is open
      if (window.innerWidth < 1024) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onToggleSidebar]);

  const menuItems = [
    { id: 'panorama', label: 'PANORAMA' },
    { id: 'basemap', label: 'BASE MAP' },
    { id: 'elevation', label: 'ELEVATION MAP' },
    { id: 'evacuation', label: 'EVACUATION' },
    { id: 'hazards', label: 'HAZARDS' },
  ];

  const boundaryItems = [
    { id: 'purok', label: 'PUROK' },
    { id: 'barangay', label: 'BARANGAY' },
    { id: 'municipal', label: 'MUNICIPAL' },
  ];

  // Animation variants for buttons
  const buttonVariants = {
    hover: { 
      y: -2,
      boxShadow: "0 10px 25px -5px rgba(0, 0, 128, 0.3)",
      transition: { duration: 0.2 }
    },
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  // Animation variants for boundary items
  const subButtonVariants = {
    hover: { 
      x: 4,
      backgroundColor: "#60a5fa",
      transition: { duration: 0.2 }
    },
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  // Mobile menu animation variants
  const mobileMenuVariants: any = {
    hidden: { 
      x: '-100%',
      transition: { 
        type: 'tween',
        duration: 0.3 
      }
    },
    visible: { 
      x: 0,
      transition: { 
        type: 'tween',
        duration: 0.3 
      }
    }
  };

  const overlayVariants = {
    hidden: { 
      opacity: 0,
      transition: { duration: 0.2 }
    },
    visible: { 
      opacity: 1,
      transition: { duration: 0.2 }
    }
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 flex items-center gap-3 border-b border-blue-600">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
        </div>
        <div className="text-white">
          <div className="font-bold text-sm">MDRRMO</div>
          <div className="text-xs">PIO DURAN</div>
        </div>
        {/* Close button - always visible */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="ml-auto p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            data-testid={`nav-${item.id}`}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all touch-manipulation ${
              activeView === item.id
                ? 'bg-white text-[#000080] shadow-lg relative after:content[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-[#000080]'
                : 'bg-white/90 text-gray-700 hover:bg-white active:bg-white'
            }`}
          >
            {item.label}
          </motion.button>
        ))}

        <div>
          <motion.button
            onClick={onToggleBoundary}
            data-testid="nav-boundary"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-between touch-manipulation ${
              isBoundaryOpen
                ? 'bg-white text-[#000080] shadow-lg relative after:content[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-[#000080]'
                : 'bg-white/90 text-gray-700 hover:bg-white active:bg-white'
            }`}
          >
            BOUNDARY MAP
            <motion.div
              animate={{ rotate: isBoundaryOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {isBoundaryOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-2 ml-4 space-y-2 overflow-hidden"
              >
                {boundaryItems.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    data-testid={`nav-${item.id}`}
                    variants={subButtonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className={`w-full py-2 px-4 rounded-lg font-medium text-xs transition-all touch-manipulation ${
                      activeView === item.id
                        ? 'bg-blue-500 text-white shadow'
                        : 'bg-blue-300/50 text-white active:bg-blue-400/50'
                    }`}
                  >
                    {item.label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          onClick={() => onNavigate('interactive')}
          data-testid="nav-interactive"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all touch-manipulation ${
            activeView === 'interactive'
              ? 'bg-white text-[#000080] shadow-lg relative after:content[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-[#000080]'
              : 'bg-white/90 text-gray-700 hover:bg-white active:bg-white'
          }`}
        >
          INTERACTIVE
        </motion.button>
      </nav>

      {customButtons.length > 0 && (
        <div className="p-4 border-t border-blue-600">
          <div className="space-y-2">
            {customButtons.map((btn) => (
              <motion.button
                key={btn.id}
                onClick={() => onNavigate(btn.button_id)}
                data-testid={`nav-${btn.button_id}`}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all touch-manipulation ${
                  activeView === btn.button_id
                    ? 'bg-white text-[#000080] shadow-lg relative after:content[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-[#000080]'
                    : 'bg-white/90 text-[#000080] hover:bg-white active:bg-white'
                }`}
              >
                {btn.label}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Sidebar Toggle Button - Always visible when sidebar is closed */}
      {!isOpen && onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="fixed top-4 left-4 z-40 p-3 bg-[#000080] text-white rounded-lg shadow-lg hover:bg-[#000066] transition-colors touch-manipulation"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Overlay for mobile when sidebar is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            onClick={onToggleSidebar}
            className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Responsive with slide animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={mobileMenuVariants}
            className="fixed left-0 top-0 w-64 sm:w-72 md:w-80 lg:w-64 bg-[#000080] h-screen flex flex-col shadow-2xl z-50"
          >
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}