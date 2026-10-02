import { databases, DATABASE_ID, AGENTS_COLLECTION_ID, Query } from './appwrite.js';
import { COUNTRY_COORDS } from './countryCoords.js';

// Community "questions" world map: public asks placed on their author's
// country (agents.Location — an ask has no country of its own). Same three
// sorts as the forum pills (lib/asks.js getAsks): new / unanswered / popular.
const MAX_QUESTIONS = 300;

async function listAsks(sort) {
    const queries = [];
    if (sort === 'unanswered') queries.push(Query.equal('replyCount', 0));
    queries.push(sort === 'popular' ? Query.orderDesc('totalStarCount') : Query.orderDesc('$createdAt'));
    let docs = [];
    while (docs.length < MAX_QUESTIONS) {
        const res = await databases.listDocuments(DATABASE_ID, 'asks', [
            ...queries, Query.limit(100), Query.offset(docs.length),
        ]);
        docs = docs.concat(res.documents);
        if (res.documents.length < 100) break;
    }
    return docs.slice(0, MAX_QUESTIONS);
}

async function getAuthors(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    const map = new Map();
    for (let i = 0; i < unique.length; i += 100) {
        const chunk = unique.slice(i, i + 100);
        const res = await databases.listDocuments(DATABASE_ID, AGENTS_COLLECTION_ID, [
            Query.equal('$id', chunk), Query.select(['$id', 'name', 'avatar', 'Location']), Query.limit(chunk.length),
        ]);
        res.documents.forEach(a => map.set(a.$id, a));
    }
    return map;
}

// Returns { byCountry: Map<code, question[]>, items: question[] } in the
// order of `sort`; each question { $id, title, avatar, author, country,
// replyCount, stars, createdAt }.
export async function getMapQuestions(sort = 'new') {
    try {
        const asks = await listAsks(sort);
        const authorIdOf = (a) => (typeof a.agent === 'object' && a.agent !== null ? a.agent.$id : a.agent);
        const authors = await getAuthors(asks.map(authorIdOf));
        const items = asks
            .map(a => {
                const author = authors.get(authorIdOf(a));
                return {
                    $id: a.$id,
                    title: a.name || 'Question',
                    avatar: author?.avatar || '',
                    author: author?.name || 'Member',
                    country: author?.Location || null,
                    replyCount: a.replyCount ?? 0,
                    stars: a.totalStarCount ?? 0,
                    createdAt: a.$createdAt,
                };
            })
            .filter(q => q.country && COUNTRY_COORDS[q.country]);
        const byCountry = new Map();
        items.forEach(q => {
            if (!byCountry.has(q.country)) byCountry.set(q.country, []);
            byCountry.get(q.country).push(q);
        });
        return { byCountry, items };
    } catch (error) {
        console.error('getMapQuestions error:', error);
        return { byCountry: new Map(), items: [] };
    }
}
