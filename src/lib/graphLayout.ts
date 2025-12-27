/**
 * Structured Graph Layout System
 * 
 * Provides enhanced layout control for force-directed graphs:
 * - Detects and clusters connected components
 * - Arranges clusters in a grid pattern
 * - Pulls unlinked nodes toward designated regions
 * - Stabilizes layout for repeatable, readable results
 */

export interface GraphNode {
    id: string;
    name: string;
    val?: number;
    color?: string;
    type?: string;
    // Layout properties (added at runtime)
    x?: number;
    y?: number;
    fx?: number; // Fixed x position
    fy?: number; // Fixed y position
    vx?: number; // Velocity x
    vy?: number; // Velocity y
    // Internal layout tracking (for graph layout system)
    [key: string]: any;
}

export interface GraphLink {
    source: string | GraphNode;
    target: string | GraphNode;
    color?: string;
    width?: number;
    dashed?: boolean;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

/**
 * Find connected components using Union-Find algorithm
 */
function findConnectedComponents(
    nodeIds: string[],
    links: GraphLink[]
): Map<string, number> {
    const componentMap = new Map<string, number>();
    const parent = new Map<string, string>();

    // Initialize each node as its own parent
    nodeIds.forEach(id => {
        parent.set(id, id);
        componentMap.set(id, 0); // temporary assignment
    });

    // Union-Find path compression
    function find(x: string): string {
        if (parent.get(x) !== x) {
            parent.set(x, find(parent.get(x)!));
        }
        return parent.get(x)!;
    }

    function union(x: string, y: string) {
        const px = find(x);
        const py = find(y);
        if (px !== py) {
            parent.set(px, py);
        }
    }

    // Process all links
    links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
        if (nodeIds.includes(sourceId) && nodeIds.includes(targetId)) {
            union(sourceId, targetId);
        }
    });

    // Assign component IDs
    const componentIds = new Map<string, number>();
    let componentCount = 0;

    nodeIds.forEach(id => {
        const root = find(id);
        if (!componentIds.has(root)) {
            componentIds.set(root, componentCount++);
        }
        componentMap.set(id, componentIds.get(root)!);
    });

    return componentMap;
}

/**
 * Calculate bounding positions for clusters in a grid layout
 */
function calculateClusterPositions(
    componentMap: Map<string, number>,
    width: number,
    height: number
): Map<number, { cx: number; cy: number }> {
    const maxComponent = Math.max(...Array.from(componentMap.values()));
    const clusterCount = maxComponent + 1;

    // Arrange clusters in a roughly square grid
    const gridSize = Math.ceil(Math.sqrt(clusterCount));
    const cellWidth = width / (gridSize + 1);
    const cellHeight = height / (gridSize + 1);

    const positions = new Map<number, { cx: number; cy: number }>();

    for (let i = 0; i <= maxComponent; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        positions.set(i, {
            cx: cellWidth * (col + 1),
            cy: cellHeight * (row + 1)
        });
    }

    return positions;
}

/**
 * Apply initial layout constraints to nodes
 * Sets up gravity zones and fixes unlinked nodes
 */
export function initializeGraphLayout(
    data: GraphData,
    width: number,
    height: number,
    options?: {
        clusterSpacing?: number; // Multiplier for cluster separation (default: 1.0)
        isolatedNodeGravity?: number; // Strength of pull for unlinked nodes (0-1, default: 0.3)
        enableClusterFixing?: boolean; // Fix cluster centers (default: false)
    }
): GraphData {
    const { clusterSpacing = 1.0, isolatedNodeGravity = 0.3, enableClusterFixing = false } = options || {};

    const nodeIds = data.nodes.map(n => n.id);
    const componentMap = findConnectedComponents(nodeIds, data.links);
    const clusterPositions = calculateClusterPositions(componentMap, width * clusterSpacing, height * clusterSpacing);

    // Calculate cluster membership
    const clusterMembers = new Map<number, string[]>();
    componentMap.forEach((componentId, nodeId) => {
        if (!clusterMembers.has(componentId)) {
            clusterMembers.set(componentId, []);
        }
        clusterMembers.get(componentId)!.push(nodeId);
    });

    // Apply layout to nodes
    const layoutData: GraphData = {
        nodes: data.nodes.map(node => {
            const componentId = componentMap.get(node.id)!;
            const clusterPos = clusterPositions.get(componentId)!;
            const clusterSize = clusterMembers.get(componentId)!.length;

            // Add slight random offset within cluster to break symmetry
            const offsetRadius = Math.max(50, Math.sqrt(clusterSize) * 15);
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * offsetRadius;

            // Store layout info as custom properties
            const layoutNode: GraphNode = {
                ...node,
                // Target attraction point (cluster center)
                ...(enableClusterFixing && {
                    fx: clusterPos.cx + Math.cos(angle) * distance,
                    fy: clusterPos.cy + Math.sin(angle) * distance
                }),
                // Store cluster center for gravity calculations
                __clusterX: clusterPos.cx,
                __clusterY: clusterPos.cy,
                __clusterId: componentId,
                __isIsolated: clusterSize === 1,
                __gravityStrength: clusterSize === 1 ? isolatedNodeGravity : 0
            };

            return layoutNode as any;
        }),
        links: data.links
    };

    return layoutData;
}

/**
 * Configure ForceGraph2D simulation parameters for stable layout
 * Returns an object with recommended settings
 */
export function getOptimizedForceSimulationSettings(nodeCount: number) {
    // Scale parameters based on graph size
    const baseNodeRepulsion = Math.max(20, 100 / Math.sqrt(nodeCount));
    const baseLinkForce = 0.5;
    
    return {
        // Reduce velocity decay for faster convergence
        d3VelocityDecay: 0.4, // Higher = faster damping (default 0.3)
        
        // Simulation convergence
        cooldownTicks: Math.max(150, Math.min(500, nodeCount * 0.3)), // Longer simulation for larger graphs
        
        // Force simulation (note: react-force-graph-2d doesn't expose all d3-force options directly,
        // but we can use these core settings)
        d3AlphaDecay: 0.0228, // Cooling schedule (affects overall convergence speed)
        
        // Recommended charge strength for repulsion
        // (would be set via d3Force if available in this library)
        chargeStrength: -baseNodeRepulsion,
        
        // Link force strength
        linkStrength: baseLinkForce,
        
        // Minimum distance for nodes
        nodeDistance: Math.max(30, Math.sqrt(nodeCount) * 5)
    };
}

/**
 * Apply gravity forces to unlinked nodes in the simulation
 * This is a post-processing step that can be called during animation frames
 */
export function applyGravityForces(
    nodes: GraphNode[],
    links: GraphLink[],
    strength: number = 0.01
): void {
    const linkedNodes = new Set<string>();
    
    links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
        linkedNodes.add(sourceId);
        linkedNodes.add(targetId);
    });

    nodes.forEach(node => {
        if (!linkedNodes.has(node.id) && (node as any).__clusterX !== undefined) {
            // This is an isolated node, apply gravity toward its cluster center
            const dx = (node as any).__clusterX - (node.x || 0);
            const dy = (node as any).__clusterY - (node.y || 0);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 1) {
                const force = strength * (node as any).__gravityStrength;
                if (node.vx === undefined) node.vx = 0;
                if (node.vy === undefined) node.vy = 0;
                
                node.vx! += (dx / distance) * force;
                node.vy! += (dy / distance) * force;
            }
        }
    });
}

/**
 * Analyze graph structure and return diagnostics
 */
export function analyzeGraphStructure(data: GraphData) {
    const nodeIds = data.nodes.map(n => n.id);
    const componentMap = findConnectedComponents(nodeIds, data.links);

    const componentSizes = new Map<number, number>();
    componentMap.forEach(componentId => {
        componentSizes.set(componentId, (componentSizes.get(componentId) || 0) + 1);
    });

    const isolatedCount = Array.from(componentSizes.values()).filter(size => size === 1).length;
    const largestCluster = Math.max(...Array.from(componentSizes.values()));

    return {
        totalNodes: data.nodes.length,
        totalLinks: data.links.length,
        clusterCount: componentSizes.size,
        isolatedNodeCount: isolatedCount,
        largestClusterSize: largestCluster,
        avgClusterSize: data.nodes.length / (componentSizes.size || 1),
        density: (2 * data.links.length) / (data.nodes.length * (data.nodes.length - 1)) || 0
    };
}
