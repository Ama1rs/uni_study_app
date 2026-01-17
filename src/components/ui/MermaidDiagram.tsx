import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark', // Using dark theme to match the app's dark aesthetic
    securityLevel: 'loose',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
});

interface MermaidDiagramProps {
    chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const renderChart = async () => {
            if (!ref.current || !chart) return;

            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, chart);
                setSvg(svg);
                setError(null);
            } catch (err: any) {
                console.error('Mermaid rendering failed:', err);
                // Keep the error message simple
                setError('Failed to render flow chart. Please check syntax.');
            }
        };

        renderChart();
    }, [chart]);

    if (error) {
        return (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                {error}
                <pre className="mt-2 text-text-tertiary">{chart}</pre>
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className="mermaid overflow-x-auto p-4 bg-bg-surface rounded-xl border border-border my-4 flex justify-center"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
