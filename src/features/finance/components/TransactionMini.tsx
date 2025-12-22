import { cn } from '@/lib/utils';

interface TransactionMiniProps {
    label: string;
    amount: string;
    date: string;
    positive: boolean;
    onClick: () => void;
}

export function TransactionMini({ label, amount, date, positive, onClick }: TransactionMiniProps) {
    return (
        <div
            onClick={onClick}
            className="flex-1 min-w-[200px] p-3 rounded-xl bg-white/5 border border-border/50 flex items-center justify-between hover:border-accent/40 transition-colors cursor-pointer"
        >
            <div>
                <p className="text-xs text-text-primary font-medium">{label}</p>
                <p className="text-[10px] text-text-tertiary">{date}</p>
            </div>
            <p className={cn("text-xs font-bold font-mono", positive ? "text-emerald-400" : "text-rose-400")}>
                {amount}
            </p>
        </div>
    );
}
