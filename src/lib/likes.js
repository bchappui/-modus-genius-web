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
