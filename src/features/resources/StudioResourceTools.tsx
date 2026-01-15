import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

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
    X
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-bg-surface w-[560px] p-6 rounded-sm border border-border shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-text-primary font-mono">{dialogMeta.title}</h2>
                                <p className="text-xs text-text-tertiary font-mono uppercase tracking-wider">{dialogMeta.subtitle}</p>
                            </div>
                            <button
                                onClick={closeDialog}
                                className={cn("text-text-tertiary hover:text-text-primary transition-colors", isRunning && "opacity-50 cursor-not-allowed")}
                                disabled={isRunning}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-5">
                            {/* Input Selection */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs uppercase text-text-tertiary font-bold tracking-wider font-mono">Input</span>
                                    <button
                                        onClick={chooseInput}
                                        className="px-3 py-1 rounded-sm bg-bg-hover hover:bg-white/10 border border-border text-xs text-text-secondary font-mono transition-colors"
                                        disabled={isRunning}
                                    >
                                        Select Files
                                    </button>
                                </div>
                                <div className="bg-bg-primary border border-border rounded-sm p-3 text-xs text-text-secondary font-mono break-all">
                                    {activeTool === 'pdf_merge' || activeTool === 'image_batch_optimize'
                                        ? inputPaths.length
                                            ? `${inputPaths.length} files selected`
                                            : 'No files selected'
                                        : inputPath || 'No file selected'}
                                </div>
                            </div>

                            {/* Output Selection */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs uppercase text-text-tertiary font-bold tracking-wider font-mono">
                                        {activeTool === 'image_batch_optimize' ? 'Output folder' : 'Output'}
                                    </span>
                                    <button
                                        onClick={chooseOutput}
                                        className="px-3 py-1 rounded-sm bg-bg-hover hover:bg-white/10 border border-border text-xs text-text-secondary font-mono transition-colors"
                                        disabled={isRunning}
                                    >
                                        Select Destination
                                    </button>
                                </div>
                                <div className="bg-bg-primary border border-border rounded-sm p-3 text-xs text-text-secondary font-mono break-all">
                                    {activeTool === 'image_batch_optimize' ? outputDir || 'No folder selected' : outputPath || 'No output selected'}
                                </div>
                            </div>

                            {/* Tool Specific Options */}
                            {activeTool === 'pdf_extract_pages' && (
                                <div className="space-y-2">
                                    <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Pages</label>
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
                                <div className="space-y-2">
                                    <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Compression (0-9)</label>
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
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Width (px)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={resizeWidth}
                                                onChange={(e) => setResizeWidth(Number(e.target.value))}
                                                className="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-accent text-text-primary font-mono transition-colors"
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
                                                className="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-accent text-text-primary font-mono transition-colors"
                                                disabled={isRunning}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">Mode</label>
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
                                <div className="space-y-2">
                                    <label className="block text-xs uppercase text-text-tertiary font-bold tracking-wider mb-1 font-mono">JPEG Quality</label>
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
                                <div className="p-3 rounded-sm border border-red-500/30 bg-red-500/10 text-xs text-red-200 font-mono break-words">
                                    {error}
                                </div>
                            )}

                            {validationError && !error && !resultPath && (
                                <div className="p-3 rounded-sm border border-border bg-bg-primary text-xs text-text-tertiary font-mono">
                                    {validationError}
                                </div>
                            )}

                            {resultPath && (
                                <div className="p-3 rounded-sm border border-accent/30 bg-accent/10 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider">Result ready</p>
                                        <p className="text-xs text-text-secondary font-mono break-all truncate">{resultPath}</p>
                                    </div>
                                    <button
                                        onClick={() => openResult(resultPath)}
                                        className="px-3 py-1.5 rounded-sm bg-accent text-black text-xs font-bold font-mono hover:bg-accent-hover transition-colors"
                                    >
                                        Open
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border flex-shrink-0">
                            <button
                                onClick={closeDialog}
                                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary font-mono transition-colors"
                                disabled={isRunning}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={runActiveTool}
                                disabled={!!validationError || isRunning}
                                className="px-6 py-2 bg-accent text-black font-bold rounded-sm text-sm font-mono disabled:opacity-50 hover:bg-accent-hover transition-colors"
                            >
                                {isRunning ? 'Running...' : 'Run Action'}
                            </button>
                        </div>
                    </div>
                </div>, document.body) : null)}
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
