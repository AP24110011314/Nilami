import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { apiClient, type NotificationItem } from '../../api/client.js';
import { getSocket } from '../../lib/socket.js';

import { useAuthStore } from '../../store/auth.js';

export const NotificationBell: React.FC = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await apiClient.getNotifications(1, 10);
      setNotifications(Array.isArray(res.notifications) ? res.notifications : []);
      setUnreadCount(typeof res.unreadCount === 'number' ? res.unreadCount : 0);
    } catch {
      // Soft fail if unauthenticated or network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void fetchNotifications();

    const socket = getSocket();
    const handleNotification = (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification', handleNotification);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      socket.off('notification', handleNotification);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            void fetchNotifications();
          }
        }}
        className="relative p-2 rounded-xl text-nilami-text/70 dark:text-nilami-dark-text/70 hover:text-nilami-green-dark dark:hover:text-nilami-sand hover:bg-nilami-sand/50 dark:hover:bg-nilami-dark-surface-elevated transition cursor-pointer"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-nilami-danger-dark rounded-full animate-pulse shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-nilami-sand-surface dark:bg-nilami-dark-surface rounded-2xl shadow-xl border border-nilami-border dark:border-nilami-dark-border py-2 z-50 overflow-hidden animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-nilami-border/60 dark:border-nilami-dark-border/60">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-nilami-green-dark dark:text-nilami-sand">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-nilami-danger-subtle text-nilami-danger-dark dark:text-nilami-danger-light rounded-full border border-nilami-danger/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-nilami-green-dark dark:text-nilami-sand hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-nilami-border/40 dark:divide-nilami-dark-border/40">
            {loading && (!notifications || notifications.length === 0) ? (
              <div className="py-8 text-center text-xs text-nilami-text/50 dark:text-nilami-dark-text/50">
                Loading notifications...
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-nilami-text/50 dark:text-nilami-dark-text/50">
                No notifications yet
              </div>
            ) : (
              (notifications || []).map((notif) => {
                const isRead = Boolean(notif.readAt);
                return (
                  <div
                    key={notif.id}
                    onClick={() => !isRead && handleMarkAsRead(notif.id)}
                    className={`p-3.5 hover:bg-nilami-sand/40 dark:hover:bg-nilami-dark-surface-elevated transition cursor-pointer ${
                      !isRead ? 'bg-nilami-green-subtle/40 dark:bg-nilami-green-dark/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-nilami-text dark:text-nilami-dark-text">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-nilami-text/50 dark:text-nilami-dark-text/50 shrink-0 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-nilami-text/70 dark:text-nilami-dark-text/70 mt-1 line-clamp-2">
                      {notif.body}
                    </p>
                    {notif.data?.auctionId && (
                      <Link
                        to={`/auctions/${notif.data.auctionId}`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-nilami-green-dark dark:text-nilami-sand hover:underline mt-2"
                      >
                        <span>View Lot</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
