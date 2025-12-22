import { cn } from '@/lib/utils';

interface AssetItemProps {
    icon: any;
    label: string;
    amount: string;
    color: string;
    percent: number;
    onClick: () => void;
}

export function AssetItem({ icon: Icon, label, amount, color, percent, onClick }: AssetItemProps) {
    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg", color, "bg-opacity-20")}>
                    <Icon size={18} className={color.replace('bg-', 'text-')} />
                </div>
                <div>
                    <p className="text-sm text-text-primary font-medium">{label}</p>
                    <p className="text-[10px] text-text-tertiary font-mono">{percent}% of total</p>
                </div>
            </div>
            <p className="text-sm text-text-primary font-bold">{amount}</p>
        </div>
    );
}
