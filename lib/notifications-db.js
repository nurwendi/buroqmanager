import db from './db';

/**
 * Helper to send actual push notification to Expo
 */
async function sendExpoPushNotifications(messages) {
    if (!messages || messages.length === 0) return;

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        if (!response.ok) {
            console.error('Failed to send Expo push:', await response.text());
        }
    } catch (error) {
        console.error('Error sending Expo push notification:', error);
    }
}

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

    // 4. Send Expo Push Notifications
    const pushMessages = [];
    if (target === 'all' || target === 'staff') {
        const staffWithTokens = await db.user.findMany({
            where: { id: { in: recipientData.filter(r => r.userId).map(r => r.userId) }, expoPushToken: { not: null } },
            select: { expoPushToken: true }
        });
        
        staffWithTokens.forEach(user => {
            if (user.expoPushToken) {
                pushMessages.push({
                    to: user.expoPushToken,
                    sound: 'default',
                    title: title,
                    body: message,
                    data: { type },
                    channelId: 'default',
                    priority: 'high',
                });
            }
        });
    }

    if (target === 'all' || target === 'customers') {
        const customersWithTokens = await db.customer.findMany({
            where: { id: { in: recipientData.filter(r => r.customerId).map(r => r.customerId) }, expoPushToken: { not: null } },
            select: { expoPushToken: true }
        });

        customersWithTokens.forEach(customer => {
            if (customer.expoPushToken) {
                pushMessages.push({
                    to: customer.expoPushToken,
                    sound: 'default',
                    title: title,
                    body: message,
                    data: { type },
                    channelId: 'default',
                    priority: 'high',
                });
            }
        });
    }

    await sendExpoPushNotifications(pushMessages);

    return notification;
}

/**
 * Send a notification to a specific customer using their PPPoE username.
 * Primarily used by the mobile app's targeted messaging.
 */
export async function sendTargetedNotificationByUsername({ username, title, message, type = 'info', senderId, ownerId }) {
    // 1. Find the customer
    const customer = await db.customer.findFirst({
        where: { 
            username,
            ...(ownerId ? { ownerId } : {})
        },
        select: { id: true }
    });

    if (!customer) {
        throw new Error(`Customer with username ${username} not found`);
    }

    // 2. Create and connect notification
    return await sendNotification({
        title,
        message,
        type,
        senderId,
        ownerId,
        recipients: [{ customerId: customer.id }]
    });
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

    // Prepare push messages
    const pushMessages = [];

    // Find custom/user push tokens
    const userIds = recipientData.filter(r => r.userId).map(r => r.userId);
    if (userIds.length > 0) {
        const users = await db.user.findMany({
            where: { id: { in: userIds }, expoPushToken: { not: null } },
            select: { expoPushToken: true }
        });
        users.forEach(user => {
            if (user.expoPushToken) {
                pushMessages.push({
                    to: user.expoPushToken,
                    sound: 'default',
                    title: title,
                    body: message,
                    data: { type },
                    channelId: 'default',
                    priority: 'high',
                });
            }
        });
    }

    const customerIds = recipientData.filter(r => r.customerId).map(r => r.customerId);
    if (customerIds.length > 0) {
        const customers = await db.customer.findMany({
            where: { id: { in: customerIds }, expoPushToken: { not: null } },
            select: { expoPushToken: true }
        });
        customers.forEach(customer => {
            if (customer.expoPushToken) {
                pushMessages.push({
                    to: customer.expoPushToken,
                    sound: 'default',
                    title: title,
                    body: message,
                    data: { type },
                    channelId: 'default',
                    priority: 'high',
                });
            }
        });
    }

    await sendExpoPushNotifications(pushMessages);

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
