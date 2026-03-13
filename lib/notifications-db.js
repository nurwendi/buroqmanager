import db from './db';

/**
 * Create a blast notification for an organization or system-wide.
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} params.type - 'info', 'billing', 'alert', 'system'
 * @param {string} [params.senderId]
 * @param {string} [params.ownerId] - Admin ID for isolation. Null for Superadmin blast.
 * @param {string} [params.target] - 'all', 'customers', 'staff'
 */
export async function createBlastNotification({ title, message, type = 'info', senderId, ownerId, target = 'all' }) {
    // 1. Create the base notification
    const notification = await db.notification.create({
        data: {
            title,
            message,
            type,
            senderId,
            ownerId
        }
    });

    // 2. Find recipients based on target and ownerId
    const recipientData = [];

    // All Staff/Admins relevant to this owner (or everyone if ownerId is null)
    if (target === 'all' || target === 'staff') {
        const staffWhere = ownerId ? { OR: [{ id: ownerId }, { ownerId: ownerId }] } : {};
        const staff = await db.user.findMany({
            where: staffWhere,
            select: { id: true }
        });
        staff.forEach(s => {
            recipientData.push({
                notificationId: notification.id,
                userId: s.id
            });
        });
    }

    // All Customers relevant to this owner (or everyone if ownerId is null)
    if (target === 'all' || target === 'customers') {
        const customerWhere = ownerId ? { ownerId: ownerId } : {};
        const customers = await db.customer.findMany({
            where: customerWhere,
            select: { id: true }
        });
        customers.forEach(c => {
            recipientData.push({
                notificationId: notification.id,
                customerId: c.id
            });
        });
    }

    // 3. Batch create recipients (Max 1000 per insert for safety/performance)
    if (recipientData.length > 0) {
        // Prisma createMany is efficient for this
        await db.notificationRecipient.createMany({
            data: recipientData,
            skipDuplicates: true
        });
    }

    return notification;
}

/**
 * Send a targeted notification to specific recipients.
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} params.type
 * @param {string} [params.senderId]
 * @param {string} [params.ownerId]
 * @param {Array} params.recipients - Array of { userId, customerId }
 */
export async function sendNotification({ title, message, type = 'info', senderId, ownerId, recipients }) {
    const notification = await db.notification.create({
        data: {
            title,
            message,
            type,
            senderId,
            ownerId
        }
    });

    const recipientData = recipients.map(r => ({
        notificationId: notification.id,
        userId: r.userId || null,
        customerId: r.customerId || null
    }));

    if (recipientData.length > 0) {
        await db.notificationRecipient.createMany({
            data: recipientData
        });
    }

    return notification;
}

/**
 * Get unread notification count for a user or customer.
 * @param {string} [userId]
 * @param {string} [customerId]
 */
export async function getUnreadCount(userId, customerId) {
    const where = { isRead: false };
    if (userId) where.userId = userId;
    else if (customerId) where.customerId = customerId;
    else return 0;

    return await db.notificationRecipient.count({ where });
}

/**
 * Get notifications for a user or customer.
 * @param {Object} params
 * @param {string} [params.userId]
 * @param {string} [params.customerId]
 * @param {number} [params.limit]
 */
export async function getNotifications({ userId, customerId, limit = 50 }) {
    const where = {};
    if (userId) where.userId = userId;
    else if (customerId) where.customerId = customerId;
    else return [];

    return await db.notificationRecipient.findMany({
        where,
        include: {
            notification: {
                include: {
                    sender: {
                        select: { fullName: true, avatar: true, role: true }
                    }
                }
            }
        },
        orderBy: {
            notification: {
                createdAt: 'desc'
            }
        },
        take: limit
    });
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(recipientId) {
    return await db.notificationRecipient.update({
        where: { id: recipientId },
        data: {
            isRead: true,
            readAt: new Date()
        }
    });
}

/**
 * Mark all notifications as read for a user/customer.
 */
export async function markAllAsRead(userId, customerId) {
    const where = { isRead: false };
    if (userId) where.userId = userId;
    else if (customerId) where.customerId = customerId;
    else return;

    return await db.notificationRecipient.updateMany({
        where,
        data: {
            isRead: true,
            readAt: new Date()
        }
    });
}
