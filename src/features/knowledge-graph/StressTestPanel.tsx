import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'framer-motion';
import { Zap, AlertTriangle } from 'lucide-react';

interface StressTestPanelProps {
    repositoryId: number;
    onComplete: () => void;
}

export function StressTestPanel({ repositoryId, onComplete }: StressTestPanelProps) {
    const [nodeCount, setNodeCount] = useState(500);
    const [edgesPerNode, setEdgesPerNode] = useState(3);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleGenerate() {
        if (!confirm(`This will generate ${nodeCount} nodes and approx ${nodeCount * edgesPerNode} links. This might take a moment. Continue?`)) return;

        setLoading(true);
        setError(null);
        try {
            await invoke('generate_large_graph', {
                repositoryId: repositoryId,
                nodeCount: parseInt(nodeCount.toString()),
                edgesPerNode: parseInt(edgesPerNode.toString())
            });
            onComplete();
            alert('Graph generation complete!');
        } catch (err: any) {
            console.error(err);
            setError(err.toString());
        } finally {
            setLoading(false);
        }
    }

    return (
        <motion.div
            className="p-6 bg-red-900/10 border border-red-500/30 rounded-xl backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center gap-2 mb-4 text-red-400">
                <Zap size={20} />
                <h3 className="font-bold">Stress Test Generator</h3>
            </div>

            <p className="text-sm text-gray-400 mb-4">
                Generate a large random graph to test performance.
                <span className="text-red-400 block mt-1"><AlertTriangle size={12} className="inline mr-1" /> Warning: Large graphs (1000+ nodes) may cause lag.</span>
            </p>

            <div className="flex gap-4 mb-4">
                <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Node Count</label>
                    <input
                        type="number"
                        value={nodeCount}
                        onChange={e => setNodeCount(parseInt(e.target.value))}
                        className="w-full bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-red-500 transition-colors"
                        min="1"
                        max="5000"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Edges / Node</label>
                    <input
                        type="number"
                        value={edgesPerNode}
                        onChange={e => setEdgesPerNode(parseInt(e.target.value))}
                        className="w-full bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-red-500 transition-colors"
                        min="0"
                        max="20"
                    />
                </div>
            </div>

            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? 'Generating...' : 'Generate Graph'}
            </button>
        </motion.div>
    );
}
