import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { isAdmin } from '../../lib/admin/adminAuth';
import { Shield } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: Props) => {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const adminAccess = await isAdmin(user.id);
      setHasAccess(adminAccess);
      setLoading(false);
    };

    checkAccess();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-500" />
          <p className="mt-4 text-lg">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};