import { ID } from 'appwrite';
import { databases, DATABASE_ID, PROPERTIES_COLLECTION_ID, REVIEWS_COLLECTION_ID, Query } from './appwrite.js';

async function atomicIncrementReviewCount(propertyId, delta, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 50 * 2 ** attempt));
            const doc = await databases.getDocument(DATABASE_ID, PROPERTIES_COLLECTION_ID, propertyId);
            const current = typeof doc.reviewCount === 'number' ? doc.reviewCount : 0;
            const next = Math.max(0, current + delta);
            await databases.updateDocument(DATABASE_ID, PROPERTIES_COLLECTION_ID, propertyId, { reviewCount: next });
            return next;
        } catch (error) {
            if (attempt === maxRetries - 1) throw error;
        }
    }
}

export async function getPropertyComments({ propertyId, limit = 20, offset = 0 }) {
    if (!propertyId) return { items: [], hasMore: false };
    const result = await databases.listDocuments(DATABASE_ID, REVIEWS_COLLECTION_ID, [
        Query.equal('property', propertyId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit + 1),
        Query.offset(offset),
    ]);
    const hasMore = result.documents.length > limit;
    const items = hasMore ? result.documents.slice(0, limit) : result.documents;
    return { items, hasMore };
}

export async function addComment(propertyId, review, name, avatar) {
    const comment = await databases.createDocument(DATABASE_ID, REVIEWS_COLLECTION_ID, ID.unique(), {
        property: propertyId, review, name, avatar,
    });
    const reviewCount = await atomicIncrementReviewCount(propertyId, 1);
    return { comment, reviewCount };
}

export async function deleteComment(commentId, propertyId) {
    await databases.deleteDocument(DATABASE_ID, REVIEWS_COLLECTION_ID, commentId);
    const reviewCount = await atomicIncrementReviewCount(propertyId, -1);
    return { reviewCount };
}

export async function hasUserCommented(propertyId, name) {
    if (!propertyId || !name) return false;
    const result = await databases.listDocuments(DATABASE_ID, REVIEWS_COLLECTION_ID, [
        Query.equal('property', propertyId),
        Query.equal('name', name),
        Query.limit(1),
    ]);
    return result.documents.length > 0;
}
