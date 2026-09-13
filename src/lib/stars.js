import { databases, DATABASE_ID, Query } from './appwrite.js';

// Same Appwrite database as modus_genius (mobile); "replies" is its Ask/Q&A
// feature's collection — this web app has no such feature, so this will
// simply return {} for every agent (0 stars), same as a mobile user with no
// replies yet. Mirrors lib/appwrite/stars.ts getStarsStatsForAgent.
const REPLIES_COLLECTION_ID = 'replies';

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
