import { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ZoomControls } from '../../components/ui/ZoomControls';
import { initializeGraphLayout, getOptimizedForceSimulationSettings, applyGravityForces, analyzeGraphStructure } from '../../lib/graphLayout';
import { useAppSettings } from '../../contexts/AppSettingsContext';

interface Node {
    id: string;
    name: string;
    val: number;
    color?: string;
    type?: string;
    imgUrl?: string; // New field for image preview
}

interface GraphLink {
    source: string | Node;
    target: string | Node;
    color?: string;
    width?: number;
    dashed?: boolean;
}

interface GraphData {
    nodes: Node[];
    links: GraphLink[];
}

import { ContextMenu, ContextMenuAction } from '../../components/ui/ContextMenu';
import { Edit, Trash2, Link as LinkIcon, Eye } from 'lucide-react';

// ... (keep props interface)

interface KnowledgeGraphProps {
    data: GraphData;
    onNodeClick?: (node: Node) => void;
    onOpenNode?: (node: Node, pos?: { x: number, y: number }) => void;
    onEditNode?: (node: Node, pos?: { x: number, y: number }) => void;
    onDeleteNode?: (node: Node, pos?: { x: number, y: number }) => void;
    onLinkNode?: (node: Node, pos?: { x: number, y: number }) => void;
}

export function KnowledgeGraph({ data, onNodeClick, onOpenNode, onEditNode, onDeleteNode, onLinkNode }: KnowledgeGraphProps) {
    const { settings } = useAppSettings();
const graphRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const [dimensions, setDimensions] = useState({ w: 100, h: 100 });
    const [menuState, setMenuState] = useState<{ x: number; y: number; node: Node } | null>(null);
    const [_isStabilizing, setIsStabilizing] = useState(true);
    const gravityIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Compute optimized layout and analysis once on data change
    const { layoutData, analysis } = useMemo(() => {
        if (!data || data.nodes.length === 0) return { layoutData: data, analysis: null };

        // Deep clone to prevent D3 mutation from persisting across re-renders/resets
        const clonedData = {
            nodes: data.nodes.map(n => ({ ...n })),
            links: data.links.map(l => ({
                ...l,
                source: typeof l.source === 'object' ? (l.source as any).id : l.source,
                target: typeof l.target === 'object' ? (l.target as any).id : l.target
            }))
        };

        // Analyze structure for diagnostics and styling
        const analysis = analyzeGraphStructure(clonedData as any);

        // Enrich nodes with analysis data for visual representation
        clonedData.nodes.forEach(node => {
            const degree = analysis.nodeMetrics.get(node.id) || 0;
            const isHub = analysis.hubs.has(node.id);
            (node as any).__degree = degree;
            (node as any).__isHub = isHub;

            // Adjust value (size) based on degree
            if (node.val === 1 || node.val === 2) {
                // Base size + bonus for importance
                node.val = settings.graph_node_size + (degree * 0.8);
            }
        });

        // Initialize layout with clustering
        const layout = initializeGraphLayout(clonedData as any, 2000, 2000, {
            clusterSpacing: 1.0,
            isolatedNodeGravity: 0.3,
            enableClusterFixing: false
        });

        return { layoutData: layout, analysis };
    }, [data]);

    // Get optimized simulation settings
    const simSettings = useMemo(() => {
        return getOptimizedForceSimulationSettings(layoutData.nodes.length);
    }, [layoutData]);

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

        return () => {
            resizeObserver.disconnect();
            // Revoke all blob URLs in cache
            imgCache.current.forEach(img => {
                if (img && img.src && img.src.startsWith('blob:')) {
                    URL.revokeObjectURL(img.src);
                }
            });
            imgCache.current.clear();
        };
    }, []);

    // Apply continuous gravity forces to unlinked nodes
    useEffect(() => {
        if (!graphRef.current) return;

        // Start gravity interval
        gravityIntervalRef.current = setInterval(() => {
            if (graphRef.current?.d3Force) {
                const simulation = graphRef.current.d3Force('simulation');
                if (simulation) {
                    applyGravityForces(simulation.nodes(), layoutData.links, 0.008);
                }
            }
        }, 50);

        return () => {
            if (gravityIntervalRef.current) {
                clearInterval(gravityIntervalRef.current);
            }
        };
    }, [layoutData]);

    // Monitor stabilization and auto-fit view
    useEffect(() => {
        if (!graphRef.current || !layoutData.nodes.length) return;

        // Reset simulation alpha to "re-heat" it when data changes (searching, adding notes, etc)
        const simulation = graphRef.current.d3Force('simulation');
        if (simulation) {
            simulation.alpha(1).restart();
            setIsStabilizing(true);
        }

        // Auto fit on data load/change
        const timer = setTimeout(() => {
            if (graphRef.current) {
                graphRef.current.zoomToFit(800, 100);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [layoutData]); // Triggers on every data change (search, new note, etc)

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
        // Use the native event coordinates for the most reliable mouse position
        const nativeEvent = event.nativeEvent || event;
        setMenuState({
            x: nativeEvent.clientX,
            y: nativeEvent.clientY,
            node: node
        });
    };

    const contextActions: ContextMenuAction[] = [
        {
            label: 'Open',
            icon: <Eye size={16} />,
            onClick: () => {
                if (menuState?.node && onOpenNode) onOpenNode(menuState.node, { x: menuState.x, y: menuState.y });
                setMenuState(null);
            }
        },
        {
            label: 'Edit',
            icon: <Edit size={16} />,
            onClick: () => {
                if (menuState?.node && onEditNode) onEditNode(menuState.node, { x: menuState.x, y: menuState.y });
                setMenuState(null);
            }
        },
        {
            label: 'Link',
            icon: <LinkIcon size={16} />,
            onClick: () => {
                if (menuState?.node && onLinkNode) onLinkNode(menuState.node, { x: menuState.x, y: menuState.y });
                setMenuState(null);
            }
        },
        {
            label: 'Delete',
            icon: <Trash2 size={16} />,
            danger: true,
            onClick: () => {
                if (menuState?.node && onDeleteNode) onDeleteNode(menuState.node, { x: menuState.x, y: menuState.y });
                setMenuState(null);
            }
        }
    ];

    const renderNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name;
        const fontSize = settings.graph_label_size / globalScale;
        const r = Math.sqrt(node.val || settings.graph_node_size) * 2;

        // Shadow/Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 1.2, 0, 2 * Math.PI, false);
        ctx.fillStyle = node.__isHub ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Check if we should render an image
        let imgLoaded = false;
        if (node.imgUrl) {
            if (!imgCache.current.has(node.imgUrl)) {
                // If it's a local path (doesn't start with blob: or data: or http), we need to fetch base64
                const isLocalPath = !node.imgUrl.startsWith('blob:') &&
                    !node.imgUrl.startsWith('data:') &&
                    !node.imgUrl.startsWith('http') &&
                    !node.imgUrl.startsWith('asset:');

                if (isLocalPath) {
                    // Start async fetch
                    import('@tauri-apps/api/core').then(({ invoke }) => {
                        invoke<string>('read_file_base64', { path: node.imgUrl })
                            .then(base64 => {
                                try {
                                    const binaryString = atob(base64);
                                    const len = binaryString.length;
                                    const bytes = new Uint8Array(len);
                                    for (let i = 0; i < len; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                    }
                                    const extension = node.imgUrl.split('.').pop()?.toLowerCase() || 'png';
                                    const blob = new Blob([bytes], { type: `image/${extension}` });
                                    const blobUrl = URL.createObjectURL(blob);

                                    const img = new Image();
                                    img.src = blobUrl;
                                    img.onload = () => {
                                        if (graphRef.current) graphRef.current.refresh();
                                    };
                                    imgCache.current.set(node.imgUrl, img);
                                } catch (e) {
                                    console.error('Failed to process graph image base64:', e);
                                }
                            });
                    });
                    // Set a placeholder so we don't keep triggering the fetch
                    imgCache.current.set(node.imgUrl, null as any);
                } else {
                    const img = new Image();
                    img.src = node.imgUrl;
                    img.onload = () => {
                        // Trigger a re-render of the canvas when the image loads
                        if (graphRef.current) graphRef.current.refresh();
                    };
                    imgCache.current.set(node.imgUrl, img);
                }
            }

            const img = imgCache.current.get(node.imgUrl);
            if (img && img.complete && img.naturalWidth !== 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                ctx.clip();

                // Draw image maintaining aspect ratio (cover)
                const aspect = img.width / img.height;
                let drawW = r * 2;
                let drawH = r * 2;
                let offsetX = 0;
                let offsetY = 0;

                if (aspect > 1) {
                    drawW = r * 2 * aspect;
                    offsetX = (drawW - r * 2) / 2;
                } else {
                    drawH = r * 2 / aspect;
                    offsetY = (drawH - r * 2) / 2;
                }

                ctx.drawImage(img, node.x - r - offsetX, node.y - r - offsetY, drawW, drawH);
                ctx.restore();

                // Add a border for the image node
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                ctx.strokeStyle = node.color || 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1.5 / globalScale;
                ctx.stroke();

                imgLoaded = true;
            }
        }

        if (!imgLoaded) {
            // Fallback: Node Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color || settings.graph_node_color;
            ctx.fill();

            // Hub Stroke
            if (node.__isHub) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
            }
        }

        // Label - Only show when zoomed in enough to avoid clutter
        if (settings.graph_show_labels && globalScale > 1.6) {
            ctx.font = `bold ${fontSize}px "Outfit", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Background for label readability
            const textWidth = ctx.measureText(label).width;
            const bPad = 2 / globalScale;
            ctx.fillStyle = 'rgba(10, 10, 14, 0.85)';
            ctx.fillRect(node.x - textWidth / 2 - bPad * 2, node.y + r + 2 / globalScale, textWidth + bPad * 4, fontSize + bPad * 3);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillText(label, node.x, node.y + r + fontSize / 2 + 3 / globalScale);
        }
    };

    const ForceGraphComponent = ForceGraph2D as any;

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden bg-bg-base relative group">
            <ForceGraphComponent
                ref={graphRef}
                width={dimensions.w}
                height={dimensions.h}
                graphData={layoutData}
                nodeLabel="name"
                nodeCanvasObject={renderNode}
                nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                    const r = Math.sqrt(node.val || settings.graph_node_size) * 2;
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false); ctx.fill();
                }}
                linkColor={(link: any) => link.color || settings.graph_link_color}
                linkWidth={(link: any) => link.width || settings.graph_link_width}
                linkLineDash={(link: any) => link.dashed ? [4, 4] : null}
                linkDirectionalArrowLength={3}
                linkDirectionalArrowRelPos={1}
                backgroundColor="rgba(0,0,0,0)"
                onNodeClick={onNodeClick}
                onNodeRightClick={handleNodeRightClick}
                cooldownTicks={simSettings.cooldownTicks}
                d3VelocityDecay={simSettings.d3VelocityDecay}
            />

            {/* Structure Context Overlay */}
            {analysis && settings.graph_show_topology && (
                <div className="absolute bottom-8 right-24 pointer-events-none select-none flex flex-col gap-2 transition-all duration-500 group-hover:opacity-100 opacity-40 group-hover:translate-x-0 translate-x-4 items-end text-right">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[9px] uppercase tracking-widest font-bold text-white/50">
                            Neural Topology
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] text-white/40 font-mono">
                                {analysis.totalNodes}N:{analysis.totalLinks}L
                            </span>
                            <div className="h-1 w-1 rounded-full bg-accent animate-pulse" />
                            <span className="text-sm font-semibold text-white/90">
                                {analysis.density > 0.3 ? 'Dense Semantic Core' : analysis.density > 0.1 ? 'Connected Graph' : 'Sparse Knowledge Map'}
                            </span>
                        </div>

                        <div className="text-[11px] text-white/40 leading-relaxed max-w-[280px] italic">
                            {analysis.coherence > 0.7 ? 'High conceptual integration detected. Subject matter is deeply unified.' :
                                analysis.coherence > 0.3 ? 'Modular repository structure. Multiple distinct sub-topics present.' :
                                    'High entropy detected. Fragmented data points without a central node.'}
                        </div>
                    </div>

                    <div className="mt-2 flex gap-4 text-[9px] font-mono text-white/10">
                        <div className="flex flex-col">
                            <span className="uppercase text-[8px] mb-0.5">Coherence</span>
                            <span className="text-white/40">{(analysis.coherence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="uppercase text-[8px] mb-0.5">Complexity</span>
                            <span className="text-white/40">{(analysis.complexity).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="uppercase text-[8px] mb-0.5">Uniformity</span>
                            <span className="text-white/40">{(analysis.uniformity * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="uppercase text-[8px] mb-0.5">Stability</span>
                            <span className="text-white/40">{(1 - analysis.complexity / 10).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

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
