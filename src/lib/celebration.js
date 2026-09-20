// Mirrors modus_genius/lib/appwrite/celebration.ts — same Appwrite database,
// same "agent_rankings" / "unlocked_quotes" / "agent_roles" collections the
// mobile app's cron jobs already populate, so this is read/write against
// existing data rather than a new schema.
import { databases, DATABASE_ID, Query, ID } from './appwrite.js';

const RANKINGS_COLLECTION_ID = 'agent_rankings';
const UNLOCKED_QUOTES_COLLECTION_ID = 'unlocked_quotes';
const AGENT_ROLES_COLLECTION_ID = 'agent_roles';
const QUOTES_COLLECTION_ID = 'quotes';

// quotes.category doubles as its rarity tier (see QuotesPage/QuoteCard) —
// mirrors quote-unlocks.ts's RARITY_WEIGHTS exactly.
const RARITY_WEIGHTS = {
    common: 40.0, uncommon: 25.0, rare: 15.0, epic: 10.0,
    legendary: 7.0, exotic: 2.5, mythic: 0.5,
};

function selectWeightedRarity(availableRarities) {
    const weights = availableRarities.map(r => RARITY_WEIGHTS[r] || 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return availableRarities[Math.floor(Math.random() * availableRarities.length)];
    let random = Math.random() * totalWeight;
    for (let i = 0; i < availableRarities.length; i++) {
        random -= weights[i];
        if (random <= 0) return availableRarities[i];
    }
    return availableRarities[availableRarities.length - 1];
}

// Mirrors modus_genius/lib/appwrite/quote-unlocks.ts unlockCardForLevel —
// picks one not-yet-owned quote (weighted by rarity) from those unlocked at
// or before `level`, and records the unlock. Returns the unlocked quote doc,
// or null if there's nothing new to give (mirrors the mobile app exactly, so
// a level-up doesn't always come with a card if the pool is exhausted).
export async function unlockCardForLevel(userId, level) {
    try {
        const allQuotes = await databases.listDocuments(DATABASE_ID, QUOTES_COLLECTION_ID, [
            Query.lessThanEqual('minLevel', level), Query.limit(1000),
        ]);
        if (allQuotes.documents.length === 0) return null;

        const unlocked = await databases.listDocuments(DATABASE_ID, UNLOCKED_QUOTES_COLLECTION_ID, [
            Query.equal('userId', userId), Query.limit(1000),
        ]);
        const unlockedIds = unlocked.documents.map(d => d.quoteId);

        const available = allQuotes.documents.filter(q => !unlockedIds.includes(q.$id));
        if (available.length === 0) return null;

        const byRarity = { common: [], uncommon: [], rare: [], epic: [], legendary: [], exotic: [], mythic: [] };
        available.forEach(quote => {
            const rarity = quote.category?.toLowerCase();
            if (byRarity[rarity]) byRarity[rarity].push(quote);
        });

        const availableRarities = Object.keys(byRarity).filter(r => byRarity[r].length > 0);
        if (availableRarities.length === 0) return null;

        const selectedRarity = selectWeightedRarity(availableRarities);
        const cards = byRarity[selectedRarity];
        const randomCard = cards[Math.floor(Math.random() * cards.length)];

        await databases.createDocument(DATABASE_ID, UNLOCKED_QUOTES_COLLECTION_ID, ID.unique(), {
            userId, quoteId: randomCard.$id, unlockedAtLevel: level,
        });

        return randomCard;
    } catch (err) {
        console.error('unlockCardForLevel error:', err);
        return null;
    }
}

// One entry per (tab, category, source) the agent ranks in the global top 100.
export async function getUserLeaderboardPositions(agentId) {
    try {
        const agentEntries = await databases.listDocuments(DATABASE_ID, RANKINGS_COLLECTION_ID, [
            Query.equal('agentId', agentId), Query.limit(50),
        ]);

        const positions = [];
        for (const doc of agentEntries.documents) {
            const higherResult = await databases.listDocuments(DATABASE_ID, RANKINGS_COLLECTION_ID, [
                Query.equal('tab', doc.tab),
                Query.equal('category', doc.category),
                Query.equal('source', doc.source),
                Query.greaterThan('score', doc.score),
                Query.limit(1),
            ]);
            const position = higherResult.total + 1;
            if (position <= 100) {
                const alreadyTracked = positions.some(
                    p => p.tab === doc.tab && p.category === doc.category && p.source === doc.source
                );
                if (!alreadyTracked) {
                    positions.push({ tab: doc.tab, category: doc.category, source: doc.source, position, score: doc.score });
                }
            }
        }
        return positions;
    } catch (err) {
        console.error('getUserLeaderboardPositions error:', err);
        return [];
    }
}

export async function getUnlockedQuoteAtLevel(userId, level) {
    try {
        const unlockResult = await databases.listDocuments(DATABASE_ID, UNLOCKED_QUOTES_COLLECTION_ID, [
            Query.equal('userId', userId),
            Query.equal('unlockedAtLevel', level),
            Query.limit(1),
        ]);
        if (unlockResult.documents.length === 0) return null;

        const quoteId = unlockResult.documents[0].quoteId;
        if (!quoteId) return null;

        const quote = await databases.getDocument(DATABASE_ID, QUOTES_COLLECTION_ID, quoteId);
        return { $id: quote.$id, text: quote.text || '', author: quote.author || quote.agentName, category: quote.category };
    } catch (err) {
        console.error('getUnlockedQuoteAtLevel error:', err);
        return null;
    }
}

export async function getUnseenUnlockedQuote(userId) {
    try {
        const unlockResult = await databases.listDocuments(DATABASE_ID, UNLOCKED_QUOTES_COLLECTION_ID, [
            Query.equal('userId', userId),
            Query.isNull('seenAt'),
            Query.limit(1),
        ]);
        if (unlockResult.documents.length === 0) return null;

        const doc = unlockResult.documents[0];
        if (!doc.quoteId) return null;

        const quote = await databases.getDocument(DATABASE_ID, QUOTES_COLLECTION_ID, doc.quoteId);
        return { docId: doc.$id, quoteId: quote.$id, text: quote.text || '', author: quote.author || quote.agentName, category: quote.category };
    } catch (err) {
        console.error('getUnseenUnlockedQuote error:', err);
        return null;
    }
}

export async function markQuoteAsSeen(docId) {
    try {
        const doc = await databases.getDocument(DATABASE_ID, UNLOCKED_QUOTES_COLLECTION_ID, docId);
        await databases.updateDocument(DATABASE_ID, UNLOCKED_QUOTES_COLLECTION_ID, docId, {
            userId: doc.userId,
            quoteId: doc.quoteId,
            unlockedAtLevel: doc.unlockedAtLevel,
            seenAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error('markQuoteAsSeen error:', err);
    }
}

export async function getAgentRoles(agentId) {
    try {
        const result = await databases.listDocuments(DATABASE_ID, AGENT_ROLES_COLLECTION_ID, [
            Query.equal('agentId', agentId), Query.limit(1),
        ]);
        if (result.documents.length === 0) return { likesRole: null, starsRole: null };
        const doc = result.documents[0];
        return { likesRole: doc.likesRole || null, starsRole: doc.starsRole || null };
    } catch (err) {
        console.error('getAgentRoles error:', err);
        return { likesRole: null, starsRole: null };
    }
}
