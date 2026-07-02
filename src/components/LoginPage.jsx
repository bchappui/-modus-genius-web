import React, { useState } from 'react'
import { account, OAuthProvider } from '../lib/appwrite.js'
import { ID } from 'appwrite'

const INPUT_STYLE = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '12px 14px',
    color: '#e0e6ff',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
}

const GOLD_BTN = {
    width: '100%',
    background: 'rgb(201,151,44)',
    border: 'none',
    borderRadius: 6,
    padding: '13px',
    color: '#1a1200',
    fontWeight: 900,
    fontSize: 14,
    letterSpacing: 2,
    cursor: 'pointer',
    marginTop: 4,
}

const LINK_BTN = {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
}

const googleOAuth = () => {
    account.createOAuth2Session(
        OAuthProvider.Google,
        `${window.location.origin}/`,
        `${window.location.origin}/`
    )
}

const go = (setView, setError, view) => () => { setView(view); setError('') }

const LoginPage = ({ onLoginSuccess }) => {
    // views: 'email' | 'password' | 'signup' | 'signup-password'
    const [view, setView] = useState('email')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

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
        <div style={{ minHeight: '100vh', background: '#030014', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 360 }}>

                <img src="./favicon.svg" alt="logo" style={{ display: 'block', margin: '0 auto 32px', height: 60, objectFit: 'contain' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                    {/* Email field — shown on all views */}
                    <input
                        style={INPUT_STYLE}
                        placeholder="Email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleContinue()}
                        readOnly={view === 'signup-password'}
                    />

                    {/* Password field — login step 2 and signup step 2 */}
                    {(view === 'password' || view === 'signup-password') && (
                        <input
                            style={INPUT_STYLE}
                            placeholder="Password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleContinue()}
                            autoFocus
                        />
                    )}

                    {/* Right-aligned contextual link */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
                        {view === 'email' && (
                            <button style={LINK_BTN} onClick={() => nav('password')}>
                                Log in with password
                            </button>
                        )}
                        {view === 'password' && (
                            <button style={LINK_BTN} onClick={() => nav('email')}>
                                Log in with Google
                            </button>
                        )}
                        {view === 'signup' && (
                            <button style={LINK_BTN} onClick={googleOAuth}>
                                Sign up with Google
                            </button>
                        )}
                        {view === 'signup-password' && (
                            <button style={LINK_BTN} onClick={() => nav('signup')}>
                                Change email
                            </button>
                        )}
                    </div>

                    {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>{error}</p>}

                    <button style={GOLD_BTN} onClick={handleContinue} disabled={isLoading}>
                        {isLoading ? '...' : 'CONTINUE'}
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                    {isSignup ? (
                        <>Already have an account?{' '}
                            <button style={{ ...LINK_BTN, color: 'rgba(255,255,255,0.6)' }} onClick={() => nav('email')}>
                                Log in
                            </button>
                        </>
                    ) : (
                        <>First time here?{' '}
                            <button style={{ ...LINK_BTN, color: 'rgba(255,255,255,0.6)' }} onClick={() => nav('signup')}>
                                Create an account
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    )
}

export default LoginPage
