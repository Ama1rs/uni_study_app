import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, DollarSign, TrendingUp, CreditCard, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FinanceAsset } from '@/lib/financeService';
import { AssetItem } from './AssetItem';

interface AssetAllocationCardProps {
    assets: FinanceAsset[];
    totalAssetsValue: number;
    isCollapsed: boolean;
    setIsCollapsed: (v: boolean) => void;
    onSelectAsset: (asset: FinanceAsset | null) => void;
    itemVariants: any;
}

export function AssetAllocationCard({
    assets,
    totalAssetsValue,
    isCollapsed,
    setIsCollapsed,
    onSelectAsset,
    itemVariants
}: AssetAllocationCardProps) {
    return (
        <motion.div
            className={cn(
                "md:col-span-2 glass-card p-6 rounded-2xl flex flex-col transition-all duration-500",
                isCollapsed ? "md:row-span-1" : "md:row-span-2"
            )}
            variants={itemVariants}
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-mono text-text-secondary uppercase tracking-widest">Asset Allocation</h3>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 hover:bg-white/5 rounded-md transition-colors"
                >
                    <ChevronDown
                        size={18}
                        className={cn("text-text-tertiary transition-transform duration-300", isCollapsed && "-rotate-90")}
                    />
                </button>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden flex flex-col flex-1"
                    >
                        <div className="space-y-4 flex-1">
                            {assets.map((asset) => (
                                <AssetItem
                                    key={asset.id}
                                    icon={asset.type_ === 'cash' ? DollarSign : asset.type_ === 'stock' ? TrendingUp : asset.type_ === 'crypto' ? CreditCard : Target}
                                    label={asset.label}
                                    amount={`$${asset.amount.toLocaleString()}`}
                                    color={asset.color || 'bg-accent'}
                                    percent={Math.round((asset.amount / (totalAssetsValue || 1)) * 100)}
                                    onClick={() => onSelectAsset(asset)}
                                />
                            ))}
                            <button
                                onClick={() => onSelectAsset(null)}
                                className="w-full p-3 rounded-xl border border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-text-tertiary text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <Plus size={14} />
                                Add New Asset
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-border">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-mono text-text-tertiary uppercase">Allocation Strategy</span>
                                <span className="text-xs font-mono text-accent">Balanced</span>
                            </div>
                            <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden flex">
                                {assets.map((asset, i) => (
                                    <div
                                        key={i}
                                        className={cn(asset.color || "bg-accent", "h-full")}
                                        style={{ width: `${(asset.amount / (totalAssetsValue || 1)) * 100}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
