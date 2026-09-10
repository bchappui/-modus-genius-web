import React, { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { account, OAuthProvider } from '../../lib/appwrite.js'
import { ID } from 'appwrite'
import SearchModal from '../modals/SearchModal.jsx'
import './ExplorePage.css'
import './LoginPage.css'

const LOGO_TEXT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a0f7948002dedb124ca/view?project=693e8acd001582e2562a';
const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';
const NAV_BG_URL    = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c800035bdea516f/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';

const googleOAuth = () => {
    account.createOAuth2Session(
        OAuthProvider.Google,
        `${window.location.origin}/`,
        `${window.location.origin}/`
    )
}

const LoginPage = ({
    onLoginSuccess, onBack, onGoHome, onGoToExplore, onShowGenius, onShowQuotes, onShowNewsletter, onShowCreate,
    searchTerm, onSearchChange, movieList, isLoading: searchLoading, errorMessage, onSelectProperty,
}) => {
    // views: 'email' | 'password' | 'signup' | 'signup-password'
    const [view, setView] = useState('email')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [searchModalOpen, setSearchModalOpen] = useState(false)

    const nav = (v) => { setView(v); setError('') }

    const handleContinue = async () => {
        setError('')

        // Login step 1 → Google OAuth
        if (view === 'email') {
            googleOAuth()
            return
        }

        // Login step 2 → sign in with email + password
        if (view === 'password') {
            if (!email || !password) return setError('Please enter your email and password.')
            setIsLoading(true)
            try {
                await account.createEmailPasswordSession(email, password)
                onLoginSuccess()
            } catch (e) {
                console.error('Login error:', e)
                setError(e.message || 'Invalid email or password.')
            } finally {
                setIsLoading(false)
            }
            return
        }

        // Signup step 1 → go to password step
        if (view === 'signup') {
            if (!email) return setError('Please enter your email.')
            nav('signup-password')
            return
        }

        // Signup step 2 → create account
        if (view === 'signup-password') {
            if (!password) return setError('Please choose a password.')
            setIsLoading(true)
            try {
                await account.create(ID.unique(), email, password)
                await account.createEmailPasswordSession(email, password)
                onLoginSuccess()
            } catch (e) {
                console.error('Signup error:', e)
                setError(e.message || 'Could not create account.')
            } finally {
                setIsLoading(false)
            }
        }
    }

    const isSignup = view === 'signup' || view === 'signup-password'

    return (
        <div className="ep-page">

            {/* ── DECORATIVE TOP NAV — same as ExplorePage, purely visual here (not logged in yet) ── */}
            <div className="ep-nav" style={{ backgroundImage: `url(${NAV_BG_URL})` }}>
                <button className="ep-nav-logo lp-logo-btn" onClick={onBack} aria-label="Back">
                    <img src={LOGO_TEXT_URL} alt="Modus Genius" className="ep-nav-logo-img" />
                    <span className="ep-nav-tagline">Your Expertise&nbsp;&nbsp;|&nbsp;&nbsp;Our Collection</span>
                </button>
                <nav className="ep-nav-links">
                    <button className="ep-nav-link ep-nav-link-btn" onClick={onGoHome}>Home</button>
                    <button className="ep-nav-link ep-nav-link-btn" onClick={onGoToExplore}>Explore</button>
                    <button className="ep-nav-link ep-nav-link-btn" onClick={onShowGenius}>Genius</button>
                    <button className="ep-nav-link ep-nav-link-btn" onClick={onShowQuotes}>Quotes</button>
                    <button className="ep-nav-link ep-nav-link-btn" onClick={onShowNewsletter}>Newsletter</button>
                </nav>
                <div className="ep-nav-right">
                    <button className="ep-nav-create" onClick={onShowCreate}>+ Create</button>
                    <span className="ep-nav-login ep-nav-login--active">Login</span>
                    <span className="ep-nav-membership">Membership</span>
                    <button className="ep-nav-search-btn" onClick={() => setSearchModalOpen(true)} aria-label="Search">
                        <FiSearch size={18} className="ep-nav-search-icon" />
                    </button>
                </div>
            </div>

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

            {/* ── HERO ── */}
            <div className="ep-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="lp-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#lp-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="lp-form-wrap">
                    <h1 className="lp-heading">
                        <span className="lp-heading-gradient">Log in to</span>
                        <img src={LOGO_TEXT_URL} alt="Modus Genius" className="lp-heading-logo" />
                    </h1>

                    <div className="lp-form">
                        <input
                            className="lp-input"
                            placeholder="Email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleContinue()}
                            readOnly={view === 'signup-password'}
                        />

                        {(view === 'password' || view === 'signup-password') && (
                            <input
                                className="lp-input"
                                placeholder="Password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleContinue()}
                                autoFocus
                            />
                        )}

                        <div className="lp-link-row">
                            {view === 'email' && (
                                <button className="lp-link" onClick={() => nav('password')}>
                                    Log in with password
                                </button>
                            )}
                            {view === 'password' && (
                                <button className="lp-link" onClick={() => nav('email')}>
                                    Log in with Google
                                </button>
                            )}
                            {view === 'signup' && (
                                <button className="lp-link" onClick={googleOAuth}>
                                    Sign up with Google
                                </button>
                            )}
                            {view === 'signup-password' && (
                                <button className="lp-link" onClick={() => nav('signup')}>
                                    Change email
                                </button>
                            )}
                        </div>

                        {error && <p className="lp-error">{error}</p>}

                        <button className="lp-continue-btn" onClick={handleContinue} disabled={isLoading}>
                            {isLoading ? '...' : 'CONTINUE'}
                        </button>
                    </div>

                    <div className="lp-footer">
                        {isSignup ? (
                            <>Already have an account?{' '}
                                <button className="lp-link-strong" onClick={() => nav('email')}>
                                    Log in
                                </button>
                            </>
                        ) : (
                            <>First time here?{' '}
                                <button className="lp-link-strong" onClick={() => nav('signup')}>
                                    Create an account
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
