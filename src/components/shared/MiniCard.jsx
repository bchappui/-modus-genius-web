import React from 'react'
import './MiniCard.css'

const MiniCard = ({ property, onSelect }) => {
    const { name, background, type } = property;

    return (
        <div className="movie-card" onClick={onSelect}>
            <img src={background || '/no-movie.png'} alt={name} />
            <div className="movie-card-info">
                <h3>{name}</h3>
                {type && <span className="movie-card-type">{type}</span>}
            </div>
        </div>
    )
}

export default MiniCard
