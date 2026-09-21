import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <AdminSidebar />
            <main className="flex-1 w-full transition-all duration-300">
                {children}
            </main>
        </div>
    );
};
