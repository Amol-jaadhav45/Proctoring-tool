export interface User {
    id: string;
    name: string;
    role: 'student' | 'instructor' | 'admin';
}

export interface Exam {
    id: string;
    title: string;
    duration: number; // in minutes
    status: 'upcoming' | 'active' | 'completed';
}
