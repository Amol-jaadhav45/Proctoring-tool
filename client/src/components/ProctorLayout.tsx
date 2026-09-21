import React from 'react';
import { ProctorSidebar } from './ProctorSidebar';

interface ProctorLayoutProps {
    children: React.ReactNode;
}

export const ProctorLayout: React.FC<ProctorLayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <ProctorSidebar
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                onClose={() => setIsSidebarOpen(false)}
            />
            <main className={`flex-1 w-full transition-all duration-300 ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-20'}`}>
                {children}
            </main>
        </div>
    );
};
