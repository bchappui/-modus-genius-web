// Mirrors modus_genius/lib/appwrite/discover.ts — same Appwrite backend, so the
// same "Top 10" (most-liked this week) and personalized hashtag ranking logic
// applies unchanged.
import {
    databases, DATABASE_ID, LIKES_COLLECTION_ID, FAVORITES_COLLECTION_ID,
    PROPERTIES_COLLECTION_ID, MG_SELECTS_COLLECTION_ID, Query,
} from './appwrite.js';
import { getPropertiesByIds, enrichWithAgents } from './properties.js';

const HASHTAGS_COLLECTION_ID = 'hashtags';
const PROPERTY_HASHTAGS_COLLECTION_ID = 'property_hashtags';

function getCurrentWeekWindow() {
    const now = new Date();
    const end = new Date(now);
    end.setUTCHours(1, 0, 0, 0);
    const day = end.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    end.setUTCDate(end.getUTCDate() - diffToMonday);
    if (end > now) end.setUTCDate(end.getUTCDate() - 7);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 7);
    return { start, end };
}

async function fetchAllDocuments(collectionId, queries) {
    let allDocs = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
        const res = await databases.listDocuments(DATABASE_ID, collectionId, [
            ...queries, Query.limit(limit), Query.offset(offset),
        ]);
        allDocs = allDocs.concat(res.documents);
        if (res.documents.length < limit) break;
        offset += limit;
    }
    return allDocs;
}

function aggregateTopPropertyIds(docs, topN) {
    const counts = {};
    for (const doc of docs) {
        const pid = doc.propertyId;
        if (pid) counts[pid] = (counts[pid] || 0) + 1;
    }
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([id]) => id);
}

// Most-liked properties in the current week (Monday 1am UTC window).
export async function getTop10Properties() {
    try {
        const { start, end } = getCurrentWeekWindow();
        const docs = await fetchAllDocuments(LIKES_COLLECTION_ID, [
            Query.greaterThanEqual('$createdAt', start.toISOString()),
            Query.lessThan('$createdAt', end.toISOString()),
        ]);
        const topIds = aggregateTopPropertyIds(docs, 10);
        if (!topIds.length) return [];
        const properties = await getPropertiesByIds(topIds);
        const map = new Map(properties.map(p => [p.$id, p]));
        return topIds.map(id => map.get(id)).filter(Boolean);
    } catch (e) {
        console.error('getTop10Properties error', e);
        return [];
    }
}

// Most-liked properties 1-2 months ago ("In Case You Missed It").
export async function getMissedProperties() {
    try {
        const now = new Date();
        const twoMonthsAgo = new Date(now);
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const docs = await fetchAllDocuments(LIKES_COLLECTION_ID, [
            Query.greaterThanEqual('$createdAt', twoMonthsAgo.toISOString()),
            Query.lessThan('$createdAt', oneMonthAgo.toISOString()),
        ]);
        const topIds = aggregateTopPropertyIds(docs, 10);
        if (!topIds.length) return [];
        const properties = await getPropertiesByIds(topIds);
        const map = new Map(properties.map(p => [p.$id, p]));
        return topIds.map(id => map.get(id)).filter(Boolean);
    } catch (e) {
        console.error('getMissedProperties error', e);
        return [];
    }
}

// Most-favorited properties this week ("Most Wanted").
export async function getMostWantedProperties() {
    try {
        const { start, end } = getCurrentWeekWindow();
        const docs = await fetchAllDocuments(FAVORITES_COLLECTION_ID, [
            Query.greaterThanEqual('$createdAt', start.toISOString()),
            Query.lessThan('$createdAt', end.toISOString()),
        ]);
        const topIds = aggregateTopPropertyIds(docs, 10);
        if (!topIds.length) return [];
        const properties = await getPropertiesByIds(topIds);
        const map = new Map(properties.map(p => [p.$id, p]));
        return topIds.map(id => map.get(id)).filter(Boolean);
    } catch (e) {
        console.error('getMostWantedProperties error', e);
        return [];
    }
}

// Most-liked properties from the previous calendar year ("Classics").
export async function getClassicsProperties() {
    try {
        const now = new Date();
        const prevYear = now.getUTCFullYear() - 1;
        const start = new Date(Date.UTC(prevYear, 0, 1));
        const end = new Date(Date.UTC(prevYear, 11, 31, 23, 59, 59, 999));
        const docs = await fetchAllDocuments(LIKES_COLLECTION_ID, [
            Query.greaterThanEqual('$createdAt', start.toISOString()),
            Query.lessThanEqual('$createdAt', end.toISOString()),
        ]);
        const topIds = aggregateTopPropertyIds(docs, 10);
        if (!topIds.length) return [];
        const properties = await getPropertiesByIds(topIds);
        const map = new Map(properties.map(p => [p.$id, p]));
        return topIds.map(id => map.get(id)).filter(Boolean);
    } catch (e) {
        console.error('getClassicsProperties error', e);
        return [];
    }
}

// Newest properties ("New In").
export async function getNewProperties() {
    try {
        const result = await databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [
            Query.orderDesc('$createdAt'), Query.limit(10),
        ]);
        return enrichWithAgents(result.documents);
    } catch (e) {
        console.error('getNewProperties error', e);
        return [];
    }
}

// Manually curated selection, ordered by the "order" field ("MG Selects").
export async function getMGSelectsProperties() {
    try {
        const result = await databases.listDocuments(DATABASE_ID, MG_SELECTS_COLLECTION_ID, [
            Query.orderAsc('order'), Query.limit(100),
        ]);
        const ids = result.documents.map(d => d.propertyId);
        if (!ids.length) return [];
        const properties = await getPropertiesByIds(ids);
        const map = new Map(properties.map(p => [p.$id, p]));
        return ids.map(id => map.get(id)).filter(Boolean);
    } catch (e) {
        console.error('getMGSelectsProperties error', e);
        return [];
    }
}

// Up to 9 hashtags ranked by how often this user liked properties tagged with
// each one. Cumulative stacking: 7-day likes first, then 8-30 day likes fill
// remaining slots, then all-time fills the rest.
export async function getUserTopHashtags(userId) {
    const MAX_HASHTAGS = 9;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const result = [];
    const seenHashtagIds = new Set();

    async function getLikedPropertyIds(dateQueries) {
        const allPropertyIds = [];
        let offset = 0;
        const batchSize = 100;
        while (true) {
            const res = await databases.listDocuments(DATABASE_ID, LIKES_COLLECTION_ID, [
                Query.equal('userId', userId),
                ...dateQueries,
                Query.select(['propertyId']),
                Query.limit(batchSize),
                Query.offset(offset),
            ]);
            for (const doc of res.documents) allPropertyIds.push(doc.propertyId);
            if (res.documents.length < batchSize) break;
            offset += batchSize;
        }
        return allPropertyIds;
    }

    async function getHashtagTallies(propertyIds) {
        if (propertyIds.length === 0) return new Map();
        const tallies = new Map();
        const BATCH = 100;
        for (let i = 0; i < propertyIds.length; i += BATCH) {
            const batch = propertyIds.slice(i, i + BATCH);
            const queries = batch.length === 1
                ? [Query.equal('propertyId', batch[0]), Query.limit(1000)]
                : [Query.or(batch.map(id => Query.equal('propertyId', id))), Query.limit(1000)];
            const res = await databases.listDocuments(DATABASE_ID, PROPERTY_HASHTAGS_COLLECTION_ID, queries);
            for (const doc of res.documents) {
                tallies.set(doc.hashtagId, (tallies.get(doc.hashtagId) || 0) + 1);
            }
        }
        return tallies;
    }

    function addNewHashtags(tallies) {
        const sorted = [...tallies.entries()]
            .filter(([id]) => !seenHashtagIds.has(id))
            .sort((a, b) => b[1] - a[1]);
        for (const [hashtagId, count] of sorted) {
            if (result.length >= MAX_HASHTAGS) break;
            seenHashtagIds.add(hashtagId);
            result.push({ hashtagId, count });
        }
    }

    try {
        const pass1Ids = await getLikedPropertyIds([Query.greaterThanEqual('$createdAt', sevenDaysAgo)]);
        addNewHashtags(await getHashtagTallies(pass1Ids));

        if (result.length < MAX_HASHTAGS) {
            const pass2Ids = await getLikedPropertyIds([
                Query.greaterThanEqual('$createdAt', thirtyDaysAgo),
                Query.lessThan('$createdAt', sevenDaysAgo),
            ]);
            addNewHashtags(await getHashtagTallies(pass2Ids));
        }

        if (result.length < MAX_HASHTAGS) {
            const pass3Ids = await getLikedPropertyIds([Query.lessThan('$createdAt', thirtyDaysAgo)]);
            addNewHashtags(await getHashtagTallies(pass3Ids));
        }

        if (result.length === 0) return [];

        const hashtagIdsToFetch = result.map(r => r.hashtagId);
        const hashtagQueries = hashtagIdsToFetch.length === 1
            ? [Query.equal('$id', hashtagIdsToFetch[0])]
            : [Query.or(hashtagIdsToFetch.map(id => Query.equal('$id', id)))];

        const hashtagDocs = await databases.listDocuments(DATABASE_ID, HASHTAGS_COLLECTION_ID, hashtagQueries);
        const nameMap = new Map(hashtagDocs.documents.map(d => [d.$id, d.name]));

        return result
            .filter(r => nameMap.has(r.hashtagId))
            .map(r => ({ hashtagId: r.hashtagId, hashtagName: nameMap.get(r.hashtagId), count: r.count }));
    } catch (e) {
        console.error('getUserTopHashtags error', e);
        return [];
    }
}

export async function getPropertiesByHashtags({ hashtagIds, limit = 20, offset = 0 }) {
    if (!hashtagIds || hashtagIds.length === 0) return { items: [], hasMore: false };
    try {
        const queries = hashtagIds.length === 1
            ? [Query.equal('hashtagId', hashtagIds[0])]
            : [Query.or(hashtagIds.map(id => Query.equal('hashtagId', id)))];

        const links = await databases.listDocuments(DATABASE_ID, PROPERTY_HASHTAGS_COLLECTION_ID, queries);
        const propertyIds = [...new Set(links.documents.map(doc => doc.propertyId))];
        if (propertyIds.length === 0) return { items: [], hasMore: false };

        const paginatedIds = propertyIds.slice(offset, offset + limit + 1);
        const hasMore = paginatedIds.length > limit;
        const idsToFetch = hasMore ? paginatedIds.slice(0, limit) : paginatedIds;
        if (idsToFetch.length === 0) return { items: [], hasMore: false };

        const properties = await getPropertiesByIds(idsToFetch);
        return { items: properties, hasMore };
    } catch (e) {
        console.error('getPropertiesByHashtags error', e);
        return { items: [], hasMore: false };
    }
}
