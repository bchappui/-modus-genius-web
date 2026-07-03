import { databases, DATABASE_ID, PROPERTIES_COLLECTION_ID, AGENTS_COLLECTION_ID, Query } from './appwrite.js';

export const enrichWithAgents = async (documents) => {
    return Promise.all(
        documents.map(async (prop) => {
            const raw = prop.agent;
            if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.name) return prop;
            if (Array.isArray(raw) && raw[0]?.name) return { ...prop, agent: raw[0] };
            const agentId = typeof raw === 'string' ? raw : (raw?.$id ?? (Array.isArray(raw) ? raw[0]?.$id : null));
            if (agentId && AGENTS_COLLECTION_ID) {
                try {
                    const agentDoc = await databases.getDocument(DATABASE_ID, AGENTS_COLLECTION_ID, agentId);
                    return { ...prop, agent: agentDoc };
                } catch (e) {}
            }
            return prop;
        })
    );
};

export const getPropertiesByIds = async (ids) => {
    if (!ids.length) return [];
    try {
        const result = await databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [
            Query.equal('$id', ids),
            Query.limit(ids.length),
        ]);
        return enrichWithAgents(result.documents);
    } catch (e) {
        console.error('getPropertiesByIds error', e);
        return [];
    }
};
