import { databases, storage, DATABASE_ID, AGENTS_COLLECTION_ID, AVATARS_BUCKET_ID, ENDPOINT, PROJECT_ID, ID } from './appwrite.js';

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
