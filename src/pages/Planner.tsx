import { Calendar } from './Calendar';

export function Planner() {
    return (
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-10">
            <div className="max-w-7xl mx-auto">
                <Calendar />
            </div>
        </div>
    );
}
