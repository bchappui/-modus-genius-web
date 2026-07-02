import React, { useEffect, useState } from 'react'
import { databases, DATABASE_ID, PROPERTIES_COLLECTION_ID, Query } from '../lib/appwrite.js'
import { enrichWithAgents } from '../lib/properties.js'
import MiniCard from './MiniCard.jsx'
import Spinner from './Spinner.jsx'

const FavoritesPage = ({ favoriteIds, onBack, onSelect }) => {
    const [properties, setProperties] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        if (favoriteIds.length === 0) {
            setProperties([])
            setIsLoading(false)
            return
        }

        const fetchProperties = async () => {
            setIsLoading(true)
            setErrorMessage('')
            try {
                const propsResult = await databases.listDocuments(DATABASE_ID, PROPERTIES_COLLECTION_ID, [
                    Query.equal('$id', favoriteIds),
                    Query.limit(1000),
                ])
                setProperties(await enrichWithAgents(propsResult.documents))
            } catch (error) {
                console.error('Error fetching favorites', error)
                setErrorMessage('Something went wrong')
            } finally {
                setIsLoading(false)
            }
        }

        fetchProperties()
    }, [favoriteIds])

    return (
        <section className="all-movies">
            <button
                onClick={onBack}
                className="text-light-200 text-sm mb-4 hover:text-white transition-colors"
            >
                ← Back
            </button>
            <h2 className="mt-[10px]">My Favorites</h2>
            {isLoading ? (
                <Spinner />
            ) : errorMessage ? (
                <p className="text-red-500">{errorMessage}</p>
            ) : properties.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>You haven't favorited any properties yet.</p>
            ) : (
                <ul>
                    {properties.map(property => (
                        <MiniCard key={property.$id} property={property} onSelect={() => onSelect(property)} />
                    ))}
                </ul>
            )}
        </section>
    )
}

export default FavoritesPage
