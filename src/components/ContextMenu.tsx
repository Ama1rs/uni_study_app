import { useEffect, useRef } from 'react';

export interface ContextMenuAction {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    actions: ContextMenuAction[];
    onClose: () => void;
}

export function ContextMenu({ x, y, actions, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Adjust position if it goes off-screen (basic implementation)
    // In a production app you'd calculate window bounds, but let's keep it simple for now.

    return (
        <div
            ref={menuRef}
            className="fixed bg-bg-surface border border-border rounded-lg shadow-xl z-50 flex flex-col py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: y, left: x, borderColor: 'var(--border)' }}
        >
            {actions.map((action, i) => (
                <button
                    key={i}
                    onClick={() => {
                        action.onClick();
                        onClose();
                    }}
                    className={`px-3 py-2 text-sm flex items-center gap-2 w-full text-left transition-colors hover:bg-white/5 ${action.danger ? 'text-red-400 hover:text-red-300' : 'text-text-primary'
                        }`}
                >
                    <span className="opacity-70">{action.icon}</span>
                    {action.label}
                </button>
            ))}
        </div>
    );
}
