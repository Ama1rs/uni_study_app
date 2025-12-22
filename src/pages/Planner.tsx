import { Calendar } from './Calendar';
import { Layout } from '../components/layout/Layout';

export function Planner() {
    return (
        <Layout>
            <div className="flex-1 h-full overflow-y-auto p-8 custom-scrollbar">
                <Calendar />
            </div>
        </Layout>
    );
}
