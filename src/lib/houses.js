import { databases, DATABASE_ID, AGENTS_COLLECTION_ID, Query, ID } from './appwrite.js';
import { uploadAvatar } from './agents.js';

// Houses — web-only feature (Extra members). Collections created by hand in
// the Appwrite console (named houses, house_requests, house_asks,
// house_replies, expertise_requests — the console generated their IDs).
// Privacy is enforced by the site only (collection-level "Users" permissions,
// no document security).
export const HOUSES_COLLECTION_ID = '6ab6e7bc0016e64835d4';
export const HOUSE_REQUESTS_COLLECTION_ID = '6ab6e8e60035ad20fdfb';
export const HOUSE_ASKS_COLLECTION_ID = '6ab6e9e80020a667b7de';
export const HOUSE_REPLIES_COLLECTION_ID = '6ab6eaca002edb26e4ce';
export const EXPERTISE_REQUESTS_COLLECTION_ID = '6ab6eb79000608826f63';

export const MAX_HOUSE_MEMBERS = 10;

// ── helpers ──────────────────────────────────────────────────────────

async function listAll(collectionId, queries = []) {
    let docs = [];
    let offset = 0;
    for (;;) {
        const res = await databases.listDocuments(DATABASE_ID, collectionId, [...queries, Query.limit(100), Query.offset(offset)]);
        docs = docs.concat(res.documents);
        offset += res.documents.length;
        if (res.documents.length < 100) break;
    }
    return docs;
}

export async function getAgentsByIds(ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    const map = new Map();
    for (let i = 0; i < unique.length; i += 100) {
        const chunk = unique.slice(i, i + 100);
        const res = await databases.listDocuments(DATABASE_ID, AGENTS_COLLECTION_ID, [
            Query.equal('$id', chunk), Query.limit(chunk.length),
        ]);
        res.documents.forEach(a => map.set(a.$id, a));
    }
    return map;
}

// ── houses ───────────────────────────────────────────────────────────

export async function getHouse(houseId) {
    try {
        return await databases.getDocument(DATABASE_ID, HOUSES_COLLECTION_ID, houseId);
    } catch (error) {
        console.error('getHouse error:', error);
        return null;
    }
}

export async function listAllHouses() {
    try {
        return await listAll(HOUSES_COLLECTION_ID);
    } catch (error) {
        console.error('listAllHouses error:', error);
        return [];
    }
}

// A member can only belong to one house. memberIds has no index (Appwrite
// can't index array attributes), so contains() runs unindexed — fine at this
// scale; falls back to a full scan if the query is rejected.
export async function getHouseOfAgent(agentId) {
    if (!agentId) return null;
    try {
        const res = await databases.listDocuments(DATABASE_ID, HOUSES_COLLECTION_ID, [
            Query.contains('memberIds', [agentId]), Query.limit(1),
        ]);
        return res.documents[0] || null;
    } catch {
        const all = await listAllHouses();
        return all.find(h => (h.memberIds || []).includes(agentId)) || null;
    }
}

export async function createHouse({ name, quotation, imageFile, ownerId }) {
    if (await getHouseOfAgent(ownerId)) throw new Error('You are already in a house.');
    const { url, fileId } = await uploadAvatar(imageFile);
    return databases.createDocument(DATABASE_ID, HOUSES_COLLECTION_ID, ID.unique(), {
        name,
        quotation: quotation || null,
        image: url,
        imageFileId: fileId,
        ownerId,
        memberIds: [ownerId],
    });
}

export async function leaveHouse(houseId, agentId) {
    const house = await databases.getDocument(DATABASE_ID, HOUSES_COLLECTION_ID, houseId);
    if (house.ownerId === agentId) throw new Error('The owner cannot leave the house — delete it instead.');
    return databases.updateDocument(DATABASE_ID, HOUSES_COLLECTION_ID, houseId, {
        memberIds: (house.memberIds || []).filter(id => id !== agentId),
    });
}

export async function removeMember(houseId, memberId) {
    return leaveHouse(houseId, memberId);
}

// Deletes the house and everything that belongs to it (private forum,
// join requests, expertise requests).
export async function deleteHouse(houseId) {
    for (const collectionId of [HOUSE_REPLIES_COLLECTION_ID, HOUSE_ASKS_COLLECTION_ID, HOUSE_REQUESTS_COLLECTION_ID, EXPERTISE_REQUESTS_COLLECTION_ID]) {
        const docs = await listAll(collectionId, [Query.equal('houseId', houseId)]);
        await Promise.all(docs.map(d => databases.deleteDocument(DATABASE_ID, collectionId, d.$id)));
    }
    await databases.deleteDocument(DATABASE_ID, HOUSES_COLLECTION_ID, houseId);
}

// ── gold badges & ranking ────────────────────────────────────────────

// Same rule as the gold badge on a Community question's comments page:
// among an ask's top-level replies, the most-starred one (≥1 star) wins;
// on a tie, the newest. Returns one entry per ask that has a badge.
export async function getGoldBadges() {
    try {
        // No Query.select: `ask` is a relationship attribute, which Appwrite
        // refuses to select.
        const replies = await listAll('replies', [Query.greaterThan('starCount', 0)]);
        const best = new Map();
        for (const r of replies) {
            if (r.parentReply) continue;
            const askId = typeof r.ask === 'string' ? r.ask : r.ask?.$id;
            if (!askId || !r.agentId) continue;
            const cur = best.get(askId);
            if (!cur
                || r.starCount > cur.starCount
                || (r.starCount === cur.starCount && new Date(r.$createdAt) > new Date(cur.$createdAt))) {
                best.set(askId, r);
            }
        }
        return [...best.entries()].map(([askId, r]) => ({ askId, agentId: r.agentId, replyId: r.$id }));
    } catch (error) {
        console.error('getGoldBadges error:', error);
        return [];
    }
}

// Houses sorted by total gold badges of their current members (badges earned
// before joining count too; a member who leaves takes theirs along).
export function rankHouses(houses, badges) {
    const perAgent = new Map();
    badges.forEach(b => perAgent.set(b.agentId, (perAgent.get(b.agentId) || 0) + 1));
    const scored = houses.map(h => ({
        ...h,
        points: (h.memberIds || []).reduce((sum, id) => sum + (perAgent.get(id) || 0), 0),
    }));
    scored.sort((a, b) => b.points - a.points || new Date(a.$createdAt) - new Date(b.$createdAt));
    return scored.map((h, i) => ({ ...h, rank: i + 1 }));
}

export async function getRankedHouses() {
    const [houses, badges] = await Promise.all([listAllHouses(), getGoldBadges()]);
    return { ranked: rankHouses(houses, badges), badges };
}

// ── join requests ────────────────────────────────────────────────────

export async function createJoinRequest(houseId, agentId, motivation) {
    if (await getHouseOfAgent(agentId)) throw new Error('You are already in a house.');
    const existing = await databases.listDocuments(DATABASE_ID, HOUSE_REQUESTS_COLLECTION_ID, [
        Query.equal('houseId', houseId), Query.equal('agentId', agentId), Query.equal('status', 'pending'), Query.limit(1),
    ]);
    if (existing.documents.length) throw new Error('You already asked to join this house.');
    return databases.createDocument(DATABASE_ID, HOUSE_REQUESTS_COLLECTION_ID, ID.unique(), {
        houseId, agentId, motivation, status: 'pending', seenByOwner: false, seenByRequester: false,
    });
}

export async function listHouseJoinRequests(houseId) {
    try {
        return await listAll(HOUSE_REQUESTS_COLLECTION_ID, [Query.equal('houseId', houseId), Query.orderDesc('$createdAt')]);
    } catch (error) {
        console.error('listHouseJoinRequests error:', error);
        return [];
    }
}

export async function listMyJoinRequests(agentId) {
    try {
        return await listAll(HOUSE_REQUESTS_COLLECTION_ID, [Query.equal('agentId', agentId), Query.orderDesc('$createdAt')]);
    } catch (error) {
        console.error('listMyJoinRequests error:', error);
        return [];
    }
}

// Owner accepts/declines. Accepting re-checks the 10-member cap and that the
// requester hasn't joined another house in the meantime.
export async function respondJoinRequest(requestId, accept) {
    const req = await databases.getDocument(DATABASE_ID, HOUSE_REQUESTS_COLLECTION_ID, requestId);
    if (req.status !== 'pending') return req;
    if (accept) {
        const house = await databases.getDocument(DATABASE_ID, HOUSES_COLLECTION_ID, req.houseId);
        const members = house.memberIds || [];
        if (members.length >= MAX_HOUSE_MEMBERS) throw new Error(`This house already has ${MAX_HOUSE_MEMBERS} members.`);
        const other = await getHouseOfAgent(req.agentId);
        if (other && other.$id !== house.$id) throw new Error('This member already joined another house.');
        if (!members.includes(req.agentId)) {
            await databases.updateDocument(DATABASE_ID, HOUSES_COLLECTION_ID, house.$id, { memberIds: [...members, req.agentId] });
        }
    }
    return databases.updateDocument(DATABASE_ID, HOUSE_REQUESTS_COLLECTION_ID, requestId, {
        status: accept ? 'accepted' : 'declined', seenByOwner: true, seenByRequester: false,
    });
}

export async function markJoinRequestSeen(requestId, field) {
    try {
        await databases.updateDocument(DATABASE_ID, HOUSE_REQUESTS_COLLECTION_ID, requestId, { [field]: true });
    } catch (error) {
        console.error('markJoinRequestSeen error:', error);
    }
}

// ── expertise requests ───────────────────────────────────────────────

export async function createExpertiseRequest({ houseId, requesterId, question, category, reward }) {
    const house = await databases.getDocument(DATABASE_ID, HOUSES_COLLECTION_ID, houseId);
    if ((house.memberIds || []).includes(requesterId)) throw new Error("Members can't ask their own house for expertise.");
    return databases.createDocument(DATABASE_ID, EXPERTISE_REQUESTS_COLLECTION_ID, ID.unique(), {
        houseId, requesterId, question, category, reward: reward || null,
        status: 'pending', requesterConsent: 'waiting', responderConsent: 'waiting',
        seenBy: [], seenByRequester: false,
    });
}

export async function listHouseExpertiseRequests(houseId) {
    try {
        return await listAll(EXPERTISE_REQUESTS_COLLECTION_ID, [Query.equal('houseId', houseId), Query.orderDesc('$createdAt')]);
    } catch (error) {
        console.error('listHouseExpertiseRequests error:', error);
        return [];
    }
}

export async function listMyExpertiseRequests(agentId) {
    try {
        return await listAll(EXPERTISE_REQUESTS_COLLECTION_ID, [Query.equal('requesterId', agentId), Query.orderDesc('$createdAt')]);
    } catch (error) {
        console.error('listMyExpertiseRequests error:', error);
        return [];
    }
}

// First member to answer decides — not a vote. Re-reads the doc so a second
// member answering at the same time doesn't overwrite the first answer.
export async function respondExpertiseRequest(requestId, memberId, accept) {
    const req = await databases.getDocument(DATABASE_ID, EXPERTISE_REQUESTS_COLLECTION_ID, requestId);
    if (req.status !== 'pending') return req;
    return databases.updateDocument(DATABASE_ID, EXPERTISE_REQUESTS_COLLECTION_ID, requestId, {
        status: accept ? 'accepted' : 'declined',
        responderId: memberId,
        seenBy: [...new Set([...(req.seenBy || []), memberId])],
        seenByRequester: false,
    });
}

// After acceptance, requester and responder each confirm (yes/no) that their
// email may be shared. Each side only ever writes its own email, and only on
// "yes"; both yes → 'shared', any no → 'cancelled'.
export async function answerEmailConsent(requestId, role, yes, email) {
    const req = await databases.getDocument(DATABASE_ID, EXPERTISE_REQUESTS_COLLECTION_ID, requestId);
    if (req.status !== 'accepted') return req;
    const patch = role === 'requester'
        ? { requesterConsent: yes ? 'yes' : 'no', requesterEmail: yes ? (email || null) : null }
        : { responderConsent: yes ? 'yes' : 'no', responderEmail: yes ? (email || null) : null };
    const requesterConsent = patch.requesterConsent ?? req.requesterConsent;
    const responderConsent = patch.responderConsent ?? req.responderConsent;
    if (requesterConsent === 'no' || responderConsent === 'no') patch.status = 'cancelled';
    else if (requesterConsent === 'yes' && responderConsent === 'yes') patch.status = 'shared';
    return databases.updateDocument(DATABASE_ID, EXPERTISE_REQUESTS_COLLECTION_ID, requestId, patch);
}

export async function markExpertiseSeenByMember(req, memberId) {
    try {
        if ((req.seenBy || []).includes(memberId)) return;
        await databases.updateDocument(DATABASE_ID, EXPERTISE_REQUESTS_COLLECTION_ID, req.$id, {
            seenBy: [...(req.seenBy || []), memberId],
        });
    } catch (error) {
        console.error('markExpertiseSeenByMember error:', error);
    }
}

export async function markExpertiseSeenByRequester(requestId) {
    try {
        await databases.updateDocument(DATABASE_ID, EXPERTISE_REQUESTS_COLLECTION_ID, requestId, { seenByRequester: true });
    } catch (error) {
        console.error('markExpertiseSeenByRequester error:', error);
    }
}

// ── private forum (house_asks / house_replies) ───────────────────────
// Same shapes as asks/replies, no stars or gold badges.

export async function getHouseAsks(houseId, { limit = 10, offset = 0 } = {}) {
    try {
        const res = await databases.listDocuments(DATABASE_ID, HOUSE_ASKS_COLLECTION_ID, [
            Query.equal('houseId', houseId), Query.orderDesc('$createdAt'), Query.limit(limit + 1), Query.offset(offset),
        ]);
        const hasMore = res.documents.length > limit;
        const docs = hasMore ? res.documents.slice(0, limit) : res.documents;
        const agents = await getAgentsByIds(docs.map(d => d.agent));
        return { items: docs.map(d => ({ ...d, agent: agents.get(d.agent) || null })), hasMore };
    } catch (error) {
        console.error('getHouseAsks error:', error);
        return { items: [], hasMore: false };
    }
}

export async function getHouseAsk(askId) {
    try {
        const doc = await databases.getDocument(DATABASE_ID, HOUSE_ASKS_COLLECTION_ID, askId);
        const agents = await getAgentsByIds([doc.agent]);
        return { ...doc, agent: agents.get(doc.agent) || null };
    } catch (error) {
        console.error('getHouseAsk error:', error);
        return null;
    }
}

export async function createHouseAsk({ houseId, name, description, type, imageFile, agentId }) {
    const data = { houseId, name, description, type, agent: agentId, replyCount: 0 };
    if (imageFile) data.image = (await uploadAvatar(imageFile)).url;
    return databases.createDocument(DATABASE_ID, HOUSE_ASKS_COLLECTION_ID, ID.unique(), data);
}

async function adjustHouseAskReplyCount(askId, delta) {
    const doc = await databases.getDocument(DATABASE_ID, HOUSE_ASKS_COLLECTION_ID, askId);
    const next = Math.max(0, (doc.replyCount ?? 0) + delta);
    await databases.updateDocument(DATABASE_ID, HOUSE_ASKS_COLLECTION_ID, askId, { replyCount: next });
    return next;
}

export async function addHouseReply(askId, houseId, reply, name, avatar, agentId, parentReply = null) {
    const doc = await databases.createDocument(DATABASE_ID, HOUSE_REPLIES_COLLECTION_ID, ID.unique(), {
        ask: askId, houseId, reply, name, avatar, agentId, parentReply,
    });
    const replyCount = await adjustHouseAskReplyCount(askId, 1);
    return { reply: doc, replyCount };
}

export async function deleteHouseReply(replyId) {
    const doc = await databases.getDocument(DATABASE_ID, HOUSE_REPLIES_COLLECTION_ID, replyId);
    await databases.deleteDocument(DATABASE_ID, HOUSE_REPLIES_COLLECTION_ID, replyId);
    return adjustHouseAskReplyCount(doc.ask, -1);
}

export async function getAllHouseReplies(askId) {
    try {
        const docs = await listAll(HOUSE_REPLIES_COLLECTION_ID, [Query.equal('ask', askId), Query.orderDesc('$createdAt')]);
        const agents = await getAgentsByIds(docs.map(d => d.agentId));
        return docs.map(r => {
            const a = agents.get(r.agentId);
            return { ...r, avatar: a?.avatar || r.avatar || null, name: a?.name || r.name || '' };
        });
    } catch (error) {
        console.error('getAllHouseReplies error:', error);
        return [];
    }
}
