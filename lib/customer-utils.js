import db from './db';

/**
 * Automatically generates a Customer ID based on the owner's Agent Number.
 * Format: [AgentNumber][5-digit Sequence]
 * 
 * @param {string} ownerId - The ID of the primary admin/owner user who owns the customer.
 * @returns {Promise<string>} The generated Customer ID.
 */
export async function generateCustomerId(ownerId, prismaClient = db) {
    let prefix = '99'; // Default fallback

    if (ownerId) {
        const ownerUser = await prismaClient.user.findUnique({ where: { id: ownerId } });
        if (ownerUser && ownerUser.agentNumber) {
            // Ensure prefix is at least 2 digits if it exists
            prefix = ownerUser.agentNumber;
        }
    }

    // Find the highest sequence number for this prefix
    const existingWithPrefix = await prismaClient.customer.findMany({
        where: {
            customerId: {
                startsWith: prefix
            }
        },
        select: { customerId: true }
    });

    let maxSeq = 0;
    for (const c of existingWithPrefix) {
        if (c.customerId && c.customerId.length > prefix.length) {
            const seqStr = c.customerId.substring(prefix.length);
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq;
            }
        }
    }

    // Pad sequence to 5 digits
    const nextSeq = maxSeq + 1;
    const paddedSeq = String(nextSeq).padStart(5, '0');

    return `${prefix}${paddedSeq}`;
}
