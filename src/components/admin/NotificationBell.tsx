import { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, Clock, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { localNotificationService, AdminNotification } from '@/services/localNotificationService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  onNavigate?: (url: string) => void;
}

export const NotificationBell = ({ onNavigate }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const navigate = useNavigate();

  // Calculate dropdown position when opening
  const handleToggleDropdown = (event: React.MouseEvent) => {
    if (!isOpen) {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const dropdownWidth = 384; // 96 * 4 = 384px (w-96)
      
      // Calculate left position to align dropdown's right edge with button's right edge
      const leftPosition = buttonRect.right - dropdownWidth;
      
      // Ensure dropdown doesn't go off-screen on the left
      const finalLeftPosition = Math.max(8, leftPosition);
      
      setDropdownPosition({
        top: buttonRect.bottom + 8, // 8px gap
        left: finalLeftPosition
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // Subscribe to real-time notifications
    const subscription = localNotificationService.subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast for high priority notifications
      if (newNotification.priority === 'high') {
        toast.info(newNotification.title, {
          description: newNotification.message,
          action: {
            label: 'View',
            onClick: () => handleNotificationClick(newNotification)
          }
        });
      }
    });

    // Clean expired notifications periodically
    const cleanupInterval = setInterval(() => {
      localNotificationService.cleanExpiredNotifications();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('.notification-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      localNotificationService.unsubscribeFromNotifications(subscription);
      clearInterval(cleanupInterval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const filters = filter === 'all' ? {} : { category: filter };
      const data = await localNotificationService.getNotifications({ ...filters, limit: 50 });
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await localNotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleNotificationClick = async (notification: AdminNotification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await localNotificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate to the target page
    if (notification.redirect_url) {
      if (onNavigate) {
        onNavigate(notification.redirect_url);
      } else {
        navigate(notification.redirect_url);
      }
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const categoryFilter = filter === 'all' ? undefined : filter;
      await localNotificationService.markAllAsRead(categoryFilter);
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleClearAll = async () => {
    try {
      const categoryFilter = filter === 'all' ? undefined : filter;
      await localNotificationService.clearAllNotifications(categoryFilter);
      
      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    }
  };

  const handleDismiss = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await localNotificationService.dismissNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if the dismissed notification was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast.error('Failed to dismiss notification');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Info className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'instagram_marketing':
        return 'bg-pink-100 text-pink-800';
      case 'affiliate_marketing':
        return 'bg-green-100 text-green-800';
      case 'orders':
        return 'bg-blue-100 text-blue-800';
      case 'payments':
        return 'bg-purple-100 text-purple-800';
      case 'system_alerts':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.category === filter);

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleDropdown}
        className={`relative hover:bg-blue-50 transition-colors ${
          unreadCount > 0 ? 'text-blue-600' : 'text-gray-600'
        }`}
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'fill-current' : ''}`} />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown - Fixed positioning */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown - RIGHT ALIGNMENT FIXED */}
          <div 
            className="notification-dropdown fixed z-50 w-96 max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)]" 
            style={{ 
              top: `${dropdownPosition.top}px`, 
              left: `${dropdownPosition.left}px`,
              right: 'auto',
              transform: 'none'
            }}
          >
            <Card className="w-full max-h-[80vh] shadow-2xl border-0 ring-1 ring-gray-200 bg-white rounded-lg overflow-hidden animate-fade-in">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg sticky top-0 z-10 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-600" />
                    <span className="hidden sm:inline">Notifications</span>
                    <span className="sm:hidden">Alerts</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="text-xs hover:bg-blue-100 text-blue-700 px-2"
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Mark All Read</span>
                        <span className="sm:hidden">Read</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="h-6 w-6 hover:bg-blue-100 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Filter and Actions */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Select value={filter} onValueChange={(value) => {
                    setFilter(value);
                    loadNotifications();
                  }}>
                    <SelectTrigger className="w-32 sm:w-40 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="instagram_marketing">Instagram</SelectItem>
                      <SelectItem value="affiliate_marketing">Affiliate</SelectItem>
                      <SelectItem value="orders">Orders</SelectItem>
                      <SelectItem value="payments">Payments</SelectItem>
                      <SelectItem value="system_alerts">System</SelectItem>
                    </SelectContent>
                  </Select>

                  {filteredNotifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="max-h-[65vh] overflow-y-auto overscroll-contain scroll-smooth notification-scroll">
                  {loading ? (
                    <div className="p-6 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm">Loading notifications...</p>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <Bell className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-700 mb-1">No notifications</p>
                      <p className="text-sm text-gray-500">You're all caught up! 🎉</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="divide-y divide-gray-100">
                        {filteredNotifications.map((notification, index) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-l-4 group relative ${
                              !notification.is_read 
                                ? 'bg-blue-50 border-l-blue-500 hover:bg-blue-100' 
                                : 'border-l-transparent hover:border-l-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {getPriorityIcon(notification.priority)}
                                  <h4 className={`text-sm font-medium line-clamp-1 ${
                                    !notification.is_read ? 'text-blue-900' : 'text-gray-900'
                                  }`}>
                                    {notification.title}
                                  </h4>
                                  {!notification.is_read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                                  {notification.message}
                                </p>
                                
                                <div className="flex items-center justify-between">
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs px-2 py-1 ${getCategoryColor(notification.category)}`}
                                  >
                                    {notification.category.replace('_', ' ')}
                                  </Badge>
                                  
                                  <span className="text-xs text-gray-500 flex-shrink-0">
                                    {formatTimeAgo(notification.created_at)}
                                  </span>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDismiss(notification.id, e)}
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all duration-200 flex-shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Footer with notification count - Sticky */}
                      {filteredNotifications.length > 3 && (
                        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 text-center shadow-lg">
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <p className="text-xs text-gray-600 font-medium">
                                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {filteredNotifications.length > 5 && (
                              <span className="text-xs text-gray-400">• Scroll for more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};