import { databases, DATABASE_ID, Query, ID } from './appwrite.js';
import { atomicIncrement } from './asks.js';
import { incrementStars, decrementStars } from './levels.js';

// Same Appwrite database as modus_genius (mobile); "replies" is its Ask/Q&A
// (Advisor) collection, which this web app's Community page now also reads
// and writes. Mirrors lib/appwrite/stars.ts.
const REPLIES_COLLECTION_ID = 'replies';
const STARS_COLLECTION_ID = 'stars';

// Mirrors toggleReplyStar (minus notifyReplyStarred / checkAndNotifyRoleChange,
// which need the app's notifications pipeline). Returns the reply's new
// starCount and whether the viewer now stars it.
export async function toggleReplyStar(userId, replyId) {
    if (!userId || !replyId) return null;

    const reply = await databases.getDocument(DATABASE_ID, REPLIES_COLLECTION_ID, replyId);
    const askId = typeof reply.ask === 'string' ? reply.ask : reply.ask?.$id || null;

    const existing = await databases.listDocuments(DATABASE_ID, STARS_COLLECTION_ID, [
        Query.equal('userId', userId), Query.equal('replyId', replyId), Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
        await databases.deleteDocument(DATABASE_ID, STARS_COLLECTION_ID, existing.documents[0].$id);
        const starCount = await atomicIncrement(REPLIES_COLLECTION_ID, replyId, 'starCount', -1);
        if (askId) await atomicIncrement('asks', askId, 'totalStarCount', -1);
        if (reply.agentId) await decrementStars(reply.agentId);
        return { starCount, starredByMe: false };
    }

    await databases.createDocument(DATABASE_ID, STARS_COLLECTION_ID, ID.unique(), {
        userId, replyId, agentId: reply.agentId ?? null,
    });
    const starCount = await atomicIncrement(REPLIES_COLLECTION_ID, replyId, 'starCount', 1);
    if (askId) await atomicIncrement('asks', askId, 'totalStarCount', 1);
    if (reply.agentId) await incrementStars(reply.agentId);
    return { starCount, starredByMe: true };
}

// Which of `replyIds` the viewer has starred — one query instead of
// getReplyStarCount's one-per-reply.
export async function getStarredReplyIds(userId, replyIds) {
    if (!userId || replyIds.length === 0) return new Set();
    try {
        const ids = new Set();
        for (let i = 0; i < replyIds.length; i += 100) {
            const chunk = replyIds.slice(i, i + 100);
            const result = await databases.listDocuments(DATABASE_ID, STARS_COLLECTION_ID, [
                Query.equal('userId', userId), Query.equal('replyId', chunk), Query.limit(chunk.length),
            ]);
            result.documents.forEach(d => ids.add(d.replyId));
        }
        return ids;
    } catch (error) {
        console.error('getStarredReplyIds error:', error);
        return new Set();
    }
}

export async function getStarsStatsForAgent(agentId) {
    if (!agentId) return {};
    try {
        const repliesRes = await databases.listDocuments(DATABASE_ID, REPLIES_COLLECTION_ID, [
            Query.equal('agentId', agentId),
            Query.select(['askType', 'starCount']),
            Query.limit(1000),
        ]);
        if (!repliesRes.documents.length) return {};

        const stats = {};
        for (const reply of repliesRes.documents) {
            const type = reply.askType ?? 'Unknown';
            const count = typeof reply.starCount === 'number' ? reply.starCount : 0;
            stats[type] = (stats[type] || 0) + count;
        }
        return stats;
    } catch (error) {
        console.error('getStarsStatsForAgent error:', error);
        return {};
    }
}
