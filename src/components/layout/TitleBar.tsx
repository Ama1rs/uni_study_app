import { useState, useEffect, useRef } from 'react';
import { Menu, Settings, X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { Window } from '@tauri-apps/api/window';
import logger from '@/lib/logger';

export function TitleBar({
  onToggleSidebar,
  onLogout,
  onOpenSettings,
}: {
  onToggleSidebar?: () => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const windowRef = useRef<Window | null>(null);
  const listenerRef = useRef<(() => void) | null>(null);

  // Initialize window on mount
  useEffect(() => {
    const initializeWindow = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        windowRef.current = appWindow;

        // Get initial state
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);

        // Listen for window state changes
        const unlisten = await appWindow.onResized(async () => {
          if (windowRef.current) {
            const maximized = await windowRef.current.isMaximized();
            setIsMaximized(maximized);
          }
        });

        listenerRef.current = unlisten;
} catch (error) {
        logger.error('Failed to initialize window:', error);
      }
    };

    initializeWindow();

    // Cleanup
    return () => {
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
    };
  }, []);

  // Window controls
  const handleMinimize = async () => {
    try {
if (!windowRef.current) {
        logger.error('Window reference not initialized');
        return;
      }
      logger.debug('Minimize button clicked, attempting to minimize...');
      await windowRef.current.minimize();
      logger.debug('Window minimized successfully');
    } catch (error) {
      logger.error('Minimize failed:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      if (!windowRef.current) {
        console.error('Window reference not initialized');
        return;
      }
      const maximized = await windowRef.current.isMaximized();
      if (maximized) {
        await windowRef.current.unmaximize();
      } else {
        await windowRef.current.maximize();
      }
      // Force state update
      const newMaximized = await windowRef.current.isMaximized();
      setIsMaximized(newMaximized);
    } catch (error) {
      console.error('Maximize toggle failed:', error);
    }
  };

  const handleClose = async () => {
    try {
      if (!windowRef.current) {
        console.error('Window reference not initialized');
        return;
      }
      await windowRef.current.close();
    } catch (error) {
      console.error('Close failed:', error);
    }
  };

  const handleDoubleClick = () => {
    handleMaximize();
  };

  return (
    <div className="h-10 bg-bg-primary border-b border-border flex items-center justify-between px-3 select-none">
      {/* Left: Sidebar toggle + branding */}
      <div
        className="flex items-center gap-2 h-full flex-1 cursor-default"
        data-tauri-drag-region
        onDoubleClick={handleDoubleClick}
      >
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-bg-hover rounded-md transition-colors text-text-tertiary hover:text-text-primary z-10"
            data-tauri-drag-region="false"
            type="button"
            title="Toggle Sidebar"
          >
            <Menu size={16} />
          </button>
        )}
        <div className="flex items-center gap-2 pointer-events-none">
          <div className="w-5 h-5 bg-accent rounded-md flex items-center justify-center">
            <span className="text-black font-bold text-[10px]">A</span>
          </div>
          <span className="text-xs font-medium text-text-primary font-mono">
            Academia
          </span>
        </div>
      </div>

      {/* Right: window controls */}
      <div className="flex items-center h-full gap-0" data-tauri-drag-region="false">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="px-3 h-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors titlebar-settings"
            type="button"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="px-3 h-full text-xs text-text-tertiary hover:text-red-400 hover:bg-bg-hover transition-colors font-mono titlebar-logout"
            type="button"
            title="Logout"
          >
            Logout
          </button>
        )}
        {/* Minimize */}
        <button
onClick={() => {
            logger.debug('Minimize button clicked');
            handleMinimize();
          }}
          className="w-12 h-full flex items-center justify-center hover:bg-bg-hover transition-colors text-text-tertiary hover:text-text-primary active:bg-bg-hover/50"
          type="button"
          title="Minimize"
        >
          <Minus size={14} strokeWidth={2} />
        </button>
        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center hover:bg-bg-hover transition-colors text-text-tertiary hover:text-text-primary"
          type="button"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Minimize2 size={14} strokeWidth={2} />
          ) : (
            <Maximize2 size={14} strokeWidth={2} />
          )}
        </button>
        {/* Close */}
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center hover:bg-red-600 transition-colors text-text-tertiary hover:text-white"
          type="button"
          title="Close"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}