import React, { useState, useEffect } from 'react'
import MembershipStep1 from './MembershipStep1.jsx'
import MembershipStep2 from './MembershipStep2.jsx'
import MembershipStep3 from './MembershipStep3.jsx'
import { getTier } from '../../lib/membership.js'

// 3-step membership wizard: Step 1 (create an account) only shows while
// logged out — clicking "Membership" while already logged in skips straight
// to Step 2. Step 2's plan choice carries into Step 3 as local state and
// isn't applied to the account until Step 3's "Complete membership" (no
// payment processor wired up yet, so that's also where it activates the
// plan in test mode).
const SubscribePage = ({
    onBack, onLoginClick, isLoggedIn, onAccountCreated, onSelectTier,
    onGoHome, onGoToExplore, onShowGenius, onShowQuotes, onShowNewsletter,
    onShowCreate, onShowFavorites, onLogout, agentAvatar, onOpenProfile,
    searchTerm, onSearchChange, movieList, isLoading, errorMessage, onSelectProperty,
}) => {
    const [step, setStep] = useState(isLoggedIn ? 2 : 1);
    const [pendingTier, setPendingTier] = useState('extra');

    useEffect(() => {
        if (isLoggedIn && step === 1) setStep(2);
    }, [isLoggedIn]);

    if (step === 1) {
        return (
            <MembershipStep1
                onAccountCreated={() => { onAccountCreated(); setStep(2); }}
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius}
                onShowQuotes={onShowQuotes} onShowNewsletter={onShowNewsletter} onShowCreate={onShowCreate}
                onShowFavorites={onShowFavorites} onLogout={onLogout} agentAvatar={agentAvatar}
                onOpenProfile={onOpenProfile}
                searchTerm={searchTerm} onSearchChange={onSearchChange} movieList={movieList}
                isLoading={isLoading} errorMessage={errorMessage} onSelectProperty={onSelectProperty}
            />
        );
    }

    if (step === 2) {
        return (
            <MembershipStep2
                onBack={onBack}
                onLoginClick={onLoginClick}
                isLoggedIn={isLoggedIn}
                onContinue={(tierKey) => { setPendingTier(tierKey); setStep(3); }}
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius}
                onShowQuotes={onShowQuotes} onShowNewsletter={onShowNewsletter} onShowCreate={onShowCreate}
                onShowFavorites={onShowFavorites} onLogout={onLogout} agentAvatar={agentAvatar}
                onOpenProfile={onOpenProfile}
                searchTerm={searchTerm} onSearchChange={onSearchChange} movieList={movieList}
                isLoading={isLoading} errorMessage={errorMessage} onSelectProperty={onSelectProperty}
            />
        );
    }

    return (
        <MembershipStep3
            onBack={onBack}
            tierLabel={getTier(pendingTier).label}
            onComplete={() => { onSelectTier(pendingTier); onBack(); }}
        />
    );
};

export default SubscribePage
