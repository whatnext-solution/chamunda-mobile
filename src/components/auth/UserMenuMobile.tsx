import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface UserMenuMobileProps {
  onClose: () => void;
}

const UserMenuMobile: React.FC<UserMenuMobileProps> = ({ onClose }) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      onClose();
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-2">
      {/* User Info */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name} />
          <AvatarFallback>
            {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.user_metadata?.full_name || 'User'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user.email}
          </p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-1">
        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <User className="h-4 w-4" />
          <span>Profile</span>
        </Link>
        
        <Link
          to="/orders"
          onClick={onClose}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>My Orders</span>
        </Link>
        
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default UserMenuMobile;