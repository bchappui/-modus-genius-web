import React from 'react'
import { FiX, FiSearch } from 'react-icons/fi'
import Spinner from '../shared/Spinner.jsx'
import './SearchModal.css'

// Mirrors CreateModal's gloss header-bar/gradient-title styling so the
// search modal matches the rest of this app's overlay design language.
const SearchModal = ({ searchTerm, onSearchChange, movieList, isLoading, errorMessage, onSelectProperty, onClose }) => {
    return (
        <div className="sem-overlay" onClick={onClose}>
            <div className="sem-panel" onClick={e => e.stopPropagation()}>
                <div className="sem-scroll">
                    <div className="sem-header-bar">
                        <button className="sem-close-btn" onClick={onClose} aria-label="Close">
                            <FiX size={22} color="rgb(137,162,189)" />
                        </button>
                        <div className="sem-header-title">
                            <FiSearch size={20} color="rgb(65,120,188)" />
                            <span className="sem-header-text">SEARCH CARDS</span>
                        </div>
                    </div>

                    <div className="sem-input-wrap">
                        <FiSearch size={17} className="sem-search-icon" />
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
                                <span className="sem-label">Cards</span>
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
        </div>
    )
}

export default SearchModal
