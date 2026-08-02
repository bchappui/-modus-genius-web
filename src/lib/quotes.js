import { ID } from 'appwrite';
import { databases, DATABASE_ID, Query } from './appwrite.js';

// These collections mirror modus_genius's lib/appwrite/quotes.ts, which
// hardcodes the same literal ids (not env-configured there either) — both
// apps share the same Appwrite project/database.
const QUOTES_COLLECTION_ID = 'quotes';
const QUOTE_LIKES_COLLECTION_ID = 'quote_likes';
const QUOTE_COMMENTS_COLLECTION_ID = 'quote_comments';

async function atomicIncrementQuoteField(quoteId, field, delta, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 50 * 2 ** attempt));
            const doc = await databases.getDocument(DATABASE_ID, QUOTES_COLLECTION_ID, quoteId);
            const current = typeof doc[field] === 'number' ? doc[field] : 0;
            const next = Math.max(0, current + delta);
            await databases.updateDocument(DATABASE_ID, QUOTES_COLLECTION_ID, quoteId, { [field]: next });
            return next;
        } catch (error) {
            if (attempt === maxRetries - 1) throw error;
        }
    }
}

export async function getQuotes({ category } = {}) {
    const queries = [Query.orderDesc('$createdAt'), Query.limit(1000)];
    if (category && category !== 'All') queries.push(Query.equal('category', category));
    const result = await databases.listDocuments(DATABASE_ID, QUOTES_COLLECTION_ID, queries);
    return result.documents;
}

export async function getQuoteById(id) {
    return databases.getDocument(DATABASE_ID, QUOTES_COLLECTION_ID, id);
}

export async function getQuoteLikeIds(userId) {
    if (!userId) return [];
    const result = await databases.listDocuments(DATABASE_ID, QUOTE_LIKES_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.limit(1000),
    ]);
    return result.documents.map(d => d.quoteId).filter(Boolean);
}

export async function toggleQuoteLike(userId, quoteId) {
    const existing = await databases.listDocuments(DATABASE_ID, QUOTE_LIKES_COLLECTION_ID, [
        Query.equal('userId', userId),
        Query.equal('quoteId', quoteId),
        Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
        await databases.deleteDocument(DATABASE_ID, QUOTE_LIKES_COLLECTION_ID, existing.documents[0].$id);
        const likeCount = await atomicIncrementQuoteField(quoteId, 'likeCount', -1);
        return { status: 'removed', likeCount };
    }

    await databases.createDocument(DATABASE_ID, QUOTE_LIKES_COLLECTION_ID, ID.unique(), { userId, quoteId });
    const likeCount = await atomicIncrementQuoteField(quoteId, 'likeCount', 1);
    return { status: 'added', likeCount };
}

export async function getQuoteComments({ quoteId, limit = 20, offset = 0 }) {
    if (!quoteId) return { items: [], hasMore: false };
    const result = await databases.listDocuments(DATABASE_ID, QUOTE_COMMENTS_COLLECTION_ID, [
        Query.equal('quoteId', quoteId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit + 1),
        Query.offset(offset),
    ]);
    const hasMore = result.documents.length > limit;
    const items = hasMore ? result.documents.slice(0, limit) : result.documents;
    return { items, hasMore };
}

export async function addQuoteComment(quoteId, userId, comment, userName, userAvatar) {
    const doc = await databases.createDocument(DATABASE_ID, QUOTE_COMMENTS_COLLECTION_ID, ID.unique(), {
        quoteId, userId, comment, userName, userAvatar,
    });
    const commentCount = await atomicIncrementQuoteField(quoteId, 'commentCount', 1);
    return { comment: doc, commentCount };
}

export async function deleteQuoteComment(commentId, quoteId) {
    await databases.deleteDocument(DATABASE_ID, QUOTE_COMMENTS_COLLECTION_ID, commentId);
    const commentCount = await atomicIncrementQuoteField(quoteId, 'commentCount', -1);
    return { commentCount };
}

export async function hasUserCommentedQuote(quoteId, userId) {
    if (!quoteId || !userId) return false;
    const result = await databases.listDocuments(DATABASE_ID, QUOTE_COMMENTS_COLLECTION_ID, [
        Query.equal('quoteId', quoteId),
        Query.equal('userId', userId),
        Query.limit(1),
    ]);
    return result.documents.length > 0;
}
