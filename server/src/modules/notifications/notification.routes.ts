import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const notificationRouter = Router();

// Get paginated notifications for current user
notificationRouter.get('/', requireAuth, NotificationController.getNotifications);

// Mark single notification as read
notificationRouter.patch('/:id/read', requireAuth, NotificationController.markRead);

// Mark all notifications as read
notificationRouter.post('/mark-all-read', requireAuth, NotificationController.markAllRead);
