import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Bell, 
  Search, 
  Filter, 
  CheckCheck, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  Info,
  Instagram,
  Users,
  ShoppingCart,
  CreditCard,
  Settings,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { localNotificationService, AdminNotification } from '@/services/localNotificationService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const NotificationDashboard = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, [filter, priorityFilter, readFilter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      
      if (filter !== 'all') {
        filters.category = filter;
      }
      
      if (readFilter !== 'all') {
        filters.is_read = readFilter === 'read';
      }

      const data = await localNotificationService.getNotifications(filters);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: AdminNotification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await localNotificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    }

    // Navigate to the target page
    if (notification.redirect_url) {
      navigate(notification.redirect_url);
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.length === 0) {
      toast.error('Please select notifications first');
      return;
    }

    try {
      await Promise.all(
        selectedNotifications.map(id => localNotificationService.markAsRead(id))
      );
      
      setNotifications(prev => 
        prev.map(n => selectedNotifications.includes(n.id) ? { ...n, is_read: true } : n)
      );
      setSelectedNotifications([]);
      toast.success(`${selectedNotifications.length} notifications marked as read`);
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) {
      toast.error('Please select notifications first');
      return;
    }

    try {
      await Promise.all(
        selectedNotifications.map(id => localNotificationService.dismissNotification(id))
      );
      
      setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));
      setSelectedNotifications([]);
      toast.success(`${selectedNotifications.length} notifications deleted`);
    } catch (error) {
      toast.error('Failed to delete notifications');
    }
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'instagram_marketing':
        return <Instagram className="h-4 w-4 text-pink-500" />;
      case 'affiliate_marketing':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'orders':
        return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      case 'payments':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case 'system_alerts':
        return <Settings className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = searchTerm === '' || 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    high_priority: notifications.filter(n => n.priority === 'high').length,
    instagram: notifications.filter(n => n.category === 'instagram_marketing').length,
    affiliate: notifications.filter(n => n.category === 'affiliate_marketing').length
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 p-3 sm:p-4 md:p-5 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Notification Center
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage all admin notifications
          </p>
        </div>
        <Button 
          onClick={loadNotifications} 
          disabled={loading}
          className="w-full sm:w-auto h-11 sm:h-10 md:h-11 touch-manipulation"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <EyeOff className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Unread</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 truncate">
                  {stats.unread}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">High Priority</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400 truncate">
                  {stats.high_priority}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Instagram className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Instagram</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-pink-600 dark:text-pink-400 truncate">
                  {stats.instagram}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Affiliate</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 truncate">
                  {stats.affiliate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 sm:h-10 md:h-11 touch-manipulation"
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="instagram_marketing">Instagram Marketing</SelectItem>
                <SelectItem value="affiliate_marketing">Affiliate Marketing</SelectItem>
                <SelectItem value="orders">Orders</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="system_alerts">System Alerts</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="read">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {selectedNotifications.length} notification(s) selected
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBulkMarkAsRead}
                  className="flex-1 sm:flex-none h-10 sm:h-9 touch-manipulation"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Mark as Read</span>
                  <span className="sm:hidden">Read</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBulkDelete}
                  className="flex-1 sm:flex-none h-10 sm:h-9 touch-manipulation"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg md:text-xl">
              Notifications ({filteredNotifications.length})
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSelectAll}
              className="w-full sm:w-auto h-10 sm:h-9 touch-manipulation"
            >
              {selectedNotifications.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
              <Bell className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No notifications found</h3>
              <p className="text-sm sm:text-base">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    !notification.is_read ? 'bg-blue-50 dark:bg-blue-950 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNotifications(prev => [...prev, notification.id]);
                        } else {
                          setSelectedNotifications(prev => prev.filter(id => id !== notification.id));
                        }
                      }}
                      className="mt-1 h-4 w-4 sm:h-5 sm:w-5 touch-manipulation"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        {getCategoryIcon(notification.category)}
                        {getPriorityIcon(notification.priority)}
                        <h4 
                          className={`font-medium cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 text-sm sm:text-base truncate flex-1 min-w-0 ${
                            !notification.is_read ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs flex-shrink-0">
                            New
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 sm:line-clamp-none">
                        {notification.message}
                      </p>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={`${getCategoryColor(notification.category)} text-xs`}
                          >
                            {notification.category.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {notification.priority} priority
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {notification.is_read && (
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span className="hidden sm:inline">Read</span>
                            </div>
                          )}
                          <span className="truncate">{formatDateTime(notification.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};