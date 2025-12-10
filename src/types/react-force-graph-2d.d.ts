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
        onNodeClick?: (node: any, event: any) => void;
        cooldownTicks?: number;
        d3VelocityDecay?: number;
        ref?: any;
    }

    export default class ForceGraph2D extends Component<ForceGraph2DProps> { }
}
