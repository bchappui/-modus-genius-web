import { ID } from 'appwrite';
import { databases, DATABASE_ID, FAVORITES_COLLECTION_ID, Query } from './appwrite.js';

const MAX_FAVORITES = 100;

export async function getFavoriteIds(userId) {
    if (!userId) return [];
    const result = await databases.listDocuments(DATABASE_ID, FAVORITES_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.limit(1000),
    ]);
    return result.documents.map(d => d.propertyId).filter(Boolean);
}

export async function toggleFavorite(userId, propertyId) {
    const existing = await databases.listDocuments(DATABASE_ID, FAVORITES_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.equal('propertyId', propertyId),
        Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
        await databases.deleteDocument(DATABASE_ID, FAVORITES_COLLECTION_ID, existing.documents[0].$id);
        return { status: 'removed' };
    }

    const current = await databases.listDocuments(DATABASE_ID, FAVORITES_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.limit(1000),
    ]);
    if (current.documents.length >= MAX_FAVORITES) {
        throw new Error(`You can save up to ${MAX_FAVORITES} favorites only.`);
    }

    await databases.createDocument(DATABASE_ID, FAVORITES_COLLECTION_ID, ID.unique(), { userId, propertyId });
    return { status: 'added' };
}
