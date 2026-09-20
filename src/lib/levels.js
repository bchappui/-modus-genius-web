import { databases, DATABASE_ID, AGENTS_COLLECTION_ID, Query, ID } from './appwrite.js';
import { getRankImageUrl } from './agents.js';
import { unlockCardForLevel } from './celebration.js';

// Same Appwrite database as modus_genius (mobile). These two collections
// aren't in this app's own set (it doesn't award hearts/stars itself), but
// they hold the SAME level/rank config the mobile app uses, so read-only
// access to them still works. Mirrors lib/appwrite/levels.ts.
const LEVEL_QUOTAS_COLLECTION_ID = 'level_quotas';
const RANK_CONFIG_COLLECTION_ID = 'rank_config';

// Same "agent_roles" collection the compute-agent-rankings function reads
// via isNotificationsEnabled before sending a ranking/badge notification —
// this is the actual switch that field controls, not a cosmetic toggle.
const AGENT_ROLES_COLLECTION_ID = 'agent_roles';

// Mirrors lib/appwrite/levels.ts getOrCreateAgentRoles — one agent_roles doc
// per agent, created on first read with notificationsEnabled defaulted true.
async function getOrCreateAgentRoles(agentId) {
    const result = await databases.listDocuments(DATABASE_ID, AGENT_ROLES_COLLECTION_ID, [
        Query.equal('agentId', agentId), Query.limit(1),
    ]);
    if (result.documents.length > 0) {
        const doc = result.documents[0];
        return { $id: doc.$id, notificationsEnabled: doc.notificationsEnabled !== false };
    }
    const doc = await databases.createDocument(DATABASE_ID, AGENT_ROLES_COLLECTION_ID, ID.unique(), {
        agentId, likesRole: null, starsRole: null, notificationsEnabled: true,
    });
    return { $id: doc.$id, notificationsEnabled: true };
}

export async function getNotificationsEnabled(agentId) {
    try {
        const agentRoles = await getOrCreateAgentRoles(agentId);
        return agentRoles.notificationsEnabled;
    } catch (error) {
        console.error('getNotificationsEnabled error:', error);
        return true;
    }
}

export async function setNotificationsEnabled(agentId, enabled) {
    try {
        const agentRoles = await getOrCreateAgentRoles(agentId);
        await databases.updateDocument(DATABASE_ID, AGENT_ROLES_COLLECTION_ID, agentRoles.$id, { notificationsEnabled: enabled });
    } catch (error) {
        console.error('setNotificationsEnabled error:', error);
    }
}

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

// Atomically bumps agent.totalHearts by `delta` — mirrors incrementHearts/
// decrementHearts from lib/appwrite/levels.ts (minus the notification/card-
// unlock side effects, which this app has no equivalent of yet). Needed so
// liking/unliking a card here keeps the agent's cached totalHearts in sync
// with the live likeCount sum shown elsewhere (AgentProfileCard), instead of
// leaving totalHearts frozen at whatever the mobile app last set it to.
async function atomicAdjustHearts(agentId, delta, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 50 * 2 ** attempt));
            const agent = await databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId);
            const current = typeof agent.totalHearts === 'number' ? agent.totalHearts : 0;
            const next = Math.max(0, current + delta);
            await databases.updateDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId, { totalHearts: next });
            return next;
        } catch (error) {
            if (attempt === maxRetries - 1) throw error;
        }
    }
}

export async function incrementHearts(agentId) {
    if (!agentId) return;
    try {
        await atomicAdjustHearts(agentId, 1);
    } catch (error) {
        console.error('incrementHearts error:', error);
    }
}

export async function decrementHearts(agentId) {
    if (!agentId) return;
    try {
        await atomicAdjustHearts(agentId, -1);
    } catch (error) {
        console.error('decrementHearts error:', error);
    }
}

// Mirrors lib/appwrite/levels.ts adminAwardReward — admin-only bonus hearts
// or stars for any agent, independent of likes/stars they actually received.
// Recomputes level/tier/rank the same way a real like or star would, and (on
// a level-up) unlocks a card the same way too — this app's CelebrationManager
// is already realtime-subscribed to the agent doc, so updating it here is
// what makes the level-up/quote-unlock celebration modals actually fire for
// the awarded agent, same as the reference app's push notifications do.
// level_history logging and push notifications aren't ported: this app has
// no history screen or push channel that would ever read them.
export async function adminAwardReward(agentId, type, amount) {
    if (!agentId) throw new Error('agentId is required');

    const [agent, quotas] = await Promise.all([
        databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId),
        getLevelQuotas(),
    ]);

    const currentHearts = agent.totalHearts ?? 0;
    const currentStars = agent.totalStars ?? 0;
    const currentLevel = agent.currentLevel ?? 1;

    const newHearts = type === 'hearts' ? currentHearts + amount : currentHearts;
    const newStars = type === 'stars' ? currentStars + amount : currentStars;

    const progression = calculateProgression(newHearts, newStars, quotas.hearts, quotas.stars);
    const newLevel = progression.globalLevel;
    const leveledUp = newLevel > currentLevel;

    let newTier = agent.currentTier || 'Bronze';
    let newRank = agent.currentRank || 'Bronze I';
    let unlockedCard = null;
    if (leveledUp) {
        const rank = await getRankForLevel(newLevel);
        if (rank) {
            newTier = rank.tier || newTier;
            newRank = rank.rankName || newRank;
        }
        // Unlock before the agent doc update so the realtime event
        // CelebrationManager reacts to finds the unlock record already there.
        unlockedCard = await unlockCardForLevel(agentId, newLevel);
    }

    await databases.updateDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId, {
        totalHearts: newHearts,
        totalStars: newStars,
        currentLevel: newLevel,
        currentTier: newTier,
        currentRank: newRank,
        lastLevelUpdate: new Date().toISOString(),
    });

    return { leveledUp, newLevel, progression, unlockedCard };
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

// The single rank_config doc whose levelStart/levelEnd covers `level` —
// mirrors modus_genius/lib/appwrite/celebration.ts getRankForLevel.
export async function getRankForLevel(level) {
    try {
        const result = await databases.listDocuments(DATABASE_ID, RANK_CONFIG_COLLECTION_ID, [
            Query.lessThanEqual('levelStart', level),
            Query.greaterThanEqual('levelEnd', level),
            Query.limit(1),
        ]);
        if (result.documents.length === 0) return null;
        const doc = result.documents[0];
        const imageUrl = doc.imageFileId
            ? (doc.imageFileId.startsWith('http') ? doc.imageFileId : getRankImageUrl(doc.imageFileId))
            : null;
        return { rankName: doc.rankName, tier: doc.tier, imageUrl, levelStart: doc.levelStart, levelEnd: doc.levelEnd };
    } catch (error) {
        console.error('getRankForLevel error:', error);
        return null;
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
