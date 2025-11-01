import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const RoleBasedRoute = ({ children, requiredPermission }) => {
    const { user, loading, hasPermission, openAuthModal } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (!loading && !user) {
            openAuthModal('signin');
        }
    }, [loading, user, openAuthModal]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/not-authorized" state={{ from: location }} replace />;
    }

    return children;
};

export default RoleBasedRoute;