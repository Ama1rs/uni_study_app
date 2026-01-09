import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { financeService, FinanceAsset } from '@/lib/financeService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface AssetModalProps {
    asset: FinanceAsset | null;
    onClose: () => void;
    onUpdate: () => void;
}

export function AssetModal({ asset, onClose, onUpdate }: AssetModalProps) {
    const [label, setLabel] = useState(asset?.label || '');
    const [amount, setAmount] = useState(asset?.amount.toString() || '');
    const [type, setType] = useState(asset?.type_ || 'cash');
    const [color, setColor] = useState(asset?.color || 'bg-blue-500');

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        action: () => void;
    }>({ isOpen: false, title: '', description: '', action: () => { } });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                id: asset?.id,
                label,
                amount: parseFloat(amount),
                type_: type,
                color
            };
            if (asset) {
                await financeService.updateAsset(data as any);
            } else {
                await financeService.createAsset(data as any);
            }
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to save asset:', error);
        }
    };

    const handleDelete = async () => {
        if (!asset?.id) return;
        setConfirmState({
            isOpen: true,
            title: 'Delete Asset',
            description: 'Are you sure you want to delete this asset?',
            action: async () => {
                try {
                    await financeService.deleteAsset(asset.id!);
                    onUpdate();
                    onClose();
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    console.error('Failed to delete asset:', error);
                }
            }
        });
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden relative"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text-primary">{asset ? 'Edit Asset' : 'Add Asset'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <X size={20} className="text-text-tertiary" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Label</label>
                        <input
                            required
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Amount</label>
                        <input
                            required
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors appearance-none"
                            >
                                <option value="cash">Cash</option>
                                <option value="stock">Stock</option>
                                <option value="crypto">Crypto</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-text-tertiary font-mono uppercase block mb-1">Color</label>
                            <select
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary text-sm focus:border-accent outline-none transition-colors appearance-none"
                            >
                                <option value="bg-blue-500">Blue</option>
                                <option value="bg-emerald-500">Emerald</option>
                                <option value="bg-orange-500">Orange</option>
                                <option value="bg-purple-500">Purple</option>
                                <option value="bg-rose-500">Rose</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        {asset && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="flex-1 bg-rose-500/10 text-rose-500 font-bold py-3 rounded-xl hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 size={18} />
                                Delete
                            </button>
                        )}
                        <button
                            type="submit"
                            className="flex-[2] bg-accent text-black font-bold py-3 rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-accent/20"
                        >
                            {asset ? 'Update Asset' : 'Create Asset'}
                        </button>
                    </div>
                </form>
            </motion.div>
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.action}
                onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                danger
                confirmText="Delete"
            />
        </motion.div>
    );
}
