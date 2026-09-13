import { databases, DATABASE_ID, AGENTS_COLLECTION_ID, Query } from './appwrite.js';
import { getRankImageUrl } from './agents.js';

// Same Appwrite database as modus_genius (mobile). These two collections
// aren't in this app's own set (it doesn't award hearts/stars itself), but
// they hold the SAME level/rank config the mobile app uses, so read-only
// access to them still works. Mirrors lib/appwrite/levels.ts.
const LEVEL_QUOTAS_COLLECTION_ID = 'level_quotas';
const RANK_CONFIG_COLLECTION_ID = 'rank_config';

export async function getLevelQuotas() {
    try {
        const [heartsResult, starsResult] = await Promise.all([
            databases.listDocuments(DATABASE_ID, LEVEL_QUOTAS_COLLECTION_ID, [
                Query.equal('quotaType', 'hearts'), Query.orderAsc('level'), Query.limit(100),
            ]),
            databases.listDocuments(DATABASE_ID, LEVEL_QUOTAS_COLLECTION_ID, [
                Query.equal('quotaType', 'stars'), Query.orderAsc('level'), Query.limit(100),
            ]),
        ]);
        return {
            hearts: heartsResult.documents.map(d => d.required),
            stars: starsResult.documents.map(d => d.required),
        };
    } catch (error) {
        console.error('getLevelQuotas error:', error);
        return { hearts: [3, 4, 5, 6], stars: [1, 3, 5, 7] };
    }
}

// Pure function — how many quota thresholds totalHearts/totalStars have
// cleared, summed into one "global level".
export function calculateProgression(totalHearts, totalStars, heartQuotas, starQuotas) {
    let heartsLevel = 0;
    let starsLevel = 0;
    while (heartsLevel < heartQuotas.length && totalHearts >= heartQuotas[heartsLevel]) heartsLevel++;
    while (starsLevel < starQuotas.length && totalStars >= starQuotas[starsLevel]) starsLevel++;
    const heartsNeeded = heartsLevel < heartQuotas.length ? heartQuotas[heartsLevel] - totalHearts : null;
    const starsNeeded = starsLevel < starQuotas.length ? starQuotas[starsLevel] - totalStars : null;
    return { globalLevel: heartsLevel + starsLevel, heartsLevel, starsLevel, heartsNeeded, starsNeeded };
}

// currentLevel is always derived from actual hearts/stars, not the agent
// document's own (defaulted-to-1) currentLevel field — mirrors getUserProgress.
export async function getUserProgress(agentId) {
    try {
        if (!agentId) return null;
        const [agent, quotas] = await Promise.all([
            databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId),
            getLevelQuotas(),
        ]);
        const totalHearts = agent.totalHearts ?? 0;
        const totalStars = agent.totalStars ?? 0;
        const progression = calculateProgression(totalHearts, totalStars, quotas.hearts, quotas.stars);
        return {
            totalHearts,
            totalStars,
            currentLevel: Math.max(1, progression.globalLevel),
            currentTier: agent.currentTier ?? 'Bronze',
            currentRank: agent.currentRank ?? 'Bronze I',
        };
    } catch (error) {
        console.error('getUserProgress error:', error);
        return { totalHearts: 0, totalStars: 0, currentLevel: 1, currentTier: 'Bronze', currentRank: 'Bronze I' };
    }
}

async function getRankConfig() {
    try {
        const result = await databases.listDocuments(DATABASE_ID, RANK_CONFIG_COLLECTION_ID, [
            Query.orderAsc('order'), Query.limit(100),
        ]);
        return result.documents;
    } catch (error) {
        console.error('getRankConfig error:', error);
        return [];
    }
}

// Transforms rank_config docs (order, tier, rankName, levelStart, levelEnd,
// imageFileId) into { tierName, ranks: [{ name, image, levels }] } grouped by
// tier — mirrors buildRanksFromAppwrite exactly, only used here to find which
// rank image covers the agent's currentLevel.
export async function buildRanksFromAppwrite() {
    try {
        const rankDocs = await getRankConfig();
        if (rankDocs.length === 0) return [];

        const tierMap = new Map();
        for (const doc of rankDocs) {
            if (!tierMap.has(doc.tier)) tierMap.set(doc.tier, []);
            tierMap.get(doc.tier).push(doc);
        }

        return Array.from(tierMap.entries()).map(([tierName, docs]) => ({
            tierName,
            ranks: docs.map(rankDoc => {
                const imageUrl = rankDoc.imageFileId
                    ? (rankDoc.imageFileId.startsWith('http') ? rankDoc.imageFileId : getRankImageUrl(rankDoc.imageFileId))
                    : null;
                const levelCount = rankDoc.levelEnd - rankDoc.levelStart + 1;
                const levels = Array.from({ length: levelCount }, (_, i) => ({
                    level: rankDoc.levelStart + i,
                    image: imageUrl,
                }));
                return { name: rankDoc.rankName, image: imageUrl, levels };
            }),
        }));
    } catch (error) {
        console.error('buildRanksFromAppwrite error:', error);
        return [];
    }
}
