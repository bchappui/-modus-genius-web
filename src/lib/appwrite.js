import { Client, Databases, Query } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const PROPERTIES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PROPERTIES_COLLECTION_ID;
export const AGENTS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_AGENTS_COLLECTION_ID;
export { Query };
