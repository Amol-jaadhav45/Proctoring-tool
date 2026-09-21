import React from 'react';
import { Sidebar } from './Sidebar';

interface StudentLayoutProps {
    children: React.ReactNode;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Sidebar />
            <main className="flex-1 w-full transition-all duration-300">
                {children}
            </main>
        </div>
    );
};
