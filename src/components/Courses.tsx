import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, BookOpen } from 'lucide-react';
import { CourseDetail } from './CourseDetail';

interface Course {
    id: number;
    name: string;
    code?: string;
    semester?: string;
    description?: string;
}

export function Courses() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [showAddCourse, setShowAddCourse] = useState(false);

    // Form state
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');
    const [newSemester, setNewSemester] = useState('');
    const [newDesc, setNewDesc] = useState('');

    useEffect(() => {
        loadCourses();
    }, []);

    async function loadCourses() {
        try {
            const res = await invoke<Course[]>('get_courses');
            setCourses(res);
        } catch (e) { console.error(e); }
    }

    async function addCourse() {
        if (!newName) return;
        try {
            await invoke('create_course', {
                name: newName,
                code: newCode,
                semester: newSemester,
                description: newDesc
            });
            setNewName('');
            setNewCode('');
            setNewSemester('');
            setNewDesc('');
            setShowAddCourse(false);
            loadCourses();
        } catch (e) { console.error(e); }
    }

    if (selectedCourse) {
        return <CourseDetail course={selectedCourse} onBack={() => setSelectedCourse(null)} />;
    }

    return (
        <div className="flex-1 h-screen overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="max-w-7xl mx-auto px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Courses</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your subjects, lectures, and knowledge base.</p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Add Card */}
                    <div
                        onClick={() => setShowAddCourse(true)}
                        className="p-6 rounded-2xl border border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors min-h-[200px]"
                        style={{ borderColor: 'var(--border)' }}
                    >
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--bg-surface)' }}>
                            <Plus size={24} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Add New Course</span>
                    </div>

                    {/* Course Cards */}
                    {courses.map(course => (
                        <div
                            key={course.id}
                            onClick={() => setSelectedCourse(course)}
                            className="p-6 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg flex flex-col justify-between min-h-[200px]"
                            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                        >
                            <div>
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg" style={{ backgroundColor: 'var(--accent)' }}>
                                    <BookOpen size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{course.name}</h3>
                                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{course.code}</p>
                                <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
                                    {course.description || 'No description provided.'}
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                                <span className="text-xs font-medium px-2 py-1 rounded-md bg-white/5" style={{ color: 'var(--text-secondary)' }}>
                                    {course.semester || 'General'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Modal */}
                {showAddCourse && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="p-6 rounded-2xl w-96 shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add New Course</h3>

                            <div className="space-y-3">
                                <input className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="Course Name (e.g. Calculus I)" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                                <input className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="Course Code (e.g. MATH101)" value={newCode} onChange={e => setNewCode(e.target.value)} />
                                <input className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="Semester (e.g. Fall 2025)" value={newSemester} onChange={e => setNewSemester(e.target.value)} />
                                <textarea className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent resize-none h-20" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setShowAddCourse(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                                <button onClick={addCourse} className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: 'var(--accent)' }}>Create Course</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
