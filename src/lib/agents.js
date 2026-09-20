import { databases, storage, DATABASE_ID, AGENTS_COLLECTION_ID, AVATARS_BUCKET_ID, ENDPOINT, PROJECT_ID, ID, Query } from './appwrite.js';
import { getTop10Properties, getMostWantedProperties, getClassicsProperties, getMGSelectsProperties } from './discover.js';

// Same Appwrite database as modus_genius (mobile); "badges" isn't in this
// app's own collection set, so its ID is hardcoded here exactly like the
// mobile app's lib/appwrite/agents.ts does.
const BADGES_COLLECTION_ID = 'badges';

export const updateAgent = (agentId, data) =>
    databases.updateDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId, data);

// Mirrors app/(root)/admin/index.tsx's handleSearch — full-text search on
// `name` (falls back to a prefix range query if no search index exists on
// that attribute), used by the admin award tool to find any agent by name.
export async function searchAgentsByName(query) {
    const q = (query || '').trim();
    if (!q) return [];
    try {
        const res = await databases.listDocuments(DATABASE_ID, AGENTS_COLLECTION_ID, [
            Query.search('name', q), Query.limit(20),
        ]);
        return res.documents.map(d => ({ id: d.$id, name: d.name || '', surname: d.surname || '', email: d.email || '' }));
    } catch (error) {
        try {
            const res = await databases.listDocuments(DATABASE_ID, AGENTS_COLLECTION_ID, [
                Query.greaterThanEqual('name', q), Query.lessThan('name', q + '￿'), Query.limit(20),
            ]);
            return res.documents.map(d => ({ id: d.$id, name: d.name || '', surname: d.surname || '', email: d.email || '' }));
        } catch (err) {
            console.error('searchAgentsByName error:', err);
            return [];
        }
    }
}

// "YYYY-MM" in the visitor's local time — the unit the free monthly card slot resets on.
export const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Mirrors the mobile app's lib/appwrite/agents.ts uploadAvatar — same bucket,
// same view-URL shape — so avatars stay interchangeable between apps.
export async function uploadAvatar(file, oldFileId) {
    if (oldFileId) {
        try { await storage.deleteFile(AVATARS_BUCKET_ID, oldFileId); } catch (e) { /* old file may already be gone */ }
    }
    const uploaded = await storage.createFile(AVATARS_BUCKET_ID, ID.unique(), file);
    const url = `${ENDPOINT}/storage/buckets/${AVATARS_BUCKET_ID}/files/${uploaded.$id}/view?project=${PROJECT_ID}`;
    return { url, fileId: uploaded.$id };
}

// Mirrors modus_genius/lib/appwrite/agents.ts — rank images live in the same
// bucket as avatars (its own env var falls back to the avatars bucket there).
export const getFileViewUrl = (fileId) =>
    `${ENDPOINT}/storage/buckets/${AVATARS_BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
export const getRankImageUrl = getFileViewUrl;

// Mirrors modus_genius/constants/leaderboardBadgeImages.ts exactly — every
// rank/tab still points at the same placeholder fileId on the reference
// side too, so this is a 1:1 port, not an approximation.
const LEADERBOARD_BADGE_IMAGES = {
    Radar:  { rank1: '6a141f1300157a6431d7', rank2: '6a141f1300157a6431d7', rank3: '6a141f1300157a6431d7', rank4plus: '6a141f1300157a6431d7' },
    Season: { rank1: '6a141f1300157a6431d7', rank2: '6a141f1300157a6431d7', rank3: '6a141f1300157a6431d7', rank4plus: '6a141f1300157a6431d7' },
    Year:   { rank1: '6a141f1300157a6431d7', rank2: '6a141f1300157a6431d7', rank3: '6a141f1300157a6431d7', rank4plus: '6a141f1300157a6431d7' },
    HOF:    '6a12bb94003dfc6b4414',
};
const DISCOVER_BADGE_IMAGES = {
    'Top 10':      '6a141f1300157a6431d7',
    'Most Wanted': '6a141f1300157a6431d7',
    'Classics':    '6a141f1300157a6431d7',
    'MG Selects':  '6a141f1300157a6431d7',
};
export function getLeaderboardBadgeFileId(tab, position) {
    if (tab === 'HOF') return LEADERBOARD_BADGE_IMAGES.HOF;
    const tabImages = LEADERBOARD_BADGE_IMAGES[tab] ?? LEADERBOARD_BADGE_IMAGES.Radar;
    if (position === 1) return tabImages.rank1;
    if (position === 2) return tabImages.rank2;
    if (position === 3) return tabImages.rank3;
    return tabImages.rank4plus;
}
export function getDiscoverBadgeFileId(tab) {
    return DISCOVER_BADGE_IMAGES[tab] ?? '6a141f1300157a6431d7';
}

const DISCOVER_SECTIONS = [
    { tab: 'Top 10',      fn: getTop10Properties },
    { tab: 'Most Wanted', fn: getMostWantedProperties },
    { tab: 'Classics',    fn: getClassicsProperties },
    { tab: 'MG Selects',  fn: getMGSelectsProperties },
];

// Mirrors modus_genius/lib/appwrite/agents.ts awardDiscoverBadges — checks
// each Discover section for a card this agent owns, and upgrades (or
// creates) a "badges" doc when it now ranks higher than previously recorded.
export async function awardDiscoverBadges(userId) {
    const awarded = [];
    try {
        const agent = await databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, userId);
        const name = agent.name || '';
        const surname = agent.surname || '';
        const year = new Date().getFullYear();

        for (const { tab, fn } of DISCOVER_SECTIONS) {
            const properties = await fn();
            const userProps = properties
                .map((p, index) => ({ p, rank: index + 1 }))
                .filter(({ p }) => p.agent?.$id === userId);

            for (const { p, rank } of userProps) {
                const category = p.name || '';
                const propertyId = p.$id || '';
                const fileId = getDiscoverBadgeFileId(tab);
                const awardedAt = new Date().toISOString();
                try {
                    const existing = await databases.listDocuments(DATABASE_ID, BADGES_COLLECTION_ID, [
                        Query.equal('userId', userId),
                        Query.equal('tab', tab),
                        Query.equal('category', category),
                        Query.equal('source', 'discover'),
                        Query.equal('year', year),
                        Query.limit(1),
                    ]);

                    if (existing.documents.length > 0) {
                        const currentRank = existing.documents[0].rank;
                        const updateData = { fileId, badge: getFileViewUrl(fileId) };
                        if (rank < currentRank) {
                            updateData.rank = rank;
                            updateData.awardedAt = awardedAt;
                            awarded.push({ fileId, tab, propertyId, propertyName: category, year });
                        }
                        await databases.updateDocument(DATABASE_ID, BADGES_COLLECTION_ID, existing.documents[0].$id, updateData);
                    } else {
                        await databases.createDocument(DATABASE_ID, BADGES_COLLECTION_ID, ID.unique(), {
                            userId, fileId, badge: getFileViewUrl(fileId), tab, category, source: 'discover',
                            rank, score: 0, awardedAt, name, surname, year,
                        });
                        awarded.push({ fileId, tab, propertyId, propertyName: category, year });
                    }
                } catch (err) {
                    console.error('awardDiscoverBadges property error:', err);
                }
            }
        }
    } catch (error) {
        console.error('awardDiscoverBadges error:', error);
    }
    return awarded;
}

// Mirrors modus_genius/lib/appwrite/agents.ts awardLeaderboardBadges —
// same upgrade-only-if-better-rank logic, called with the positions
// getUserLeaderboardPositions() just computed.
export async function awardLeaderboardBadges(userId, positions) {
    const awarded = [];
    try {
        const agent = await databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, userId);
        const name = agent.name || '';
        const surname = agent.surname || '';
        const year = new Date().getFullYear();

        for (const pos of positions) {
            try {
                const awardedAt = new Date().toISOString();
                const fileId = getLeaderboardBadgeFileId(pos.tab, pos.position);

                const existing = await databases.listDocuments(DATABASE_ID, BADGES_COLLECTION_ID, [
                    Query.equal('userId', userId),
                    Query.equal('tab', pos.tab),
                    Query.equal('category', pos.category),
                    Query.equal('source', pos.source),
                    Query.equal('year', year),
                    Query.limit(1),
                ]);

                if (existing.documents.length > 0) {
                    const currentRank = existing.documents[0].rank;
                    const updateData = { fileId, badge: getFileViewUrl(fileId) };
                    if (pos.position < currentRank) {
                        updateData.rank = pos.position;
                        updateData.score = pos.score;
                        updateData.awardedAt = awardedAt;
                        awarded.push({ fileId, tab: pos.tab, category: pos.category, rank: pos.position, name, surname, year });
                    }
                    await databases.updateDocument(DATABASE_ID, BADGES_COLLECTION_ID, existing.documents[0].$id, updateData);
                } else {
                    await databases.createDocument(DATABASE_ID, BADGES_COLLECTION_ID, ID.unique(), {
                        userId, fileId, badge: getFileViewUrl(fileId), tab: pos.tab, category: pos.category,
                        source: pos.source, rank: pos.position, score: pos.score, awardedAt, name, surname, year,
                    });
                    awarded.push({ fileId, tab: pos.tab, category: pos.category, rank: pos.position, name, surname, year });
                }
            } catch (posError) {
                console.error('awardLeaderboardBadges position error:', posError);
            }
        }
    } catch (error) {
        console.error('awardLeaderboardBadges error:', error);
    }
    return awarded;
}

// Mirrors modus_genius/lib/appwrite/agents.ts getBadgesByUser — every badge
// doc this agent has earned (leaderboard + Discover), unfiltered/unordered.
export async function getBadgesByUser(agentId) {
    if (!agentId) return [];
    try {
        const result = await databases.listDocuments(DATABASE_ID, BADGES_COLLECTION_ID, [
            Query.equal('userId', agentId),
        ]);
        return result.documents;
    } catch (error) {
        console.error('getBadgesByUser error:', error);
        return [];
    }
}

// Mirrors modus_genius/lib/appwrite/agents.ts addDisplayedBadge/removeDisplayedBadge
// — up to 3 of an agent's earned badges can be pinned to their profile card,
// stored as an ordered list of badge doc IDs on the agent document.
export async function addDisplayedBadge(agentId, badgeId) {
    const agent = await databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId);
    const currentDisplayed = agent.displayedBadges || [];

    if (currentDisplayed.includes(badgeId)) throw new Error('Badge already displayed');
    if (currentDisplayed.length >= 3) throw new Error('Maximum 3 badges can be displayed');

    const badge = await databases.getDocument(DATABASE_ID, BADGES_COLLECTION_ID, badgeId);
    if (badge.userId !== agentId) throw new Error('You can only display your own badges');

    const updatedDisplayed = [...currentDisplayed, badgeId];
    await databases.updateDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId, { displayedBadges: updatedDisplayed });
    return updatedDisplayed;
}

export async function removeDisplayedBadge(agentId, badgeId) {
    const agent = await databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId);
    const currentDisplayed = agent.displayedBadges || [];
    const updatedDisplayed = currentDisplayed.filter(id => id !== badgeId);
    await databases.updateDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId, { displayedBadges: updatedDisplayed });
    return updatedDisplayed;
}

// Mirrors modus_genius/lib/appwrite/agents.ts getDisplayedBadges — an agent
// document's `displayedBadges` field holds up to 3 badge doc IDs; batch-fetch
// them and preserve that order (rather than the collection's own order).
export async function getDisplayedBadges(agentId) {
    if (!agentId) return [];
    try {
        const agent = await databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId);
        const displayedBadgeIds = agent.displayedBadges || [];
        if (displayedBadgeIds.length === 0) return [];

        const badgeDocs = await databases.listDocuments(DATABASE_ID, BADGES_COLLECTION_ID, [
            Query.equal('$id', displayedBadgeIds),
            Query.limit(displayedBadgeIds.length),
        ]);
        const badgeMap = new Map(badgeDocs.documents.map(b => [b.$id, b]));
        return displayedBadgeIds.map(id => badgeMap.get(id)).filter(Boolean);
    } catch (error) {
        console.error('getDisplayedBadges error:', error);
        return [];
    }
}
