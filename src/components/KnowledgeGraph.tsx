import { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

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

interface KnowledgeGraphProps {
    data: GraphData;
    onNodeClick?: (node: any) => void;
}

export function KnowledgeGraph({ data, onNodeClick }: KnowledgeGraphProps) {
    const graphRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ w: 100, h: 100 });

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

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden bg-bg-base">
            <ForceGraph2D
                ref={graphRef}
                width={dimensions.w}
                height={dimensions.h}
                graphData={data}
                nodeLabel="name"
                nodeColor={(node: any) => (node as Node).color || '#ffffff'}
                nodeRelSize={6}
                linkColor={() => 'rgba(255,255,255,0.2)'}
                backgroundColor="rgba(0,0,0,0)"
                onNodeClick={onNodeClick}
                cooldownTicks={100}
                d3VelocityDecay={0.3}
            />
        </div>
    );
}
