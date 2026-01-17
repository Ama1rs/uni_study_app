import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Search, Filter, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

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

    // Form States
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [newSemester, setNewSemester] = useState('');
    const [newDesc, setNewDesc] = useState('');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');

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
            resetForm();
            setShowAddRepository(false);
            loadRepositories();
        } catch (e) {
            console.error(e);
        }
    }

    function resetForm() {
        setNewName('');
        setNewCode('');
        setNewSemester('');
        setNewDesc('');
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

    const filteredRepos = repositories.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.semester?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedRepo) {
        return <RepositoryView repository={selectedRepo} onBack={() => setSelectedRepo(null)} />;
    }

    return (
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-10 bg-bg-primary">
            <div className="max-w-[1400px] mx-auto space-y-8">
                {/* Header Toolbar */}
                <div className="flex items-center justify-between gap-4 mb-2">
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">Subjects Repository</h1>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-9 h-9 w-64 bg-bg-surface border border-border/40 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border transition-colors"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary border-l border-border/30 pl-3 cursor-pointer hover:text-text-primary transition-colors">
                                <Filter size={14} />
                            </div>
                        </div>

                        <Button
                            onClick={() => setShowAddRepository(true)}
                            className="bg-text-primary text-bg-primary hover:bg-text-secondary hover:text-bg-primary font-semibold px-4 h-9 text-sm rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Add Subject
                        </Button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="border border-border/30 rounded-xl overflow-hidden bg-bg-surface/30 backdrop-blur-sm">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-border/30 bg-bg-surface/50 text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                        <div className="col-span-4">Subject Name</div>
                        <div className="col-span-2">Code</div>
                        <div className="col-span-2">Semester</div>
                        <div className="col-span-3">Status/Description</div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>

                    {/* Table Body */}
                    {filteredRepos.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-text-tertiary/50">
                            {repositories.length === 0 ? (
                                <p>No subjects found. Add one to get started.</p>
                            ) : (
                                <p>No subjects match your search.</p>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-border/10">
                            {filteredRepos.map((repo) => (
                                <div
                                    key={repo.id}
                                    onClick={() => setSelectedRepo(repo)}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    {/* Name */}
                                    <div className="col-span-4 text-sm font-medium text-text-primary truncate">
                                        {repo.name}
                                    </div>

                                    {/* Code */}
                                    <div className="col-span-2 text-sm text-text-secondary font-mono">
                                        {repo.code || '-'}
                                    </div>

                                    {/* Semester */}
                                    <div className="col-span-2 text-sm text-text-secondary">
                                        {repo.semester || '-'}
                                    </div>

                                    {/* Description */}
                                    <div className="col-span-3 text-sm text-text-tertiary truncate">
                                        {repo.description || <span className="text-text-tertiary/40">Active</span>}
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Mock Edit Button - visual only for now as edit isn't fully wired */}
                                        <button
                                            className="p-1.5 rounded-md hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
                                            onClick={(e) => { e.stopPropagation(); /* TODO: Edit */ }}
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            className="p-1.5 rounded-md hover:bg-red-500/20 text-text-tertiary hover:text-red-400 transition-colors"
                                            onClick={(e) => deleteRepository(e, repo.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors">
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Modal */}
                {showAddRepository && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                        <Card className="w-[450px] shadow-2xl scale-100 animate-in zoom-in-95 duration-200" variant="default" padding="lg">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-text-primary">Add Subject</h3>
                                <Button variant="ghost" className="h-8 w-8 p-0 text-text-tertiary" onClick={() => setShowAddRepository(false)}>×</Button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Subject Name</label>
                                    <input
                                        className="w-full px-4 py-2.5 rounded-xl outline-none border border-border bg-bg-surface/50 text-text-primary placeholder-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all"
                                        placeholder="e.g. Advanced Machine Learning"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Code</label>
                                        <input
                                            className="w-full px-4 py-2.5 rounded-xl outline-none border border-border bg-bg-surface/50 text-text-primary placeholder-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all"
                                            placeholder="e.g. CS-410"
                                            value={newCode}
                                            onChange={e => setNewCode(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Semester</label>
                                        <input
                                            className="w-full px-4 py-2.5 rounded-xl outline-none border border-border bg-bg-surface/50 text-text-primary placeholder-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all"
                                            placeholder="e.g. Fall 2024"
                                            value={newSemester}
                                            onChange={e => setNewSemester(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Status/Description</label>
                                    <textarea
                                        className="w-full px-4 py-2.5 rounded-xl outline-none border border-border bg-bg-surface/50 min-h-[100px] resize-none text-text-primary placeholder-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all"
                                        placeholder="e.g. Active - Core Course"
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <Button variant="ghost" onClick={() => { setShowAddRepository(false); resetForm(); }}>Cancel</Button>
                                <Button variant="primary" onClick={addRepository}>Create Subject</Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
