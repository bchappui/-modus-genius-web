import { databases, storage, DATABASE_ID, AGENTS_COLLECTION_ID, AVATARS_BUCKET_ID, ENDPOINT, PROJECT_ID, Query, ID } from './appwrite.js';
import { SKILL_CATEGORIES } from './categories.js';

// Same Appwrite "asks" / "replies" collections as modus_genius (mobile)'s
// Advisor tab — mirrors lib/appwrite/asks.ts so a question or reply posted
// here shows up in the app and vice versa. Push/in-app notifications
// (notifyAskReplied) aren't ported, same as likes.js.
const ASKS_COLLECTION_ID = 'asks';
const REPLIES_COLLECTION_ID = 'replies';

// Mirrors lib/appwrite/atomic.ts atomicIncrement.
async function atomicIncrement(collectionId, documentId, field, delta, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) await new Promise(r => setTimeout(r, 50 * 2 ** attempt));
            const doc = await databases.getDocument(DATABASE_ID, collectionId, documentId);
            const current = typeof doc[field] === 'number' ? doc[field] : 0;
            const next = Math.max(0, current + delta);
            await databases.updateDocument(DATABASE_ID, collectionId, documentId, { [field]: next });
            return next;
        } catch (error) {
            if (error?.code === 404 || attempt === maxRetries - 1) {
                console.error(`atomicIncrement failed for ${field}:`, error);
                return 0;
            }
        }
    }
    return 0;
}

// ask.agent is a plain agent $id string (or occasionally an expanded doc) —
// batch-fetch the agents in one query instead of one per ask.
async function withAgents(docs) {
    const agentIds = [...new Set(
        docs.map(a => typeof a.agent === 'object' && a.agent !== null ? a.agent.$id : a.agent).filter(Boolean)
    )];
    let agentMap = new Map();
    if (agentIds.length > 0) {
        const agents = await databases.listDocuments(DATABASE_ID, AGENTS_COLLECTION_ID, [
            Query.equal('$id', agentIds), Query.limit(agentIds.length),
        ]);
        agentMap = new Map(agents.documents.map(a => [a.$id, a]));
    }
    return docs.map(ask => ({
        ...ask,
        agent: typeof ask.agent === 'object' && ask.agent !== null
            ? ask.agent
            : (ask.agent ? agentMap.get(ask.agent) || null : null),
    }));
}

// `sort` is the New / Unanswered / Popular pill; `category` the left-hand
// category filter. The app only ever applies one of the two at a time, here
// both panels are visible together so they combine.
export async function getAsks({ category, sort = 'new', limit = 10, offset = 0 } = {}) {
    try {
        const queries = [];
        if (category && category !== 'All') queries.push(Query.equal('type', category));
        if (sort === 'unanswered') queries.push(Query.equal('replyCount', 0));
        queries.push(sort === 'popular' ? Query.orderDesc('totalStarCount') : Query.orderDesc('$createdAt'));
        queries.push(Query.limit(limit + 1), Query.offset(offset));

        const result = await databases.listDocuments(DATABASE_ID, ASKS_COLLECTION_ID, queries);
        const hasMore = result.documents.length > limit;
        const docs = hasMore ? result.documents.slice(0, limit) : result.documents;
        return { items: await withAgents(docs), hasMore };
    } catch (error) {
        console.error('getAsks error:', error);
        return { items: [], hasMore: false };
    }
}

export async function getAskById(id) {
    try {
        const ask = await databases.getDocument(DATABASE_ID, ASKS_COLLECTION_ID, id);
        const [withAgent] = await withAgents([ask]);
        return withAgent;
    } catch (error) {
        console.error('getAskById error:', error);
        return null;
    }
}

// Bookmarked questions — favorites.propertyId holds either a card id or an
// ask id, so non-ask ids simply don't match here. Newest first.
export async function getAsksByIds(ids) {
    if (!ids?.length) return [];
    try {
        let docs = [];
        for (let i = 0; i < ids.length; i += 100) {
            const chunk = ids.slice(i, i + 100);
            const result = await databases.listDocuments(DATABASE_ID, ASKS_COLLECTION_ID, [
                Query.equal('$id', chunk), Query.orderDesc('$createdAt'), Query.limit(chunk.length),
            ]);
            docs = docs.concat(result.documents);
        }
        return withAgents(docs);
    } catch (error) {
        console.error('getAsksByIds error:', error);
        return [];
    }
}

// { [categoryKey]: count, All: total } for the left-hand category list.
export async function countAsksByCategory() {
    try {
        const entries = await Promise.all(SKILL_CATEGORIES.map(c =>
            databases.listDocuments(DATABASE_ID, ASKS_COLLECTION_ID, [Query.equal('type', c.key), Query.limit(1)])
                .then(r => [c.key, r.total])
                .catch(() => [c.key, 0])
        ));
        const all = await databases.listDocuments(DATABASE_ID, ASKS_COLLECTION_ID, [Query.limit(1)]);
        return { ...Object.fromEntries(entries), All: all.total };
    } catch (error) {
        console.error('countAsksByCategory error:', error);
        return {};
    }
}

// Mirrors createAsk — same fields, and the optional image goes to the same
// avatars bucket with the same /view URL format the app stores.
export async function createAsk({ name, description, type, imageFile, agentId }) {
    const docData = { name, description, type, agent: agentId || null };

    if (imageFile) {
        const uploaded = await storage.createFile(AVATARS_BUCKET_ID, ID.unique(), imageFile);
        docData.image = `${ENDPOINT}/storage/buckets/${AVATARS_BUCKET_ID}/files/${uploaded.$id}/view?project=${PROJECT_ID}`;
    }

    return databases.createDocument(DATABASE_ID, ASKS_COLLECTION_ID, ID.unique(), docData);
}

// Mirrors addReply (minus notifyAskReplied, see top of file).
export async function addReply(askId, reply, name, avatar, replierId, parentReply = null) {
    const ask = await databases.getDocument(DATABASE_ID, ASKS_COLLECTION_ID, askId);
    const newReply = await databases.createDocument(DATABASE_ID, REPLIES_COLLECTION_ID, ID.unique(), {
        ask: askId,
        askType: ask.type,
        reply,
        name,
        avatar,
        agentId: replierId,
        parentReply,
        starCount: 0,
    });
    const replyCount = await atomicIncrement(ASKS_COLLECTION_ID, askId, 'replyCount', 1);
    return { reply: newReply, replyCount };
}

// Mirrors deleteReply — removes the reply and decrements the ask's
// replyCount. Returns the new replyCount.
export async function deleteReply(replyId) {
    const reply = await databases.getDocument(DATABASE_ID, REPLIES_COLLECTION_ID, replyId);
    const askId = typeof reply.ask === 'string' ? reply.ask : reply.ask?.$id;
    await databases.deleteDocument(DATABASE_ID, REPLIES_COLLECTION_ID, replyId);
    return askId ? atomicIncrement(ASKS_COLLECTION_ID, askId, 'replyCount', -1) : null;
}

// Every reply of one ask, with the author's current name/avatar/title from
// the agents collection (same override getAskReplies does).
export async function getAllAskReplies(askId) {
    try {
        let docs = [];
        let offset = 0;
        for (;;) {
            const result = await databases.listDocuments(DATABASE_ID, REPLIES_COLLECTION_ID, [
                Query.equal('ask', askId), Query.orderDesc('$createdAt'), Query.limit(100), Query.offset(offset),
            ]);
            docs = docs.concat(result.documents);
            offset += result.documents.length;
            if (result.documents.length < 100) break;
        }

        const agentIds = [...new Set(docs.map(r => r.agentId).filter(Boolean))];
        let agentMap = new Map();
        for (let i = 0; i < agentIds.length; i += 100) {
            const chunk = agentIds.slice(i, i + 100);
            const agents = await databases.listDocuments(DATABASE_ID, AGENTS_COLLECTION_ID, [
                Query.equal('$id', chunk), Query.limit(chunk.length),
            ]);
            agents.documents.forEach(a => agentMap.set(a.$id, a));
        }

        return docs.map(r => {
            const agent = r.agentId ? agentMap.get(r.agentId) : null;
            return {
                ...r,
                avatar: agent?.avatar || r.avatar || null,
                name: agent?.name || r.name || '',
                title: agent?.title || r.title || '',
            };
        });
    } catch (error) {
        console.error('getAllAskReplies error:', error);
        return [];
    }
}

export { atomicIncrement };
