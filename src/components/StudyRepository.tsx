import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import { RepositoryView } from './RepositoryView';
import { Layout } from './Layout';

interface Repository {
    id: number;
    name: string;
    code?: string;
    semester?: string;
    description?: string;
}

export function StudyRepository() {
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
    const [showAddRepository, setShowAddRepository] = useState(false);

    // Form state
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [newSemester, setNewSemester] = useState('');
    const [newDesc, setNewDesc] = useState('');

    useEffect(() => {
        loadRepositories();
    }, []);

    async function loadRepositories() {
        try {
            const res = await invoke<Repository[]>('get_repositories');
            setRepositories(res);
        } catch (e) { console.error(e); }
    }

    async function addRepository() {
        if (!newName) return;
        try {
            await invoke('create_repository', {
                name: newName,
                code: newCode,
                semester: newSemester,
                description: newDesc
            });
            setNewName('');
            setNewCode('');
            setNewSemester('');
            setNewDesc('');
            setShowAddRepository(false);
            loadRepositories();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to create repository: ${e.toString()}`);
        }
    }

    async function deleteRepository(e: React.MouseEvent, id: number) {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this repository? This will delete all its content.')) return;
        try {
            await invoke('delete_repository', { id });
            loadRepositories();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to delete repository: ${e.toString()}`);
        }
    }

    if (selectedRepository) {
        return (
            <Layout>
                <RepositoryView repository={selectedRepository} onBack={() => setSelectedRepository(null)} />
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex-1 h-full overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-1 text-text-primary">Study Repository</h1>
                        <p className="text-text-secondary">Manage your subjects, lectures, and knowledge base.</p>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Add Card */}
                        <div
                            onClick={() => setShowAddRepository(true)}
                            className="p-6 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-bg-hover transition-colors min-h-[200px]"
                        >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-bg-surface">
                                <Plus size={24} className="text-text-secondary" />
                            </div>
                            <span className="font-medium text-text-secondary">Add New Repository</span>
                        </div>

                        {/* Repository Cards */}
                        {repositories.map(repo => (
                            <div
                                key={repo.id}
                                onClick={() => setSelectedRepository(repo)}
                                className="glass-card p-6 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg flex flex-col justify-between min-h-[200px] relative group"
                            >
                                <button
                                    onClick={(e) => deleteRepository(e, repo.id)}
                                    className="absolute top-4 right-4 p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Delete Repository"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <div>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg bg-accent">
                                        <BookOpen size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-1 text-text-primary">{repo.name}</h3>
                                    <p className="text-sm font-medium mb-2 text-text-secondary">{repo.code}</p>
                                    <p className="text-sm line-clamp-2 text-text-secondary opacity-80">
                                        {repo.description || 'No description provided.'}
                                    </p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-bg-hover text-text-secondary">
                                        {repo.semester || 'General'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Modal */}
                    {showAddRepository && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                            <div className="glass-card p-6 rounded-2xl w-96 shadow-xl bg-bg-surface">
                                <h3 className="text-lg font-bold mb-4 text-text-primary">Add New Repository</h3>

                                <div className="space-y-3">
                                    <input className="w-full px-4 py-2 rounded-lg outline-none border border-border bg-transparent text-text-primary placeholder-text-tertiary focus:border-accent transition-colors" placeholder="Repository Name (e.g. Calculus I)" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                                    <input className="w-full px-4 py-2 rounded-lg outline-none border border-border bg-transparent text-text-primary placeholder-text-tertiary focus:border-accent transition-colors" placeholder="Code (e.g. MATH101)" value={newCode} onChange={e => setNewCode(e.target.value)} />
                                    <input className="w-full px-4 py-2 rounded-lg outline-none border border-border bg-transparent text-text-primary placeholder-text-tertiary focus:border-accent transition-colors" placeholder="Semester (e.g. Fall 2025)" value={newSemester} onChange={e => setNewSemester(e.target.value)} />
                                    <textarea className="w-full px-4 py-2 rounded-lg outline-none border border-border bg-transparent resize-none h-20 text-text-primary placeholder-text-tertiary focus:border-accent transition-colors" placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    <button onClick={() => setShowAddRepository(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                                    <button onClick={addRepository} className="px-4 py-2 rounded-lg text-sm text-black font-medium bg-accent hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20">Create Repository</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
