import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { CourseDetail } from './CourseDetail';
import { containerVariants, itemVariants } from '../lib/animations';

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
        <motion.div 
            className="flex-1 h-screen overflow-y-auto" 
            style={{ backgroundColor: 'var(--bg-primary)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <div className="max-w-7xl mx-auto px-8 py-8">
                {/* Header */}
                <motion.div 
                    className="mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Courses</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your subjects, lectures, and knowledge base.</p>
                </motion.div>

                {/* Grid */}
                <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Add Card */}
                    <motion.div
                        onClick={() => setShowAddCourse(true)}
                        className="p-6 rounded-2xl border border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors min-h-[200px]"
                        style={{ borderColor: 'var(--border)' }}
                        variants={itemVariants}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <motion.div 
                            className="w-12 h-12 rounded-full flex items-center justify-center mb-3" 
                            style={{ backgroundColor: 'var(--bg-surface)' }}
                            whileHover={{ rotate: 90 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Plus size={24} style={{ color: 'var(--text-secondary)' }} />
                        </motion.div>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Add New Course</span>
                    </motion.div>

                    {/* Course Cards */}
                    {courses.map(course => (
                        <motion.div
                            key={course.id}
                            onClick={() => setSelectedCourse(course)}
                            className="p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between min-h-[200px]"
                            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02, y: -6 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div>
                                <motion.div 
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white shadow-lg" 
                                    style={{ backgroundColor: 'var(--accent)' }}
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                >
                                    <BookOpen size={24} />
                                </motion.div>
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
                        </motion.div>
                    ))}
                </motion.div>

                {/* Add Modal */}
                {showAddCourse && (
                    <motion.div 
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <motion.div 
                            className="p-6 rounded-2xl w-96 shadow-xl" 
                            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add New Course</h3>

                            <div className="space-y-3">
                                <input className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="Course Name (e.g. Calculus I)" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                                <input className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="Course Code (e.g. MATH101)" value={newCode} onChange={e => setNewCode(e.target.value)} />
                                <input className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="Semester (e.g. Fall 2025)" value={newSemester} onChange={e => setNewSemester(e.target.value)} />
                                <textarea className="w-full px-4 py-2 rounded-lg outline-none border bg-transparent resize-none h-20" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <motion.button 
                                    onClick={() => setShowAddCourse(false)} 
                                    className="px-4 py-2 rounded-lg text-sm" 
                                    style={{ color: 'var(--text-secondary)' }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button 
                                    onClick={addCourse} 
                                    className="px-4 py-2 rounded-lg text-sm text-white" 
                                    style={{ backgroundColor: 'var(--accent)' }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Create Course
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
