declare module 'react-force-graph-2d' {
    import { Component } from 'react';

    export interface GraphData {
        nodes: any[];
        links: any[];
    }

    export interface ForceGraph2DProps {
        width?: number;
        height?: number;
        graphData?: GraphData;
        backgroundColor?: string;
        nodeLabel?: string | ((node: any) => string);
        nodeColor?: string | ((node: any) => string);
        nodeRelSize?: number;
        linkColor?: string | ((link: any) => string);
        linkWidth?: number | ((link: any) => number);
        linkLineDash?: number[] | ((link: any) => number[] | null);
        linkDirectionalArrowLength?: number;
        linkDirectionalArrowRelPos?: number;
        onNodeClick?: (node: any, event: any) => void;
        onNodeRightClick?: (node: any, event: any) => void;
        cooldownTicks?: number;
        d3VelocityDecay?: number;
        d3AlphaDecay?: number;
        d3Force?: any; // Access to underlying d3-force simulation
        onEngineStop?: () => void;
        ref?: any;
    }

    export default class ForceGraph2D extends Component<ForceGraph2DProps> { }
}
