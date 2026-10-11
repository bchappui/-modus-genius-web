import React, { useState } from 'react'
import SelfAssessmentLearningTrack from './SelfAssessmentLearningTrack.jsx'

// Page shown after "Redeem your deck" on a learning plan deck: the deck's
// box, its name and how the Learning Track works (one card a day, badge at
// the end), then the Learning Track below the scroll arrow. Right after
// "Unlock All Cards Now", the same page shows every card in a grid instead
// (coming back to the deck always opens the path again).
const SelfAssessmentDeck = ({ deck, agentId, onOpenCard }) => {
    const [gridView, setGridView] = useState(false);
    return (
        <section className={`sa-results sa-deck-page${gridView ? ' sa-deck-page--all' : ''}`}>
            {deck.image && <img src={deck.image} alt="" className="sa-deck-page-box" />}
            <h1 className="sa-benefit-title sa-deck-page-name">{deck.name}</h1>
            <p className="ep-subtext sa-deck-page-text">
                {gridView
                    ? 'Scroll down to explore all the cards of this deck. They are all unlocked, so you can learn at your own pace.'
                    : 'Scroll down to explore the Learning Track. A new card unlocks each day. Upon completing the learning program, you will receive a shareable digital badge.'}
            </p>
            <svg className="sa-scroll-hint sa-blink" viewBox="0 0 64 64" aria-hidden="true">
                <path d="M12 10 L32 26 L52 10" />
                <path d="M12 34 L32 50 L52 34" />
            </svg>
            <SelfAssessmentLearningTrack
                deck={deck}
                agentId={agentId}
                onOpenCard={onOpenCard}
                onGridViewChange={setGridView}
            />
        </section>
    );
};

export default SelfAssessmentDeck;
