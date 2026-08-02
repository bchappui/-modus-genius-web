import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { account, OAuthProvider } from '../lib/appwrite.js'
import { ID } from 'appwrite'
import { findRedeemableGiftCodeForProperty, giftCodeErrorMessage } from '../lib/giftcodes.js'
import './ExitIntentModal.css'
import './LoginPage.css'

const googleOAuth = () => {
    account.createOAuth2Session(
        OAuthProvider.Google,
        `${window.location.origin}/`,
        `${window.location.origin}/`
    )
}

// Same dark modal chrome as ExitIntentModal, two steps:
// 'gate'  — "Members only" message + gift code field, or a way into 'login'.
// 'login' — LoginPage's actual email/password + Google + signup flow,
//           embedded directly (not a navigation to LoginPage) so the card the
//           visitor was trying to open can be restored via the ?property=/
//           ?quote= deep-link params right after onLoginSuccess, instead of
//           dropping them back on the Home page.
const AuthRequiredModal = ({ onClose, onLoginSuccess }) => {
    const [step, setStep] = useState('gate'); // 'gate' | 'login'

    // ── Gift code (gate step) ──
    const [giftCode, setGiftCode] = useState('');
    const [giftError, setGiftError] = useState('');
    const [giftLoading, setGiftLoading] = useState(false);
    const [giftCodeAccepted, setGiftCodeAccepted] = useState(false);

    // ── Login form (login step) ──
    const [view, setView] = useState('email') // 'email' | 'password' | 'signup' | 'signup-password'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const nav = (v) => { setView(v); setError('') }

    const handleRedeemGiftCode = async (e) => {
        e.preventDefault();
        setGiftError('');
        setGiftLoading(true);
        try {
            // The pending card is already in the URL — requireAuthForProperty
            // (App.jsx) stashes it as ?property=<id> before this modal opens.
            const propertyId = new URLSearchParams(window.location.search).get('property');
            const { doc, error: giftCodeError } = await findRedeemableGiftCodeForProperty(giftCode, propertyId);
            if (giftCodeError) { setGiftError(giftCodeErrorMessage(giftCodeError)); return; }
            // Stashed as a URL param (not just component state) so it survives
            // Google OAuth's full-page redirect too — redeemed once the
            // resulting agent id is known, by the same effect in App.jsx that
            // restores ?property=/?quote= deep links after login.
            const url = new URL(window.location.href);
            url.searchParams.set('giftcode', doc.$id);
            window.history.replaceState(null, '', url);
            setGiftCodeAccepted(true);
            setStep('login');
        } catch (e) {
            console.error('Error validating gift code', e);
            setGiftError('Could not validate code.');
        } finally {
            setGiftLoading(false);
        }
    };

    const handleContinue = async () => {
        setError('')

        if (view === 'email') {
            googleOAuth()
            return
        }

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

        if (view === 'signup') {
            if (!email) return setError('Please enter your email.')
            nav('signup-password')
            return
        }

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

    if (step === 'gate') {
        return (
            <div className="eim-overlay" onClick={onClose}>
                <div className="eim-panel" onClick={e => e.stopPropagation()}>
                    <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                        <FiX size={18} />
                    </button>

                    <p className="eim-eyebrow">Members only</p>

                    <form className="lp-form" style={{ width: '100%' }} onSubmit={handleRedeemGiftCode}>
                        <input
                            className="lp-input"
                            placeholder="Gift code"
                            value={giftCode}
                            onChange={e => { setGiftCode(e.target.value); setGiftError(''); }}
                        />
                        {giftError && <p className="lp-error">{giftError}</p>}
                        <button type="submit" className="lp-continue-btn" disabled={giftLoading || !giftCode.trim()}>
                            {giftLoading ? '...' : 'UNLOCK CARD'}
                        </button>
                    </form>

                    <button className="lp-continue-btn" style={{ marginTop: 14 }} onClick={() => setStep('login')}>
                        Log in
                    </button>

                    <div className="lp-footer">
                        First time here?{' '}
                        <button className="lp-link-strong" onClick={() => { setStep('login'); nav('signup'); }}>
                            Create an account
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="eim-overlay" onClick={onClose}>
            <div className="eim-panel" onClick={e => e.stopPropagation()}>
                <button className="eim-close-btn" onClick={onClose} aria-label="Close">
                    <FiX size={18} />
                </button>

                <p className="eim-eyebrow">Members only</p>
                <h3 className="eim-headline">{isSignup ? 'CREATE AN ACCOUNT' : 'Log in to continue'}</h3>
                {giftCodeAccepted && (
                    <p className="eim-subtext">Code accepted — log in or create an account to unlock it.</p>
                )}

                <div className="lp-form" style={{ width: '100%' }}>
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
    );
};

export default AuthRequiredModal;
