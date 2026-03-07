import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const NotificationPopup = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const popupRef = useRef(null);
  const audioContextRef = useRef(null);
  const fallbackAudioRef = useRef(null);

  // Base64-encoded notification sound (short beep)
  const notificationSoundDataUri = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zPLTgjMGHnC/8OKZSgwPVqzn7LBhGgU7ltzy0IEsBSZ8yPLaizsIGGS56+mmWBELTKXh8bllHAU2kdb0yXkqBSh+yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfyzH0rBSh+zPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8bZjHAY4kdfy0IEsBSZ8yPLaizsIGWi48+mjUxEMTqPh8Q==";

  const playNotificationSound = async () => {
    // Don't play sound until user has interacted
    if (!userHasInteracted) {
      console.log('Waiting for user interaction before playing sound');
      return;
    }

    try {
      // Try Web Audio API first
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Resume context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Web Audio API failed, trying fallback:', error);
      // Fallback to HTML5 Audio
      try {
        if (!fallbackAudioRef.current) {
          fallbackAudioRef.current = new Audio(notificationSoundDataUri);
          fallbackAudioRef.current.volume = 0.3;
        }
        await fallbackAudioRef.current.play();
      } catch (fallbackError) {
        console.error('Both audio methods failed:', fallbackError);
      }
    }
  };

  const fetchNotifications = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    }
    try {
      const response = await api.get('/notification/');
      setNotifications(response.data.notifications);
      const newUnreadCount = response.data.unread_count;
      
      // Play sound only if there are NEW notifications (not on initial load)
      if (!isInitialLoad && newUnreadCount > previousUnreadCount && previousUnreadCount >= 0) {
        playNotificationSound();
      }
      
      setUnreadCount(newUnreadCount);
      setPreviousUnreadCount(newUnreadCount);
    } catch (error) {
      // Silently fail during server shutdown or network errors
      if (error.code !== 'ERR_NETWORK' && error.response?.status !== 500) {
        console.error('Error fetching notifications:', error);
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let isComponentMounted = true;
    let intervalId;

    // Fetch initial notifications
    fetchNotifications(true);
    
    // Set up polling interval - reduced frequency to avoid server overload
    intervalId = setInterval(() => {
      // Only fetch if component is still mounted and page is visible
      if (isComponentMounted && document.visibilityState === 'visible') {
        fetchNotifications(false);
      }
    }, 30000); // Poll every 30 seconds instead of 5 seconds

    // Cleanup function
    return () => {
      isComponentMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // Remove previousUnreadCount to prevent multiple intervals

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track user interaction for autoplay policy compliance
  useEffect(() => {
    const markUserInteraction = () => {
      if (!userHasInteracted) {
        setUserHasInteracted(true);
        console.log('User interaction detected - sound enabled');
      }
    };

    // Listen for any user interaction
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, markUserInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, markUserInteraction);
      });
    };
  }, [userHasInteracted]);

  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/notification/${notificationId}/read/`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notification/mark-all-read/');
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notification/${notificationId}/delete/`);
      toast.success('Notification deleted');
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'blog_deleted':
        return <Trash2 className={`${iconClass} text-red-600`} />;
      case 'report_approved':
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case 'report_rejected':
        return <XCircle className={`${iconClass} text-red-600`} />;
      default:
        return <AlertCircle className={`${iconClass} text-blue-600`} />;
    }
  };

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPopup;
