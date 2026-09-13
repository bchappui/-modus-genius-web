import { databases, storage, DATABASE_ID, AGENTS_COLLECTION_ID, AVATARS_BUCKET_ID, ENDPOINT, PROJECT_ID, ID, Query } from './appwrite.js';

// Same Appwrite database as modus_genius (mobile); "badges" isn't in this
// app's own collection set, so its ID is hardcoded here exactly like the
// mobile app's lib/appwrite/agents.ts does.
const BADGES_COLLECTION_ID = 'badges';

export const updateAgent = (agentId, data) =>
    databases.updateDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId, data);

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
