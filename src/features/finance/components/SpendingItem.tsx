import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SpendingItemProps {
    category: string;
    amount: string;
    trend: 'up' | 'down' | 'static';
    onClick: () => void;
}

export function SpendingItem({ category, amount, trend, onClick }: SpendingItemProps) {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3 border-b border-border/50 last:border-0 hover:bg-bg-hover transition-colors group cursor-pointer"
        >
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{category}</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-text-primary font-mono font-bold">{amount}</span>
                {trend === 'up' && <ArrowUpRight size={14} className="text-rose-400" />}
                {trend === 'down' && <ArrowDownRight size={14} className="text-emerald-400" />}
                {trend === 'static' && <div className="w-[14px] h-[1px] bg-text-tertiary" />}
            </div>
        </div>
    );
}
