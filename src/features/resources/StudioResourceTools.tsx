import { motion } from 'framer-motion';
import {
    FileText,
    Image as ImageIcon,
    Scissors,
    Minimize2,
    Repeat,
    Layers,
    FileType,
    Zap,
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
}

function ToolCard({ title, description, icon: Icon, color, bgColor, className }: ToolCardProps) {
    return (
        <motion.button
            className={cn(
                "glass-card p-5 rounded-2xl flex items-center gap-4 hover:border-accent/40 transition-all group text-left",
                className
            )}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
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
    return (
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
                    />
                    <ToolCard
                        title="Split Pages"
                        description="Extract specific pages"
                        icon={Scissors}
                        color="text-yellow-400"
                        bgColor="bg-yellow-400/10"
                    />
                    <ToolCard
                        title="Compress"
                        description="Reduce file size"
                        icon={Minimize2}
                        color="text-emerald-400"
                        bgColor="bg-emerald-400/10"
                    />
                    <ToolCard
                        title="PDF to Markdown"
                        description="AI-powered extraction"
                        icon={FileType}
                        color="text-blue-400"
                        bgColor="bg-blue-400/10"
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
                    />
                    <ToolCard
                        title="Smart Resize"
                        description="Aspect-aware scaling"
                        icon={Minimize2}
                        color="text-pink-400"
                        bgColor="bg-pink-400/10"
                    />
                    <ToolCard
                        title="Format Convert"
                        description="WEBP, PNG, JPG"
                        icon={Repeat}
                        color="text-cyan-400"
                        bgColor="bg-cyan-400/10"
                    />
                    <ToolCard
                        title="Batch Optimize"
                        description="Instant compression"
                        icon={Layers}
                        color="text-indigo-400"
                        bgColor="bg-indigo-400/10"
                    />
                </div>
            </div>
        </motion.div>
    );
}
