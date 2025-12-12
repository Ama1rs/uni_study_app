import { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ZoomControls } from './ZoomControls';

interface Node {
    id: string;
    name: string;
    val: number;
    color?: string;
    type?: string;
}

interface Link {
    source: string;
    target: string;
}

interface GraphData {
    nodes: Node[];
    links: Link[];
}

import { ContextMenu, ContextMenuAction } from './ContextMenu';
import { Edit, Trash2, Link } from 'lucide-react';

// ... (keep props interface)

interface KnowledgeGraphProps {
    data: GraphData;
    onNodeClick?: (node: any) => void;
    onEditNode?: (node: any) => void;
    onDeleteNode?: (node: any) => void;
    onLinkNode?: (node: any) => void;
}

export function KnowledgeGraph({ data, onNodeClick, onEditNode, onDeleteNode, onLinkNode }: KnowledgeGraphProps) {
    const graphRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ w: 100, h: 100 });
    const [menuState, setMenuState] = useState<{ x: number; y: number; node: any } | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                setDimensions({ w: width, h: height });
            }
        });

        resizeObserver.observe(containerRef.current);

        // Initial set
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ w: clientWidth, h: clientHeight });

        return () => resizeObserver.disconnect();
    }, []);

    const handleZoomIn = () => {
        if (graphRef.current) {
            const currentZoom = graphRef.current.zoom();
            graphRef.current.zoom(currentZoom * 1.5, 400);
        }
    };

    const handleZoomOut = () => {
        if (graphRef.current) {
            const currentZoom = graphRef.current.zoom();
            graphRef.current.zoom(currentZoom / 1.5, 400);
        }
    };

    const handleFitView = () => {
        if (graphRef.current) {
            graphRef.current.zoomToFit(400, 50);
        }
    };

    const handleNodeRightClick = (node: any, event: any) => {
        // Prevent default browser context menu is usually handled by the library or we might need to do it
        // react-force-graph usually doesn't prevent default on right click automatically?
        // But the event passed might allow us to get coordinates.
        // Actually, ForceGraph2D onNodeRightClick gives (node, event).
        // We need 'event' to get clientX/clientY.

        // Note: The library might not suppress the default context menu, so we might need event.preventDefault() 
        // IF the library exposes the native event.
        // Let's assume event is the mouse event or has access to it.

        setMenuState({
            x: event.clientX,
            y: event.clientY,
            node: node
        });
    };

    const contextActions: ContextMenuAction[] = [
        {
            label: 'Edit',
            icon: <Edit size={16} />,
            onClick: () => {
                if (menuState?.node && onEditNode) onEditNode(menuState.node);
                setMenuState(null);
            }
        },
        {
            label: 'Link',
            icon: <Link size={16} />,
            onClick: () => {
                if (menuState?.node && onLinkNode) onLinkNode(menuState.node);
                setMenuState(null);
            }
        },
        {
            label: 'Delete',
            icon: <Trash2 size={16} />,
            danger: true,
            onClick: () => {
                if (menuState?.node && onDeleteNode) onDeleteNode(menuState.node);
                setMenuState(null);
            }
        }
    ];

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden bg-bg-base relative group">
            <ForceGraph2D
                ref={graphRef}
                width={dimensions.w}
                height={dimensions.h}
                graphData={data}
                nodeLabel="name"
                nodeColor={(node: any) => (node as Node).color || '#ffffff'}
                nodeRelSize={6}
                linkColor={(link: any) => link.color || 'rgba(255,255,255,0.2)'}
                linkWidth={(link: any) => link.width || 1}
                linkLineDash={(link: any) => link.dashed ? [5, 5] : null}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                backgroundColor="rgba(0,0,0,0)"
                onNodeClick={onNodeClick}
                onNodeRightClick={handleNodeRightClick}
                cooldownTicks={100}
                d3VelocityDecay={0.3}
            />
            <ZoomControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitView={handleFitView}
            />
            {menuState && (
                <ContextMenu
                    x={menuState.x}
                    y={menuState.y}
                    actions={contextActions}
                    onClose={() => setMenuState(null)}
                />
            )}
        </div>
    );
}
