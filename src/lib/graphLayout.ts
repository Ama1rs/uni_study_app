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
            cx: cellWidth * (col + 1) - width / 2,
            cy: cellHeight * (row + 1) - height / 2
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
    const { clusterSpacing = 1.0, isolatedNodeGravity = 0.3 } = options || {};

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

    // Apply radial layout within clusters for a structured, uniform look
    const layoutData: GraphData = {
        nodes: data.nodes.map(node => {
            const componentId = componentMap.get(node.id)!;
            const clusterPos = clusterPositions.get(componentId)!;
            const members = clusterMembers.get(componentId)!;
            const index = members.indexOf(node.id);
            const clusterSize = members.length;

            // Radial packing inside cluster
            // Gold ratio for even distribution in circles
            const angle = index * (Math.PI * (3 - Math.sqrt(5)));
            const radius = Math.sqrt(index) * Math.max(25, 10 + Math.sqrt(clusterSize) * 8);

            // Store layout info
            const layoutNode: GraphNode = {
                ...node,
                // Initial structured position - No longer fixed (fx/fy) to allow floatiness
                x: clusterPos.cx + Math.cos(angle) * radius,
                y: clusterPos.cy + Math.sin(angle) * radius,
                __clusterX: clusterPos.cx,
                __clusterY: clusterPos.cy,
                __clusterId: componentId,
                __isIsolated: clusterSize === 1,
                __gravityStrength: clusterSize === 1 ? isolatedNodeGravity : 0.02
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
    // Balanced repulsion for floatiness vs structure
    const baseNodeRepulsion = Math.max(100, 300 / Math.sqrt(nodeCount || 1));
    const baseLinkForce = 0.4;

    return {
        d3VelocityDecay: 0.3, // Lower = more floaty/bouncy (default 0.4)
        cooldownTicks: Math.max(250, Math.min(800, nodeCount * 1.5)), // Longer cooling for smoother settling
        d3AlphaDecay: 0.02,
        chargeStrength: -baseNodeRepulsion,
        linkStrength: baseLinkForce,
        nodeDistance: Math.max(100, Math.sqrt(nodeCount) * 12)
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
 * Analyze graph structure and return diagnostics and node metrics
 */
export function analyzeGraphStructure(data: GraphData) {
    const nodeIds = data.nodes.map(n => n.id);
    const componentMap = findConnectedComponents(nodeIds, data.links);

    const componentSizes = new Map<number, number>();
    const nodeDegrees = new Map<string, number>();

    // Initialize degrees
    nodeIds.forEach(id => nodeDegrees.set(id, 0));

    // Calculate degrees and component sizes
    data.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;

        if (nodeDegrees.has(sourceId)) nodeDegrees.set(sourceId, (nodeDegrees.get(sourceId) || 0) + 1);
        if (nodeDegrees.has(targetId)) nodeDegrees.set(targetId, (nodeDegrees.get(targetId) || 0) + 1);
    });

    componentMap.forEach(componentId => {
        componentSizes.set(componentId, (componentSizes.get(componentId) || 0) + 1);
    });

    const isolatedCount = Array.from(componentSizes.values()).filter(size => size === 1).length;
    const largestCluster = Math.max(...Array.from(componentSizes.values()), 0);

    // Identify hub nodes (top 10% by degree or degree > 3)
    const sortedDegrees = Array.from(nodeDegrees.entries()).sort((a, b) => b[1] - a[1]);
    const hubThreshold = Math.max(3, sortedDegrees[Math.floor(sortedDegrees.length * 0.1)]?.[1] || 0);
    const hubs = new Set(sortedDegrees.filter(([_, degree]) => degree >= hubThreshold).map(([id]) => id));

    // Calculate uniformity (standard deviation of degrees, inverted)
    const degrees = Array.from(nodeDegrees.values());
    const avgDegree = data.links.length * 2 / (data.nodes.length || 1);
    const variance = degrees.reduce((acc, d) => acc + Math.pow(d - avgDegree, 2), 0) / (data.nodes.length || 1);
    const uniformity = 1 / (1 + Math.sqrt(variance)); // Higher means more uniform

    return {
        totalNodes: data.nodes.length,
        totalLinks: data.links.length,
        clusterCount: componentSizes.size,
        isolatedNodeCount: isolatedCount,
        largestClusterSize: largestCluster,
        avgClusterSize: data.nodes.length / (componentSizes.size || 1),
        density: (2 * data.links.length) / (data.nodes.length * (data.nodes.length - 1)) || 0,
        nodeMetrics: nodeDegrees,
        hubs: hubs,
        // Semantic assessment
        coherence: largestCluster / (data.nodes.length || 1), // How much is 'unified'
        complexity: (data.links.length / (data.nodes.length || 1)), // Avg connections per node
        uniformity: uniformity
    };
}
