import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { RepositoryView } from '../features/knowledge-graph/RepositoryView';

interface Repository {
    id: number;
    name: string;
    code?: string;
    semester?: string;
    description?: string;
}

export function StudyRepository() {
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
    const [showAddRepository, setShowAddRepository] = useState(false);
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
        } catch (e) {
            console.error("Failed to load repositories:", e);
        }
    }

    async function addRepository() {
        if (!newName.trim()) return;
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
        } catch (e) {
            console.error(e);
        }
    }

    async function deleteRepository(e: React.MouseEvent, id: number) {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this subject? All associated resources will be lost.')) return;
        try {
            await invoke('delete_repository', { id });
            loadRepositories();
        } catch (e) {
            console.error(e);
        }
    }

    if (selectedRepo) {
        return <RepositoryView repository={selectedRepo} onBack={() => setSelectedRepo(null)} />;
    }

    return (
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-10">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-1 text-text-primary">Subjects</h1>
                    <p className="text-text-secondary">Manage your courses, lectures, and knowledge base.</p>
                </div>

                {/* Content */}
                {repositories.length === 0 ? (
                    <EmptyState
                        title="No Subjects Found"
                        description="Get started by adding your first subject to the syllabus."
                        actionLabel="Add Subject"
                        onAction={() => setShowAddRepository(true)}
                        icon={BookOpen}
                    />
                ) : (
                    <Card variant="flat" padding="none">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/40 text-xs font-medium text-text-secondary uppercase tracking-wider">
                            <div className="col-span-4">Subject Name</div>
                            <div className="col-span-2">Code</div>
                            <div className="col-span-2">Semester</div>
                            <div className="col-span-3">Description</div>
                            <div className="col-span-1 text-right">Actions</div>
                        </div>

                        {/* Items */}
                        <div className="flex flex-col">
                            {/* Add Row */}
                            <div
                                onClick={() => setShowAddRepository(true)}
                                className="grid grid-cols-12 gap-4 p-4 hover:bg-bg-hover cursor-pointer transition-colors group opacity-80 hover:opacity-100 border-b border-border/30 last:border-0"
                            >
                                <div className="col-span-12 flex items-center gap-3 text-text-secondary">
                                    <div className="w-8 h-8 rounded-full bg-bg-surface border border-border/50 hover:border-accent/30 overflow-hidden cursor-pointer transition-all h-full flex items-center justify-center">
                                        <Plus size={16} />
                                    </div>
                                    <span className="text-sm font-medium">Add Subject...</span>
                                </div>
                            </div>

                            {/* Repo Rows */}
                            {repositories.map(repo => (
                                <div
                                    key={repo.id}
                                    onClick={() => setSelectedRepo(repo)}
                                    className="grid grid-cols-12 gap-4 p-4 hover:bg-bg-hover cursor-pointer transition-all duration-200 group items-center border-b border-border/30 last:border-0"
                                >
                                    <div className="col-span-4 flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-bg-surface border border-border">
                                            <BookOpen size={16} className="text-text-secondary" />
                                        </div>
                                        <span className="text-sm font-medium text-text-primary transition-colors">{repo.name}</span>
                                    </div>
                                    <div className="col-span-2 text-sm text-text-secondary font-mono">{repo.code}</div>
                                    <div className="col-span-2 text-sm text-text-tertiary">{repo.semester || '-'}</div>
                                    <div className="col-span-3 text-sm text-text-tertiary truncate">{repo.description || '-'}</div>
                                    <div className="col-span-1 flex justify-end">
                                        <Button
                                            variant="ghost"
                                            onClick={(e) => deleteRepository(e, repo.id)}
                                            className="text-text-tertiary hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-105 h-8 w-8 p-0"
                                            title="Delete Subject"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Add Modal */}
                {showAddRepository && (
                    <div className="fixed inset-0 bg-bg-primary/60 flex items-center justify-center z-50 backdrop-blur-sm">
                        <Card className="w-96" variant="default" padding="lg">
                            <h3 className="text-lg font-bold mb-4 text-text-primary">Add New Subject</h3>

                            <div className="space-y-3">
                                <input className="w-full px-4 py-2 rounded-lg outline-none border border-border bg-transparent text-text-primary placeholder-text-tertiary focus:border-accent transition-colors" placeholder="Subject Name (e.g. Calculus I)" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                                <input className="w-full px-4 py-2 rounded-lg outline-none border border-border bg-transparent text-text-primary placeholder-text-tertiary focus:border-accent transition-colors" placeholder="Code (e.g. MATH101)" value={newCode} onChange={e => setNewCode(e.target.value)} />
                                <input className="w-full px-4 py-2 rounded-lg outline-none border border-border bg-transparent text-text-primary placeholder-text-tertiary focus:border-accent transition-colors" placeholder="Semester (e.g. Fall 2025)" value={newSemester} onChange={e => setNewSemester(e.target.value)} />
                                <textarea className="w-full px-4 py-2 rounded-lg outline-none border border-border bg-transparent resize-none h-20 text-text-primary placeholder-text-tertiary focus:border-accent transition-colors" placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="ghost" onClick={() => setShowAddRepository(false)}>Cancel</Button>
                                <Button variant="primary" onClick={addRepository}>Create Subject</Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
