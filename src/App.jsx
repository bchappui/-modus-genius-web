import React, { useEffect, useState } from 'react'
import Search from "./components/Search.jsx";
import Spinner from "./components/Spinner.jsx";
import { databases, DATABASE_ID, PROPERTIES_COLLECTION_ID, AGENTS_COLLECTION_ID, Query } from './lib/appwrite.js';
import MovieCard from "./components/MovieCard.jsx";
import PropertyModal from "./components/PropertyModal.jsx";

const App = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [movieList, setMovieList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);

    const fetchMovies = async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
            const result = await databases.listDocuments(
                DATABASE_ID,
                PROPERTIES_COLLECTION_ID,
                [Query.orderDesc('$createdAt')]
            );

            // Debug: show what the first property's agent field looks like
            if (result.documents.length > 0) {
                const s = result.documents[0];
                console.log('[DEBUG] property keys:', Object.keys(s));
                console.log('[DEBUG] property.agent raw:', s.agent);
            }

            // Appwrite may return agent as: full object, array, null, or just an ID string.
            // If it's null or a bare string (ID only), fetch the agent document manually.
            const enriched = await Promise.all(
                result.documents.map(async (prop) => {
                    const raw = prop.agent;
                    // Already a proper object with a name field → use as-is
                    if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.name) {
                        return prop;
                    }
                    // Array → use first element if it has a name
                    if (Array.isArray(raw) && raw[0]?.name) {
                        return { ...prop, agent: raw[0] };
                    }
                    // Resolve agent ID: could be a string ID, an object with only $id, or an array with $id
                    const agentId = typeof raw === 'string'
                        ? raw
                        : (raw?.$id ?? (Array.isArray(raw) ? raw[0]?.$id : null));

                    if (agentId && AGENTS_COLLECTION_ID) {
                        try {
                            const agentDoc = await databases.getDocument(
                                DATABASE_ID,
                                AGENTS_COLLECTION_ID,
                                agentId
                            );
                            return { ...prop, agent: agentDoc };
                        } catch (e) {
                            console.warn('[DEBUG] Could not fetch agent', agentId, e.message);
                        }
                    }
                    return prop;
                })
            );

            setMovieList(enriched);
        } catch (error) {
            console.error(`Error fetching properties: ${error}`);
            setErrorMessage('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchMovies();
    }, []);

    return (
        <main>
            <div className="pattern" />
            <div className={"wrapper"}>
                <header>
                    <img src="./favicon.svg" alt="Hero Banner"/>
                    <h1>Find <span className="text-gradient">Movies</span> You'll Enjoy Without the Hassle</h1>
                    <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                </header>
                <section className="all-movies">
                    <h2 className="mt-[40px]">All Movies</h2>
                    {isLoading ? (
                        <Spinner/>
                    ) : errorMessage ? (
                        <p className="text-red-500">{errorMessage}</p>
                    ) : (
                        <ul>
                            {movieList.map((property) => (
                                <MovieCard key={property.$id} property={property} onSelect={() => setSelectedProperty(property)} />
                            ))}
                        </ul>
                    )}
                </section>
                <h1 className="text-white">{searchTerm}</h1>
            </div>
            <PropertyModal property={selectedProperty} onClose={() => setSelectedProperty(null)} />
        </main>
    )
}
export default App
