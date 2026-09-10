import React from 'react'
import { FiSearch } from 'react-icons/fi'
import Spinner from '../shared/Spinner.jsx'
import './SearchModal.css'

const SearchModal = ({ searchTerm, onSearchChange, movieList, isLoading, errorMessage, onSelectProperty, onClose }) => {
    return (
        <div className="sem-overlay" onClick={onClose}>
            <div className="sem-panel" onClick={e => e.stopPropagation()}>
                <div className="sem-search-row">
                    <FiSearch size={18} className="sem-search-icon" />
                    <input
                        className="sem-search-input"
                        autoFocus
                        placeholder="Search Cards"
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </div>

                <div className="sem-results">
                    {!searchTerm ? (
                        <p className="sem-hint">Start typing to search cards.</p>
                    ) : (
                        <>
                            <h3 className="sem-section-title">Cards</h3>
                            {isLoading ? (
                                <Spinner />
                            ) : errorMessage ? (
                                <p className="sem-error">{errorMessage}</p>
                            ) : movieList.length === 0 ? (
                                <p className="sem-empty">No cards found.</p>
                            ) : (
                                <div className="sem-cards-grid">
                                    {movieList.map(property => (
                                        <button
                                            key={property.$id}
                                            className="sem-card-item"
                                            onClick={() => { onSelectProperty(property); onClose(); }}
                                        >
                                            <img src={property.background || '/no-movie.png'} alt="" className="sem-card-img" />
                                            <div className="sem-card-overlay" />
                                            <span className="sem-card-name">{property.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SearchModal
