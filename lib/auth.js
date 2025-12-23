import bcrypt from 'bcryptjs';
import db from './db';

export async function getUsers(where = {}) {
    try {
        return await db.user.findMany({
            where: {
                username: {
                    not: 'system'
                },
                ...where
            },
            include: {
                owner: {
                    select: { username: true } // Include owner name for display
                }
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

export async function saveUsers(users) {
    // Deprecated: No direct saveUsers in DB mode, individual updates used instead.
    // Kept for interface compatibility if needed, but should be avoided.
    return true;
}

export async function getUserByUsername(username) {
    return await db.user.findUnique({
        where: { username }
    });
}

export async function getUserById(id) {
    return await db.user.findUnique({
        where: { id }
    });
}

export async function createUser(userData) {
    const existing = await getUserByUsername(userData.username);
    if (existing) {
        throw new Error('Username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    const newUser = await db.user.create({
        data: {
            username: userData.username,
            passwordHash,
            role: userData.role || 'viewer',
            ownerId: userData.ownerId || null, // Multi-tenancy support
            isTechnician: userData.isTechnician || false,
            isAgent: userData.isAgent !== undefined ? userData.isAgent : userData.role === 'agent',
            agentRate: Number(userData.agentRate) || 0,
            technicianRate: Number(userData.technicianRate) || 0,
            prefix: userData.prefix || '',
            fullName: userData.fullName || '',
            phone: userData.phone || '',
            address: userData.address || '',
            agentNumber: userData.agentNumber || ''
        }
    });

    const { passwordHash: _, ...userWithoutPass } = newUser;
    return userWithoutPass;
}

export async function updateUser(id, updates) {
    const updateData = { ...updates };

    // Handle password update
    if (updates.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(updates.password, salt);
    }

    // Always remove raw password field as it doesn't exist in DB schema
    delete updateData.password;

    // Ensure numeric types
    if (updates.agentRate !== undefined) updateData.agentRate = Number(updates.agentRate);
    if (updates.technicianRate !== undefined) updateData.technicianRate = Number(updates.technicianRate);

    // Determine isAgent if role changes
    // Determine isAgent if role changes - DEPRECATED: We now allow manual override via checkbox
    // if (updates.role) {
    //    updateData.isAgent = updates.role === 'agent';
    // }

    try {
        const updatedUser = await db.user.update({
            where: { id },
            data: updateData
        });
        const { passwordHash: _, ...userWithoutPass } = updatedUser;
        return userWithoutPass;
    } catch (error) {
        if (error.code === 'P2025') {
            throw new Error('User not found');
        }
        throw error;
    }
}

export async function deleteUser(id) {
    try {
        await db.user.delete({
            where: { id }
        });
        return true;
    } catch (error) {
        throw new Error('User not found or could not be deleted');
    }
}

export async function verifyPassword(username, password) {
    const user = await getUserByUsername(username);
    if (!user) return false;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (isValid) {
        const { passwordHash: _, ...userWithoutPass } = user;
        return userWithoutPass;
    }
    return false;
}

// Initialize default superadmin if no users exist
(async () => {
    try {
        const count = await db.user.count();
        if (count === 0) {
            console.log('Initializing default superadmin user...');
            await createUser({
                username: 'superadmin',
                password: 'superadminpassword', // Should be changed immediately
                role: 'superadmin'
            });
            console.log('Default superadmin created: superadmin / superadminpassword');
        } else {
            // Check if any superadmin exists, if not maybe promote existing admin?
            // For now, let's assume if users exist, we don't mess with them automatically
            // unless we want to ensure at least one superadmin.
            const saCount = await db.user.count({ where: { role: 'superadmin' } });
            if (saCount === 0) {
                // Potentially dangerous to auto-create if ID logic is strict
                /*
                console.log('No superadmin found. Creating backup superadmin...');
                await createUser({
                    username: 'superadmin',
                    password: 'superadminpassword',
                    role: 'superadmin'
                });
                */
            }
        }
    } catch (e) {
        // DB might not be ready yet
        // console.error('Init user error:', e);
    }
})();
