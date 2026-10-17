import db from './db';

/**
 * Automatically generates a Customer ID based on the owner's Agent Number.
 * Format: [AgentNumber][5-digit Sequence]
 * 
 * @param {string} ownerId - The ID of the primary admin/owner user who owns the customer.
 * @returns {Promise<string>} The generated Customer ID.
 */
/**
 * Generates multiple sequential Customer IDs in a single database round-trip.
 * @param {string} ownerId - The ID of the primary admin/owner user.
 * @param {number} count - How many IDs to generate.
 * @param {object} prismaClient - Prisma client instance.
 * @returns {Promise<string[]>} Array of generated Customer IDs.
 */
export async function generateCustomerIdsBatch(ownerId, count = 1, prismaClient = db) {
    if (count <= 0) return [];
    let prefix = '99'; // Default fallback

    if (ownerId) {
        const ownerUser = await prismaClient.user.findUnique({
            where: { id: ownerId },
            select: { agentNumber: true }
        });
        if (ownerUser && ownerUser.agentNumber) {
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

    const ids = [];
    for (let i = 1; i <= count; i++) {
        const nextSeq = maxSeq + i;
        const paddedSeq = String(nextSeq).padStart(5, '0');
        ids.push(`${prefix}${paddedSeq}`);
    }

    return ids;
}

export async function generateCustomerId(ownerId, prismaClient = db) {
    const [id] = await generateCustomerIdsBatch(ownerId, 1, prismaClient);
    return id;
}
