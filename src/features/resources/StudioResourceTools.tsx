import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Image as ImageIcon,
    Scissors,
    Minimize2,
    Repeat,
    Layers,
    FileType,
    X,
    Eye,
    EyeOff,
    FileDigit,
    ArrowLeft,
    ArrowRight,
    Sparkles
} from 'lucide-react';

import { cn } from '@/lib/utils';



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

    const [previewIndex, setPreviewIndex] = useState(0);

    const activePaths = useMemo(() => {
        if (activeTool === 'pdf_merge' || activeTool === 'image_batch_optimize') {
            return inputPaths;
        }
        return inputPath ? [inputPath] : [];
    }, [activeTool, inputPaths, inputPath]);

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
        setPreviewIndex(0);
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
        <div className="flex flex-col gap-6">
            {/* PDF Tools */}
            <div>
                <div className="flex items-center gap-2 mb-2 px-2">
                    <FileText size={14} className="text-red-400" />
                    <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest font-mono">PDF Tools</h3>
                </div>
                <div className="flex flex-col gap-1">
                    <ToolItem
                        title="Merge PDFs"
                        icon={Layers}
                        color="text-orange-400"
                        onClick={handleMergePdfs}
                    />
                    <ToolItem
                        title="Split Pages"
                        icon={Scissors}
                        color="text-yellow-400"
                        onClick={handleExtractPdfPages}
                    />
                    <ToolItem
                        title="Compress"
                        icon={Minimize2}
                        color="text-emerald-400"
                        onClick={handleCompressPdf}
                    />
                    <ToolItem
                        title="PDF to Markdown"
                        icon={FileType}
                        color="text-blue-400"
                        onClick={handlePdfToMarkdown}
                    />
                </div>
            </div>

            {/* Image Tools */}
            <div>
                <div className="flex items-center gap-2 mb-2 px-2">
                    <ImageIcon size={14} className="text-cyan-400" />
                    <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-widest font-mono">Image Tools</h3>
                </div>
                <div className="flex flex-col gap-1">
                    <ToolItem
                        title="Smart Resize"
                        icon={Minimize2}
                        color="text-pink-400"
                        onClick={handleImageResize}
                    />
                    <ToolItem
                        title="Format Convert"
                        icon={Repeat}
                        color="text-cyan-400"
                        onClick={handleImageConvert}
                    />
                    <ToolItem
                        title="Batch Optimize"
                        icon={Layers}
                        color="text-indigo-400"
                        onClick={handleBatchOptimize}
                    />
                </div>
            </div>

            {isDialogOpen && dialogMeta && (typeof document !== 'undefined' ? createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-bg-surface w-full max-w-[95vw] h-[92vh] rounded-lg border border-border shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center px-8 py-5 border-b border-border flex-shrink-0 bg-bg-surface/80 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-accent/20 rounded-xl border border-accent/30">
                                    <Sparkles size={20} className="text-accent" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-text-primary font-mono tracking-tight">{dialogMeta.title}</h2>
                                    <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-[0.2em]">{dialogMeta.subtitle}</p>
                                </div>
                            </div>
                            <button
                                onClick={closeDialog}
                                className={cn("text-text-tertiary hover:text-text-primary transition-all p-2 hover:bg-white/5 rounded-full border border-transparent hover:border-border", isRunning && "opacity-50 cursor-not-allowed")}
                                disabled={isRunning}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex min-h-0 overflow-hidden">
                            {/* Left Pane: Settings */}
                            <div className="w-[320px] border-r border-border p-6 overflow-y-auto space-y-8 bg-bg-surface/30 backdrop-blur-sm shadow-xl flex-shrink-0">
                                {/* Input Selection */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                            <span className="text-xs uppercase text-text-tertiary font-bold tracking-wider font-mono">Input Source</span>
                                        </div>
                                        <button
                                            onClick={chooseInput}
                                            className="px-3 py-1 rounded-sm bg-bg-hover hover:bg-white/10 border border-border text-xs text-text-secondary font-mono transition-colors flex items-center gap-2"
                                            disabled={isRunning}
                                        >
                                            <Layers size={12} />
                                            Select Files
                                        </button>
                                    </div>
                                    <div className="bg-bg-primary border border-border rounded-sm p-3 text-xs text-text-secondary font-mono break-all min-h-[40px] flex items-center">
                                        {activeTool === 'pdf_merge' || activeTool === 'image_batch_optimize'
                                            ? inputPaths.length
                                                ? `${inputPaths.length} files selected`
                                                : 'No files selected'
                                            : inputPath || 'No file selected'}
                                    </div>
                                </div>

                                {/* Output Selection */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            <span className="text-xs uppercase text-text-tertiary font-bold tracking-wider font-mono">
                                                {activeTool === 'image_batch_optimize' ? 'Output folder' : 'Output Destination'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={chooseOutput}
                                            className="px-3 py-1 rounded-sm bg-bg-hover hover:bg-white/10 border border-border text-xs text-text-secondary font-mono transition-colors flex items-center gap-2"
                                            disabled={isRunning}
                                        >
                                            <Repeat size={12} />
                                            Choose Path
                                        </button>
                                    </div>
                                    <div className="bg-bg-primary border border-border rounded-sm p-3 text-xs text-text-secondary font-mono break-all min-h-[40px] flex items-center">
                                        {activeTool === 'image_batch_optimize' ? outputDir || 'No folder selected' : outputPath || 'No output selected'}
                                    </div>
                                </div>

                                {/* Tool Specific Options */}
                                <div className="pt-4 border-t border-border space-y-5">
                                    <div className="flex items-center gap-2">
                                        <Minimize2 size={14} className="text-text-tertiary" />
                                        <span className="text-xs uppercase text-text-tertiary font-bold tracking-wider font-mono">Configuration</span>
                                    </div>

                                    {activeTool === 'pdf_extract_pages' && (
                                        <div className="space-y-2">
                                            <label className="block text-xs text-text-secondary font-mono">Page Range</label>
                                            <input
                                                value={pagesSpec}
                                                onChange={(e) => setPagesSpec(e.target.value)}
                                                placeholder="e.g. 1-3,5,7"
                                                className="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-accent text-text-primary font-mono transition-colors"
                                                disabled={isRunning}
                                            />
                                        </div>
                                    )}

                                    {activeTool === 'pdf_compress' && (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="block text-xs text-text-secondary font-mono">Compression Level</label>
                                                <span className="text-xs font-mono text-accent">{compressionLevel}</span>
                                            </div>
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
                                        </div>
                                    )}

                                    {activeTool === 'image_resize' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-xs text-text-secondary font-mono">Width (px)</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={resizeWidth}
                                                        onChange={(e) => setResizeWidth(Number(e.target.value))}
                                                        className="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-accent text-text-primary font-mono transition-colors"
                                                        disabled={isRunning}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-xs text-text-secondary font-mono">Height (px)</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={resizeHeight}
                                                        onChange={(e) => setResizeHeight(Number(e.target.value))}
                                                        className="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-accent text-text-primary font-mono transition-colors"
                                                        disabled={isRunning}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-xs text-text-secondary font-mono">Scaling Mode</label>
                                                <select
                                                    value={resizeMode}
                                                    onChange={(e) => setResizeMode(e.target.value as any)}
                                                    className="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-accent text-text-primary font-mono transition-colors"
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
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="block text-xs text-text-secondary font-mono">JPEG Quality</label>
                                                <span className="text-xs font-mono text-accent">{jpegQuality}%</span>
                                            </div>
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
                                        </div>
                                    )}
                                </div>

                                {/* Messages / Results */}
                                <div className="space-y-3">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="p-4 rounded-sm border border-red-500/30 bg-red-500/10 text-xs text-red-200 font-mono break-words leading-relaxed"
                                        >
                                            <div className="font-bold flex items-center gap-2 mb-1">
                                                <X size={12} />
                                                ERROR
                                            </div>
                                            {error}
                                        </motion.div>
                                    )}

                                    {validationError && !error && !resultPath && (
                                        <div className="p-4 rounded-sm border border-border bg-bg-primary/50 text-xs text-text-tertiary font-mono leading-relaxed italic">
                                            {validationError}
                                        </div>
                                    )}

                                    {resultPath && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="p-4 rounded-sm border border-accent/30 bg-accent/10 space-y-3"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                                <p className="text-xs font-mono text-text-primary font-bold uppercase tracking-wider">Process Complete</p>
                                            </div>
                                            <p className="text-[10px] text-text-tertiary font-mono break-all bg-black/20 p-2 rounded-sm">{resultPath}</p>
                                            <button
                                                onClick={() => openResult(resultPath)}
                                                className="w-full px-3 py-2 rounded-sm bg-accent text-black text-xs font-bold font-mono hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <FileType size={14} />
                                                Open Result
                                            </button>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Right Pane: Preview */}
                            <div className="flex-1 bg-black/40 flex flex-col min-w-0 relative">
                                <div className="absolute top-6 left-8 z-10 flex items-center gap-3 bg-bg-surface/80 backdrop-blur-md px-4 py-2 rounded-xl border border-border shadow-lg">
                                    <div className="p-1.5 bg-accent/20 rounded-md">
                                        <Eye size={14} className="text-accent" />
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-bold text-text-primary uppercase tracking-widest font-mono">Dynamic Preview</h3>
                                    </div>
                                    {activePaths.length > 0 && (
                                        <div className="ml-2 flex items-center gap-2 text-[9px] font-mono text-text-tertiary bg-white/5 px-2 py-0.5 rounded-full border border-border/50">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            {activePaths.length} FILE{activePaths.length !== 1 ? 'S' : ''} LOADED
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-h-0">
                                    <FilePreview
                                        paths={activePaths}
                                        currentIndex={previewIndex}
                                        onIndexChange={setPreviewIndex}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-border flex-shrink-0 bg-bg-surface">
                            <button
                                onClick={closeDialog}
                                className="px-6 py-2.5 text-sm text-text-secondary hover:text-text-primary font-mono transition-colors uppercase tracking-widest"
                                disabled={isRunning}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={runActiveTool}
                                disabled={!!validationError || isRunning}
                                className="px-10 py-2.5 bg-accent text-black font-bold rounded-sm text-sm font-mono disabled:opacity-50 hover:bg-accent/90 transition-all flex items-center gap-2 uppercase tracking-widest"
                            >
                                {isRunning ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Run Action
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>, document.body) : null)}
        </div>
    );
}

function FilePreview({ paths, currentIndex, onIndexChange }: { paths: string[]; currentIndex: number; onIndexChange: (idx: number) => void }) {
    if (paths.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary space-y-4 bg-bg-primary/50 rounded-sm border border-dashed border-border/50">
                <div className="p-6 bg-bg-surface rounded-full border border-border shadow-inner">
                    <EyeOff size={48} className="opacity-20" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-mono uppercase tracking-widest font-bold">No Preview Available</p>
                    <p className="text-[10px] font-mono opacity-50 mt-1">SELECT A FILE TO BEGIN</p>
                </div>
            </div>
        );
    }

    const currentPath = paths[currentIndex];
    const isPdf = currentPath.toLowerCase().endsWith('.pdf');

    const assetUrl = convertFileSrc(currentPath);

    return (
        <div className="relative flex flex-col h-full bg-black/10 overflow-hidden">
            <div className="flex-1 min-h-0 flex items-center justify-center relative group">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPath}
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.01 }}
                        transition={{ duration: 0.25 }}
                        className="w-full h-full flex items-center justify-center"
                    >
                        {isPdf ? (
                            <embed
                                src={`${assetUrl}#toolbar=0&navpanes=0&view=FitH`}
                                type="application/pdf"
                                className="w-full h-full border-0 bg-white shadow-2xl"
                            />
                        ) : (
                            <img
                                src={assetUrl}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain shadow-[0_0_80px_rgba(0,0,0,0.4)]"
                                onError={() => {
                                    console.error("Preview failed to load:", assetUrl);
                                    // Fallback UI or attempt to fix URL if needed
                                }}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>

                {paths.length > 1 && (
                    <>
                        <button
                            onClick={() => onIndexChange((currentIndex - 1 + paths.length) % paths.length)}
                            className="absolute left-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <button
                            onClick={() => onIndexChange((currentIndex + 1) % paths.length)}
                            className="absolute right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </>
                )}
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-bg-surface/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-border shadow-2xl flex items-center gap-4 min-w-[300px] max-w-[80%] border-white/10">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className="p-2 bg-bg-primary rounded-lg border border-border">
                        {isPdf ? <FileDigit size={16} className="text-red-400" /> : <ImageIcon size={16} className="text-cyan-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-text-primary truncate font-bold">{currentPath.split(/[\\/]/).pop()}</p>
                        <p className="text-[9px] font-mono text-text-tertiary truncate opacity-60 font-medium tracking-tight">{currentPath}</p>
                    </div>
                </div>
                {paths.length > 1 && (
                    <div className="text-[10px] font-mono text-accent font-bold px-3 py-1 bg-accent/10 rounded-full border border-accent/20">
                        {currentIndex + 1} / {paths.length}
                    </div>
                )}
            </div>
        </div>
    );
}

function ToolItem({ title, icon: Icon, color, onClick }: { title: string; icon: any; color: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 p-2 rounded-sm hover:bg-bg-hover group transition-colors w-full text-left"
        >
            <Icon size={16} className={cn(color, "opacity-70 group-hover:opacity-100 transition-opacity")} />
            <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary">{title}</span>
        </button>
    );
}
