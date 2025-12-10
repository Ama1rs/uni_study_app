import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Menu, Settings } from 'lucide-react';

const appWindow = getCurrentWindow();

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

  useEffect(() => {
    const updateMaximizedState = async () => {
      setIsMaximized(await appWindow.isMaximized());
    };

    updateMaximizedState();
    const unlistenResize = appWindow.onResized(updateMaximizedState);

    return () => {
      unlistenResize.then(f => f());
    };
  }, []);

  const minimize = async () => {
    try {
      await appWindow.minimize();
    } catch (error) {
      console.error('Error minimizing window:', error);
    }
  };

  const toggleMaximize = async () => {
    try {
      const isCurrentlyMaximized = await appWindow.isMaximized();
      if (isCurrentlyMaximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
      setIsMaximized(await appWindow.isMaximized());
    } catch (error) {
      console.error('Error toggling maximize:', error);
    }
  };

  const close = () => appWindow.close();

return (
  <div className="h-10 bg-bg-primary border-b border-border flex items-center justify-between px-3 select-none">
    {/* Left: Sidebar toggle + branding (this is the drag area) */}
    <div
      className="flex items-center gap-2 h-full flex-1"
      data-tauri-drag-region
      onDoubleClick={toggleMaximize}
    >
      {onToggleSidebar && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSidebar();
          }}
          className="p-1.5 hover:bg-bg-hover rounded-md transition-colors text-text-tertiary hover:text-text-primary"
          data-tauri-drag-region="false"
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

    {/* Right: window controls – NOT draggable */}
    <div className="flex items-center h-full" data-tauri-drag-region="false">
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className="p-2 h-full text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="Settings"
        >
          <Settings size={14} />
        </button>
      )}
      {onLogout && (
        <button
          onClick={onLogout}
          className="px-3 h-full text-xs text-text-tertiary hover:text-red-400 hover:bg-bg-hover transition-colors font-mono"
          title="Logout"
        >
          Logout
        </button>
      )}
      <button
        onClick={minimize}
        className="inline-flex justify-center items-center w-12 h-full hover:bg-bg-hover transition-colors"
        aria-label="Minimize"
        data-tauri-drag-region="false"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
          <path
            d="M0 0.5h10"
            stroke="currentColor"
            strokeWidth="1"
            className="text-text-tertiary"
          />
        </svg>
      </button>
      <button
        onClick={toggleMaximize}
        className="inline-flex justify-center items-center w-12 h-full hover:bg-bg-hover transition-colors"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
        data-tauri-drag-region="false"
      >
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect
              x="0"
              y="2"
              width="7"
              height="7"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              className="text-text-tertiary"
            />
            <path
              d="M3 2V0h7v7h-2"
              stroke="currentColor"
              strokeWidth="1"
              className="text-text-tertiary"
            />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              className="text-text-tertiary"
            />
          </svg>
        )}
      </button>
      <button
        onClick={close}
        className="inline-flex justify-center items-center w-12 h-full hover:bg-red-600 transition-colors group"
        aria-label="Close"
        data-tauri-drag-region="false"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M0 0l10 10M10 0L0 10"
            stroke="currentColor"
            strokeWidth="1"
            className="text-text-tertiary group-hover:text-white"
          />
        </svg>
      </button>
    </div>
  </div>
);
}