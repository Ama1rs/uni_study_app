import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import {
    FileText,
    Image as ImageIcon,
    Scissors,
    Minimize2,
    Repeat,
    Layers,
    FileType,
    Zap,
    X,
    MoveRight
} from 'lucide-react';
import { itemVariants } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface ToolCardProps {
    title: string;
    description: string;
    icon: any;
    color: string;
    bgColor: string;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}

function ToolCard({ title, description, icon: Icon, color, bgColor, className, onClick, disabled }: ToolCardProps) {
    return (
        <motion.button
            className={cn(
                "glass-card p-5 rounded-2xl flex items-center gap-4 hover:border-accent/40 transition-all group text-left",
                disabled && "opacity-50 cursor-not-allowed hover:border-white/5",
                className
            )}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
        >
            <div className={cn("p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform", bgColor)}>
                <Icon size={20} className={color} />
            </div>
            <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">{title}</h4>
                <p className="text-[10px] text-text-tertiary truncate">{description}</p>
            </div>
            <MoveRight size={14} className="text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </motion.button>
    );
}

export function StudioResourceTools() {
    type ActiveTool =
        | 'pdf_merge'
        | 'pdf_extract_pages'
        | 'pdf_compress'
        | 'pdf_to_markdown'
        | 'image_resize'
        | 'image_convert'
        | 'image_batch_optimize';

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeTool, setActiveTool] = useState<ActiveTool | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultPath, setResultPath] = useState<string | null>(null);

    const [inputPaths, setInputPaths] = useState<string[]>([]);
    const [inputPath, setInputPath] = useState<string>('');
    const [outputPath, setOutputPath] = useState<string>('');
    const [outputDir, setOutputDir] = useState<string>('');

    const [pagesSpec, setPagesSpec] = useState<string>('1');
    const [compressionLevel, setCompressionLevel] = useState<number>(9);

    const [resizeWidth, setResizeWidth] = useState<number>(1024);
    const [resizeHeight, setResizeHeight] = useState<number>(1024);
    const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>('contain');

    const [jpegQuality, setJpegQuality] = useState<number>(85);

    function closeDialog() {
        if (isRunning) return;
        setIsDialogOpen(false);
        setActiveTool(null);
        setError(null);
        setResultPath(null);
    }

    function openTool(tool: ActiveTool) {
        setActiveTool(tool);
        setIsDialogOpen(true);
        setIsRunning(false);
        setError(null);
        setResultPath(null);
        setInputPaths([]);
        setInputPath('');
        setOutputPath('');
        setOutputDir('');
        setPagesSpec('1');
        setCompressionLevel(9);
        setResizeWidth(1024);
        setResizeHeight(1024);
        setResizeMode('contain');
        setJpegQuality(85);
    }

    async function openResult(path?: string | null) {
        if (!path) return;
        try {
            await openPath(path);
        } catch (e) {
            console.error(e);
        }
    }

    async function handleMergePdfs() {
        openTool('pdf_merge');
    }

    async function handleExtractPdfPages() {
        openTool('pdf_extract_pages');
    }

    async function handleCompressPdf() {
        openTool('pdf_compress');
    }

    async function handlePdfToMarkdown() {
        openTool('pdf_to_markdown');
    }

    async function handleImageResize() {
        openTool('image_resize');
    }

    async function handleImageConvert() {
        openTool('image_convert');
    }

    async function handleBatchOptimize() {
        openTool('image_batch_optimize');
    }

    const dialogMeta = useMemo(() => {
        switch (activeTool) {
            case 'pdf_merge':
                return { title: 'Merge PDFs', subtitle: 'Combine multiple files into one PDF' };
            case 'pdf_extract_pages':
                return { title: 'Split Pages', subtitle: 'Extract specific pages into a new PDF' };
            case 'pdf_compress':
                return { title: 'Compress', subtitle: 'Reduce file size' };
            case 'pdf_to_markdown':
                return { title: 'PDF to Markdown', subtitle: 'Extract text into a .md file' };
            case 'image_resize':
                return { title: 'Smart Resize', subtitle: 'Aspect-aware scaling' };
            case 'image_convert':
                return { title: 'Format Convert', subtitle: 'Convert image formats' };
            case 'image_batch_optimize':
                return { title: 'Batch Optimize', subtitle: 'Compress a set of images' };
            default:
                return null;
        }
    }, [activeTool]);

    const validationError = useMemo(() => {
        if (!activeTool) return 'No tool selected';

        if (activeTool === 'pdf_merge') {
            if (inputPaths.length < 2) return 'Select at least 2 PDFs.';
            if (!outputPath) return 'Choose an output file.';
            return null;
        }

        if (activeTool === 'image_batch_optimize') {
            if (inputPaths.length < 1) return 'Select at least 1 image.';
            if (!outputDir) return 'Choose an output folder.';
            if (!Number.isFinite(jpegQuality) || jpegQuality < 1 || jpegQuality > 100) return 'JPEG quality must be between 1 and 100.';
            return null;
        }

        if (!inputPath) return 'Select an input file.';
        if (!outputPath) return 'Choose an output file.';

        if (activeTool === 'pdf_extract_pages') {
            if (!pagesSpec.trim()) return 'Enter pages (e.g. 1-3,5).';
        }

        if (activeTool === 'pdf_compress') {
            if (!Number.isFinite(compressionLevel) || compressionLevel < 0 || compressionLevel > 9) return 'Compression level must be between 0 and 9.';
        }

        if (activeTool === 'image_resize') {
            if (!Number.isFinite(resizeWidth) || resizeWidth <= 0) return 'Width must be a positive number.';
            if (!Number.isFinite(resizeHeight) || resizeHeight <= 0) return 'Height must be a positive number.';
        }

        return null;
    }, [
        activeTool,
        compressionLevel,
        inputPath,
        inputPaths.length,
        jpegQuality,
        outputDir,
        outputPath,
        pagesSpec,
        resizeHeight,
        resizeWidth,
    ]);

    async function chooseInput() {
        setError(null);
        setResultPath(null);

        if (!activeTool) return;

        if (activeTool === 'pdf_merge') {
            const selected = await open({
                multiple: true,
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
            });
            if (!selected) return;
            const paths = Array.isArray(selected) ? selected : [selected];
            setInputPaths(paths);
            return;
        }

        if (activeTool === 'image_batch_optimize') {
            const selected = await open({
                multiple: true,
                filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
            });
            if (!selected) return;
            const paths = Array.isArray(selected) ? selected : [selected];
            setInputPaths(paths);
            return;
        }

        const filters =
            activeTool.startsWith('pdf_')
                ? [{ name: 'PDF', extensions: ['pdf'] }]
                : [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff'] }];

        const selected = await open({ multiple: false, filters });
        if (!selected || typeof selected !== 'string') return;
        setInputPath(selected);
    }

    async function chooseOutput() {
        setError(null);
        setResultPath(null);

        if (!activeTool) return;

        if (activeTool === 'image_batch_optimize') {
            const selected = await open({ directory: true, multiple: false, title: 'Select output folder' });
            if (!selected || typeof selected !== 'string') return;
            setOutputDir(selected);
            return;
        }

        const config = (() => {
            switch (activeTool) {
                case 'pdf_merge':
                    return { title: 'Save merged PDF', defaultPath: 'merged.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] };
                case 'pdf_extract_pages':
                    return { title: 'Save extracted pages PDF', defaultPath: 'extracted.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] };
                case 'pdf_compress':
                    return { title: 'Save compressed PDF', defaultPath: 'compressed.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] };
                case 'pdf_to_markdown':
                    return { title: 'Save Markdown', defaultPath: 'document.md', filters: [{ name: 'Markdown', extensions: ['md'] }] };
                case 'image_resize':
                    return { title: 'Save resized image', defaultPath: 'resized.png', filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] };
                case 'image_convert':
                    return { title: 'Save converted image', defaultPath: 'converted.png', filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff'] }] };
                default:
                    return null;
            }
        })();

        if (!config) return;
        const selected = await save(config);
        if (!selected) return;
        setOutputPath(selected);
    }

    async function runActiveTool() {
        if (validationError || !activeTool) return;

        setIsRunning(true);
        setError(null);
        setResultPath(null);

        try {
            if (activeTool === 'pdf_merge') {
                const res = await invoke<string>('pdf_merge', { inputPaths, outputPath });
                setResultPath(res);
                return;
            }

            if (activeTool === 'pdf_extract_pages') {
                const res = await invoke<string>('pdf_extract_pages', {
                    inputPath,
                    pagesSpec: pagesSpec.trim(),
                    outputPath,
                });
                setResultPath(res);
                return;
            }

            if (activeTool === 'pdf_compress') {
                const res = await invoke<string>('pdf_compress', {
                    inputPath,
                    outputPath,
                    compressionLevel: compressionLevel,
                });
                setResultPath(res);
                return;
            }

            if (activeTool === 'pdf_to_markdown') {
                const res = await invoke<string>('pdf_to_markdown', { inputPath, outputPath });
                setResultPath(res);
                return;
            }

            if (activeTool === 'image_resize') {
                const res = await invoke<string>('image_resize', {
                    inputPath,
                    outputPath,
                    width: Math.floor(resizeWidth),
                    height: Math.floor(resizeHeight),
                    mode: resizeMode,
                });
                setResultPath(res);
                return;
            }

            if (activeTool === 'image_convert') {
                const res = await invoke<string>('image_convert', { inputPath, outputPath });
                setResultPath(res);
                return;
            }

            if (activeTool === 'image_batch_optimize') {
                const res = await invoke<string[]>('image_batch_optimize', {
                    inputPaths,
                    outputDir,
                    jpegQuality,
                });
                if (res.length > 0) {
                    setResultPath(outputDir);
                } else {
                    setError('No outputs were produced.');
                }
                return;
            }
        } catch (e: any) {
            const msg = typeof e === 'string' ? e : e?.message || 'Tool failed';
            setError(msg);
        } finally {
            setIsRunning(false);
        }
    }

    return (
        <>
        <motion.div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6" variants={itemVariants}>
            {/* PDF Transformation Bento */}
            <div className="glass-card p-6 rounded-3xl border-white/5 bg-gradient-to-br from-red-500/5 via-transparent to-transparent">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-400/10 rounded-lg">
                            <FileText size={18} className="text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">PDF Forge</h3>
                            <p className="text-[10px] text-text-tertiary font-mono">DOCUMENT MANIPULATION</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ToolCard
                        title="Merge PDFs"
                        description="Combine multiple files"
                        icon={Layers}
                        color="text-orange-400"
                        bgColor="bg-orange-400/10"
                        onClick={handleMergePdfs}
                    />
                    <ToolCard
                        title="Split Pages"
                        description="Extract specific pages"
                        icon={Scissors}
                        color="text-yellow-400"
                        bgColor="bg-yellow-400/10"
                        onClick={handleExtractPdfPages}
                    />
                    <ToolCard
                        title="Compress"
                        description="Reduce file size"
                        icon={Minimize2}
                        color="text-emerald-400"
                        bgColor="bg-emerald-400/10"
                        onClick={handleCompressPdf}
                    />
                    <ToolCard
                        title="PDF to Markdown"
                        description="AI-powered extraction"
                        icon={FileType}
                        color="text-blue-400"
                        bgColor="bg-blue-400/10"
                        onClick={handlePdfToMarkdown}
                    />
                </div>
            </div>

            {/* Image Studio Bento */}
            <div className="glass-card p-6 rounded-3xl border-white/5 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-400/10 rounded-lg">
                            <ImageIcon size={18} className="text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Image Studio</h3>
                            <p className="text-[10px] text-text-tertiary font-mono">VISUAL ASSET TOOLS</p>
                        </div>
                    </div>
                    <div className="px-2 py-1 bg-accent/10 border border-accent/20 rounded text-[8px] font-bold text-accent uppercase tracking-tighter animate-pulse">
                        Pro Tools
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ToolCard
                        title="Remove Background"
                        description="AI magic isolation"
                        icon={Zap}
                        color="text-purple-400"
                        bgColor="bg-purple-400/10"
                        disabled
                        onClick={undefined}
                    />
                    <ToolCard
                        title="Smart Resize"
                        description="Aspect-aware scaling"
                        icon={Minimize2}
                        color="text-pink-400"
                        bgColor="bg-pink-400/10"
                        onClick={handleImageResize}
                    />
                    <ToolCard
                        title="Format Convert"
                        description="WEBP, PNG, JPG"
                        icon={Repeat}
                        color="text-cyan-400"
                        bgColor="bg-cyan-400/10"
                        onClick={handleImageConvert}
                    />
                    <ToolCard
                        title="Batch Optimize"
                        description="Instant compression"
                        icon={Layers}
                        color="text-indigo-400"
                        bgColor="bg-indigo-400/10"
                        onClick={handleBatchOptimize}
                    />
                </div>
            </div>
        </motion.div>

        {isDialogOpen && dialogMeta && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="glass-card w-[560px] p-6 rounded-2xl border border-white/10 shadow-xl bg-bg-surface flex flex-col max-h-[85vh]">
                    <div className="flex justify-between items-center mb-6 flex-shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-white font-mono">{dialogMeta.title}</h2>
                            <p className="text-xs text-text-tertiary font-mono uppercase tracking-wider">{dialogMeta.subtitle}</p>
                        </div>
                        <button
                            onClick={closeDialog}
                            className={cn("text-text-tertiary hover:text-white transition-colors", isRunning && "opacity-50 cursor-not-allowed")}
                            disabled={isRunning}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-5">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase text-text-tertiary font-bold tracking-wider font-mono">Input</span>
                                <button
                                    onClick={chooseInput}
                                    className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-text-secondary font-mono"
                                    disabled={isRunning}
                                >
                                    Select
                                </button>
                            </div>
                            <div className="bg-bg-primary border border-border rounded p-3 text-xs text-text-secondary font-mono break-all">
                                {activeTool === 'pdf_merge' || activeTool === 'image_batch_optimize'
                                    ? inputPaths.length
                                        ? `${inputPaths.length} files selected`
                                        : 'No files selected'
                                    : inputPath || 'No file selected'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase text-text-tertiary font-bold tracking-wider font-mono">
                                    {activeTool === 'image_batch_optimize' ? 'Output folder' : 'Output'}
                                </span>
                                <button
                                    onClick={chooseOutput}
                                    className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-text-secondary font-mono"
                                    disabled={isRunning}
                                >
                                    Select
                                </button>
                            </div>
                            <div className="bg-bg-primary border border-border rounded p-3 text-xs text-text-secondary font-mono break-all">
                                {activeTool === 'image_batch_optimize' ? outputDir || 'No folder selected' : outputPath || 'No output selected'}
                            </div>
                        </div>

                        {activeTool === 'pdf_extract_pages' && (
                            <div className="space-y-2">
                                <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Pages</label>
                                <input
                                    value={pagesSpec}
                                    onChange={(e) => setPagesSpec(e.target.value)}
                                    placeholder="e.g. 1-3,5,7"
                                    className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent text-white font-mono"
                                    disabled={isRunning}
                                />
                            </div>
                        )}

                        {activeTool === 'pdf_compress' && (
                            <div className="space-y-2">
                                <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Compression level (0-9)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={0}
                                        max={9}
                                        step={1}
                                        value={compressionLevel}
                                        onChange={(e) => setCompressionLevel(Number(e.target.value))}
                                        className="w-full accent-accent"
                                        disabled={isRunning}
                                    />
                                    <span className="text-sm font-mono text-text-primary w-6 text-right">{compressionLevel}</span>
                                </div>
                            </div>
                        )}

                        {activeTool === 'image_resize' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Width (px)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={resizeWidth}
                                            onChange={(e) => setResizeWidth(Number(e.target.value))}
                                            className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent text-white font-mono"
                                            disabled={isRunning}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Height (px)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={resizeHeight}
                                            onChange={(e) => setResizeHeight(Number(e.target.value))}
                                            className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent text-white font-mono"
                                            disabled={isRunning}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Mode</label>
                                    <select
                                        value={resizeMode}
                                        onChange={(e) => setResizeMode(e.target.value as any)}
                                        className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent text-white font-mono"
                                        disabled={isRunning}
                                    >
                                        <option value="contain">Contain</option>
                                        <option value="cover">Cover</option>
                                        <option value="stretch">Stretch</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeTool === 'image_batch_optimize' && (
                            <div className="space-y-2">
                                <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">JPEG quality (1-100)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={1}
                                        max={100}
                                        step={1}
                                        value={jpegQuality}
                                        onChange={(e) => setJpegQuality(Number(e.target.value))}
                                        className="w-full accent-accent"
                                        disabled={isRunning}
                                    />
                                    <span className="text-sm font-mono text-text-primary w-10 text-right">{jpegQuality}</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-200 font-mono break-words">
                                {error}
                            </div>
                        )}

                        {resultPath && (
                            <div className="p-3 rounded-lg border border-accent/30 bg-accent/10 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider">Result ready</p>
                                    <p className="text-xs text-text-secondary font-mono break-all truncate">{resultPath}</p>
                                </div>
                                <button
                                    onClick={() => openResult(resultPath)}
                                    className="px-3 py-1.5 rounded bg-accent text-black text-xs font-bold font-mono"
                                >
                                    Open
                                </button>
                            </div>
                        )}

                        {validationError && !error && !resultPath && (
                            <div className="p-3 rounded-lg border border-white/10 bg-white/5 text-xs text-text-tertiary font-mono">
                                {validationError}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border flex-shrink-0">
                        <button
                            onClick={closeDialog}
                            className="px-4 py-2 text-sm text-text-secondary hover:text-white font-mono"
                            disabled={isRunning}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={runActiveTool}
                            disabled={!!validationError || isRunning}
                            className="px-6 py-2 bg-accent text-black font-bold rounded text-sm font-mono disabled:opacity-50"
                        >
                            {isRunning ? 'Running…' : 'Run'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
