import { ID } from 'appwrite';
import { databases, DATABASE_ID, PROPERTIES_COLLECTION_ID, LIKES_COLLECTION_ID, Query } from './appwrite.js';

async function atomicIncrementLikeCount(propertyId, delta, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 50 * 2 ** attempt));
            const doc = await databases.getDocument(DATABASE_ID, PROPERTIES_COLLECTION_ID, propertyId);
            const current = typeof doc.likeCount === 'number' ? doc.likeCount : 0;
            const next = Math.max(0, current + delta);
            await databases.updateDocument(DATABASE_ID, PROPERTIES_COLLECTION_ID, propertyId, { likeCount: next });
            return next;
        } catch (error) {
            if (attempt === maxRetries - 1) throw error;
        }
    }
}

export async function getLikeIds(userId) {
    if (!userId) return [];
    const result = await databases.listDocuments(DATABASE_ID, LIKES_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.limit(1000),
    ]);
    return result.documents.map(d => d.propertyId).filter(Boolean);
}

// Mirrors modus_genius/lib/appwrite/likes.ts countLikesForAgent — sum of
// likeCount across every property belonging to this agent.
export async function countLikesForAgent(agentId) {
    if (!agentId) return 0;
    try {
        const propertiesRes = await databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [
            Query.equal('agent', agentId),
            Query.select(['likeCount']),
            Query.limit(1000),
        ]);
        return propertiesRes.documents.reduce((acc, p) => acc + (typeof p.likeCount === 'number' ? p.likeCount : 0), 0);
    } catch (error) {
        console.error('countLikesForAgent error:', error);
        return 0;
    }
}

// Mirrors modus_genius/lib/appwrite/likes.ts getLikesStatsForAgent — sum of
// likeCount across this agent's properties, grouped by property type/category.
export async function getLikesStatsForAgent(agentId) {
    if (!agentId) return {};
    try {
        const propertiesRes = await databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [
            Query.equal('agent', agentId),
            Query.select(['type', 'likeCount']),
            Query.limit(1000),
        ]);
        if (!propertiesRes.documents.length) return {};
        const stats = {};
        for (const property of propertiesRes.documents) {
            const type = property.type ?? 'Unknown';
            const count = typeof property.likeCount === 'number' ? property.likeCount : 0;
            stats[type] = (stats[type] || 0) + count;
        }
        return stats;
    } catch (error) {
        console.error('getLikesStatsForAgent error:', error);
        return {};
    }
}

export async function toggleLike(userId, propertyId, propertyType, agentId) {
    const existing = await databases.listDocuments(DATABASE_ID, LIKES_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.equal('propertyId', propertyId),
        Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
        await databases.deleteDocument(DATABASE_ID, LIKES_COLLECTION_ID, existing.documents[0].$id);
        const likeCount = await atomicIncrementLikeCount(propertyId, -1);
        return { status: 'removed', likeCount };
    }

    await databases.createDocument(DATABASE_ID, LIKES_COLLECTION_ID, ID.unique(), {
        userId, propertyId, propertyType, agentId,
    });
    const likeCount = await atomicIncrementLikeCount(propertyId, 1);
    return { status: 'added', likeCount };
}
