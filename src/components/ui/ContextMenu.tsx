import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuAction {
    label: string;
    icon?: React.ReactNode;
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
    const [adjustedPos, setAdjustedPos] = useState({ x, y });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position if menu goes off-screen
    useEffect(() => {
        if (menuRef.current) {
            const menuWidth = menuRef.current.offsetWidth;
            const menuHeight = menuRef.current.offsetHeight;
            let newX = x;
            let newY = y;

            // Flip Y if it goes off bottom
            if (y + menuHeight > window.innerHeight - 20) {
                newY = y - menuHeight;
            }

            // Flip X if it goes off right edge
            if (x + menuWidth > window.innerWidth - 20) {
                newX = x - menuWidth;
            }

            // Clamping to screen edges
            newX = Math.max(10, Math.min(newX, window.innerWidth - menuWidth - 10));
            newY = Math.max(10, Math.min(newY, window.innerHeight - menuHeight - 10));

            setAdjustedPos({ x: newX, y: newY });
        }
    }, [x, y]);

    return createPortal(
        <div
            ref={menuRef}
            className="fixed bg-bg-surface border border-border rounded-lg shadow-xl z-[9999] flex flex-col py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
            style={{
                top: `${adjustedPos.y}px`,
                left: `${adjustedPos.x}px`,
                borderColor: 'var(--border)'
            }}
        >
            {actions.map((action, index) => (
                <button
                    key={index}
                    onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-left
                        ${action.danger
                            ? 'text-red-400 hover:bg-red-400/10'
                            : 'text-text-primary hover:bg-white/5'
                        }`}
                >
                    <span className="opacity-70">{action.icon}</span>
                    <span>{action.label}</span>
                </button>
            ))}
        </div>,
        document.body
    );
}
