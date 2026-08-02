import { Client, Databases, Account, Storage, OAuthProvider, Query, ID } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);
export const storage = new Storage(client);
export { OAuthProvider };
export const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
export const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const PROPERTIES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_PROPERTIES_COLLECTION_ID;
export const AGENTS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_AGENTS_COLLECTION_ID;
export const FAVORITES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_FAVORITES_COLLECTION_ID;
export const LIKES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_LIKES_COLLECTION_ID;
export const REVIEWS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_REVIEWS_COLLECTION_ID;
export const MG_SELECTS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_MG_SELECTS_COLLECTION_ID;
export const AVATARS_BUCKET_ID = import.meta.env.VITE_APPWRITE_AVATARS_BUCKET_ID;
export const GIFTCODES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_GIFTCODES_COLLECTION_ID;
export { Query, ID };
