import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { instituteApi, userApi } from '../services/api';
import { Loader2, MapPin, Users, GraduationCap } from 'lucide-react';

export const InstitutePage: React.FC = () => {
    const { id } = useParams();
    const [institute, setInstitute] = useState<any | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                if (!id) return;

                const inst = await instituteApi.getById(id);
                const allUsers = await userApi.getAll({ institute_id: id });

                setInstitute(inst);
                setUsers(allUsers || []);
            } catch (err) {
                console.error('Error loading institute:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const students = users.filter(u => u.role === 'student');
    const instructors = users.filter(u => u.role === 'instructor');

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!institute) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
                Institute not found.
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <GraduationCap className="w-8 h-8 text-blue-600" />
                            {institute.name}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-300 flex items-center gap-2 mt-1">
                            <MapPin className="w-4 h-4" />
                            {institute.address}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 px-4 py-3">
                            <p className="text-gray-500 dark:text-gray-300 mb-1">Students</p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-white">{students.length}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 px-4 py-3">
                            <p className="text-gray-500 dark:text-gray-300 mb-1">Instructors</p>
                            <p className="text-xl font-semibold text-gray-900 dark:text-white">{instructors.length}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            Students
                        </h2>
                        {students.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-300">No students registered yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {students.map(student => (
                                    <li key={student.user_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300">
                                            {student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-300">{student.email}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-purple-600" />
                            Instructors
                        </h2>
                        {instructors.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-300">No instructors registered yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {instructors.map(instructor => (
                                    <li key={instructor.user_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-sm font-semibold text-purple-700 dark:text-purple-300">
                                            {instructor.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{instructor.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-300 uppercase">{instructor.role}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
