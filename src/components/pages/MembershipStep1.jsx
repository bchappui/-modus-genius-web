import React, { useState } from 'react'
import { account } from '../../lib/appwrite.js'
import { ID } from 'appwrite'
import TopNav from '../shared/TopNav.jsx'
import SearchModal from '../modals/SearchModal.jsx'
import './ExplorePage.css'
import './LoginPage.css'
import './MembershipWizard.css'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';
const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

// Membership wizard, step 1 of 3 — reached by clicking "Membership" while
// logged out. Combined email+password signup (no Google/login-instead
// options, unlike the general LoginPage) since intent here is already clear:
// start a membership. Successful signup hands off to Step 2 via onAccountCreated.
const MembershipStep1 = ({
    onAccountCreated, onGoHome, onGoToExplore, onShowGenius, onShowQuotes, onShowNewsletter,
    onShowCreate, onShowFavorites, onLogout, agentAvatar, onOpenProfile,
    searchTerm, onSearchChange, movieList, isLoading: searchLoading, errorMessage, onSelectProperty,
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchModalOpen, setSearchModalOpen] = useState(false);

    const handleContinue = async () => {
        if (!email || !password) { setError('Please enter your email and password.'); return; }
        setError('');
        setIsLoading(true);
        try {
            await account.create(ID.unique(), email, password);
            await account.createEmailPasswordSession(email, password);
            onAccountCreated();
        } catch (e) {
            console.error('Signup error:', e);
            setError(e.message || 'Could not create account.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ep-page">
            <TopNav
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius}
                onShowQuotes={onShowQuotes} onShowNewsletter={onShowNewsletter}
                onShowCreate={onShowCreate} onShowFavorites={onShowFavorites} onShowSubscribe={() => {}}
                onLogout={onLogout} isLoggedIn={false}
                agentAvatar={agentAvatar} onOpenProfile={onOpenProfile}
                onOpenSearch={() => setSearchModalOpen(true)}
            />

            {searchModalOpen && (
                <SearchModal
                    searchTerm={searchTerm}
                    onSearchChange={onSearchChange}
                    movieList={movieList}
                    isLoading={searchLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={onSelectProperty}
                    onClose={() => setSearchModalOpen(false)}
                />
            )}

            <div className="ep-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="mw1-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#mw1-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="mw-step-content">
                    <p className="mw-step-label">Step 1 of 3</p>
                    <h1 className="mw-step-heading">Create a password to start your membership</h1>
                    <p className="mw-step-subtext">
                        Just a few more steps and you're done!<br />We hate paperwork, too.
                    </p>

                    <div className="lp-form" style={{ maxWidth: 480 }}>
                        <input
                            className="lp-input"
                            placeholder="Email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleContinue()}
                        />
                        <input
                            className="lp-input"
                            placeholder="Password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleContinue()}
                        />
                        {error && <p className="lp-error">{error}</p>}
                        <button className="mw-continue-btn" onClick={handleContinue} disabled={isLoading}>
                            {isLoading ? '...' : 'Continue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MembershipStep1;
