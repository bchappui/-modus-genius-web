// Mirrors modus_genius/store/ranks.store.ts's HOF fetch — same Appwrite
// backend, same hardcoded "agent_rankings_hof" / "agents" collections.
import { databases, DATABASE_ID, AGENTS_COLLECTION_ID, Query } from './appwrite.js';

const HOF_COLLECTION_ID = 'agent_rankings_hof';
const RANKINGS_COLLECTION_ID = 'agent_rankings';

// Winner = highest score among agent_rankings_hof docs matching tab/category/year
// — rank isn't a stored field, always derived from score (same as modus_genius).
export async function getHofWinner({ category, year }) {
    try {
        const res = await databases.listDocuments(DATABASE_ID, HOF_COLLECTION_ID, [
            Query.equal('tab', 'HOF'),
            Query.equal('category', category),
            Query.equal('year', year),
            Query.limit(1000),
        ]);
        if (!res.documents.length) return null;
        const winner = res.documents.reduce((max, curr) => (curr.score > max.score ? curr : max));
        if (!winner.agentId) return winner;
        try {
            const agentDoc = await databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, winner.agentId);
            return { ...winner, agent: agentDoc };
        } catch {
            return winner;
        }
    } catch (e) {
        console.error('getHofWinner error', e);
        return null;
    }
}

// Mirrors modus_genius/store/ranks.store.ts's fetchRanks — same
// "agent_rankings" collection, ordered by score desc, top 1 only (unlike
// the mobile app's top-3 + full list, this page only ever shows the winner).
export async function getRankWinner({ tab, category }) {
    try {
        const res = await databases.listDocuments(DATABASE_ID, RANKINGS_COLLECTION_ID, [
            Query.equal('tab', tab),
            Query.equal('category', category),
            Query.orderDesc('score'),
            Query.limit(1),
        ]);
        const winner = res.documents[0];
        if (!winner) return null;
        if (!winner.agentId) return winner;
        try {
            const agentDoc = await databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, winner.agentId);
            return { ...winner, agent: agentDoc };
        } catch {
            return winner;
        }
    } catch (e) {
        console.error('getRankWinner error', e);
        return null;
    }
}
