import React, { useState, useEffect } from 'react'
import { FiCheck, FiArrowRight } from 'react-icons/fi'
import TopNav from '../shared/TopNav.jsx'
import SearchModal from '../modals/SearchModal.jsx'
import { fireFullPageConfetti, stopConfetti } from '../../lib/confetti.js'
import SelfAssessmentSurvey, { ReportStep } from './SelfAssessmentSurvey.jsx'
import SelfAssessmentResults, { ProfileOverview } from './SelfAssessmentResults.jsx'
import SelfAssessmentLearningPlan from './SelfAssessmentLearningPlan.jsx'
import SelfAssessmentDeck from './SelfAssessmentDeck.jsx'
import SelfAssessmentBadge from './SelfAssessmentBadge.jsx'
import { getLearningPlan } from '../../lib/learningPlans/index.js'
import { scoreSelfAssessment, answersForType, PERSONALITIES } from '../../lib/selfAssessmentScoring.js'
import { SA_ICONS } from '../../lib/selfAssessmentSurvey.js'
import './SelfAssessmentPage.css'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';

// No real card art for this slot yet — same placeholder-gradient convention
// as WhereToStartModal's PACK_CARDS.
const PREVIEW_CARDS = [
    'linear-gradient(160deg, rgb(230,90,120) 0%, rgb(120,60,140) 100%)',
    'linear-gradient(160deg, rgb(60,190,170) 0%, rgb(30,90,120) 100%)',
    'linear-gradient(160deg, rgb(90,110,220) 0%, rgb(40,40,110) 100%)',
];

const PERKS = ['30 questions', '5 minutes', '100% free'];


const BENEFITS = [
    {
        icon: SA_ICONS.report,
        title: 'Personality Report',
        text: 'A highly detailed and straightforward report that reveals your strengths and weaknesses.',
    },
    {
        icon: SA_ICONS.plan,
        title: 'Personal Learning Plan',
        text: 'Based on your test results, we set up a customized learning plan aimed at enhancing your skills.',
    },
    {
        icon: SA_ICONS.badge,
        title: 'Verifiable Digital Badges',
        text: 'Upon completing the learning program, you will receive a downloadable digital badge to share on social media and with your community.',
    },
];

// Landing page for the free self-assessment, reached from WhereToStartModal's
// "Get Started". Steps: 'intro' → 'congrats' (full-page rainbow confetti) →
// 'fact' ("Did you know?") → 'survey' (SelfAssessmentSurvey) → 'results'
// (SelfAssessmentResults, scored with scoreSelfAssessment) → 'learningPlan'
// (via "Get My Learning Plan": loader) → 'learningPlanReady' → 'deck' (via
// "Redeem your deck") → 'badge' (the unlocked final reward: loader with the
// badge step checked) → 'badgeEarned' (SelfAssessmentBadge). onStart is also
// called with the answers once the survey is finished.
const SelfAssessmentPage = ({
    onStart, searchTerm, onSearchChange, movieList, isLoading, errorMessage, onSelectProperty,
    onGoHome, onGoToExplore, onShowGenius, onShowQuotes, onShowNewsletter, onShowCommunity,
    onShowCreate, onShowFavorites, onShowSubscribe, onLogout, isLoggedIn, agentAvatar, onOpenProfile,
    agentEmail, agentId, agentName, agentSurname, onGetLearningPlan, onRedeemDeck, hasDeckAccess, onRequireDeckAccess,
}) => {
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    // Dev-only ?saPreview=INTJ: jump straight to that profile's results
    // (add &saStep=plan for its learning plan page, deck or badge for its first deck).
    const previewParams = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
    const previewType = previewParams?.get('saPreview')?.toUpperCase();
    const preview = previewType && PERSONALITIES[previewType] ? previewType : null;
    const previewStep = { plan: 'learningPlanReady', deck: 'deck', badge: 'badgeEarned' }[previewParams?.get('saStep')] || 'results';

    const [step, setStep] = useState(preview ? previewStep : 'intro');
    const [result, setResult] = useState(() => preview ? scoreSelfAssessment(answersForType(preview)) : null);
    const [resultEmail, setResultEmail] = useState(preview ? (agentEmail || '') : '');
    // Deck picked with "Redeem your deck" on the learning plan page.
    const [selectedDeck, setSelectedDeck] = useState(() =>
        preview && ['deck', 'badgeEarned'].includes(previewStep) ? getLearningPlan(preview)?.strengths[0] ?? null : null);

    // Leaving the page mid-rain shouldn't carry confetti onto the next one.
    useEffect(() => stopConfetti, []);

    const goToStep = (next) => {
        // Confetti belongs to the congrats step only — clear any still falling.
        stopConfetti();
        setStep(next);
        window.scrollTo(0, 0);
    };
    const handleStart = () => {
        goToStep('congrats');
        fireFullPageConfetti();
    };
    return (
        <div className="sa-page">
            <TopNav
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius}
                onShowQuotes={onShowQuotes} onShowNewsletter={onShowNewsletter} onShowCommunity={onShowCommunity}
                onShowCreate={onShowCreate} onShowFavorites={onShowFavorites} onShowSubscribe={onShowSubscribe}
                onLogout={onLogout} isLoggedIn={isLoggedIn}
                agentAvatar={agentAvatar} onOpenProfile={onOpenProfile}
                onOpenSearch={() => setSearchModalOpen(true)}
            />

            {searchModalOpen && (
                <SearchModal
                    searchTerm={searchTerm}
                    onSearchChange={onSearchChange}
                    movieList={movieList}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    onSelectProperty={onSelectProperty}
                    onClose={() => setSearchModalOpen(false)}
                />
            )}

            <div className="sa-hero">
                <div className="sa-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="sa-medallion-img" />
                </div>

                {step === 'fact' ? (
                    <section className="sa-congrats sa-fact">
                        <h1 className="ep-headline sa-fact-line">Before you start…</h1>
                        <p className="ep-headline sa-fact-line sa-fact-question">Did you know?</p>
                        <p className="ep-headline sa-fact-line sa-fact-number">39%</p>
                        <p className="ep-headline sa-fact-text">of workers’ core skills will change by 2030</p>
                        <button className="sa-continue-btn" onClick={() => goToStep('survey')}>Continue</button>
                    </section>
                ) : step === 'survey' ? (
                    <SelfAssessmentSurvey
                            defaultEmail={agentEmail || ''}
                            onComplete={(answers) => {
                                setResult(scoreSelfAssessment(answers));
                                setResultEmail((answers.email || '').trim());
                                goToStep('results');
                                onStart?.(answers);
                            }}
                        />
                    ) : step === 'results' && result ? (
                        <SelfAssessmentResults
                            result={result}
                            email={resultEmail}
                            onGetLearningPlan={() => { goToStep('learningPlan'); onGetLearningPlan?.(); }}
                        />
                    ) : step === 'learningPlan' ? (
                        <section className="sa-congrats sa-learning-plan">
                            <ReportStep
                                title="Creating your learning plan…"
                                done={['report', 'plan']}
                                onDone={() => { goToStep('learningPlanReady'); fireFullPageConfetti(); }}
                            />
                        </section>
                    ) : step === 'deck' && selectedDeck ? (
                        <SelfAssessmentDeck
                            deck={selectedDeck}
                            agentId={agentId}
                            onOpenCard={onSelectProperty}
                            onClaimReward={() => goToStep('badge')}
                        />
                    ) : step === 'badge' && selectedDeck ? (
                        <section className="sa-congrats sa-learning-plan">
                            <ReportStep
                                title="Creating your digital badge…"
                                done={['report', 'plan', 'badge']}
                                onDone={() => goToStep('badgeEarned')}
                            />
                        </section>
                    ) : step === 'badgeEarned' && selectedDeck ? (
                        <SelfAssessmentBadge deck={selectedDeck} agentName={agentName} agentSurname={agentSurname} />
                    ) : step === 'learningPlanReady' ? (
                        <section className="sa-results sa-plan-ready">
                            <h1 className="ep-headline sa-plan-ready-title">Your Learning plan is ready!</h1>
                            <p className="ep-subtext sa-results-intro-text">
                                Based on your answers, you’re about to discover your personalized learning plan, designed around your unique strengths and areas for growth.
                            </p>
                            <p className="ep-subtext sa-results-intro-text">
                                Scroll down to explore personalized decks based on the strengths you’d like to reinforce and the weaknesses you’d like to improve — and start building the skills that will help you grow professionally.
                            </p>
                            <svg className="sa-scroll-hint sa-blink" viewBox="0 0 64 64" aria-hidden="true">
                                <path d="M12 10 L32 26 L52 10" />
                                <path d="M12 34 L32 50 L52 34" />
                            </svg>
                            <div className="sa-plan-profile">
                                <ProfileOverview result={result} showAbout={false} />
                                <SelfAssessmentLearningPlan
                                    result={result}
                                    onRedeemDeck={(deck, key) => {
                                        // Decks are Extra-only: others get the upgrade pop-up.
                                        if (!hasDeckAccess) { onRequireDeckAccess?.(); return; }
                                        setSelectedDeck(deck);
                                        goToStep('deck');
                                        onRedeemDeck?.(deck, key);
                                    }}
                                />
                            </div>
                        </section>
                ) : step === 'congrats' ? (
                    <section className="sa-congrats">
                        <h1 className="ep-headline sa-congrats-title">Congratulations!</h1>
                        <p className="ep-headline sa-congrats-text">
                            You’ve taken the first step toward becoming the best version of yourself.
                        </p>
                        <button className="sa-continue-btn" onClick={() => goToStep('fact')}>Continue</button>
                    </section>
                ) : (
                    <>
                        <section className="sa-content">
                            <h1 className="ep-headline sa-headline">Unlock your potential with our free self&#8209;assessment</h1>
                            <p className="ep-subtext sa-subtext">
                                Designed by organisational psychologists, this quiz will help you discover
                                what makes you exceptional, so that you can articulate your value more
                                effectively.
                            </p>

                            <div className="sa-body">
                                <div className="sa-left">
                                    <ul className="ep-subtext sa-perks">
                                        {PERKS.map(p => (
                                            <li key={p}><FiCheck size={14} strokeWidth={3} />{p}</li>
                                        ))}
                                    </ul>
                                    <button className="sa-start-btn" onClick={handleStart}>
                                        Start Assessment <FiArrowRight size={16} />
                                    </button>
                                </div>

                                <div className="sa-cards" aria-hidden="true">
                                    {PREVIEW_CARDS.map((gradient, i) => (
                                        <div key={i} className="sa-card" style={{ background: gradient }} />
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="sa-receive">
                            <h2 className="ep-categories-title sa-receive-title">What You Will Receive</h2>
                            <div className="sa-receive-grid">
                                {BENEFITS.map(b => (
                                    <div key={b.title} className="sa-benefit">
                                        <img
                                            src={b.icon.src}
                                            alt=""
                                            className="sa-benefit-icon"
                                            style={b.icon.scale ? { transform: `scale(${b.icon.scale})` } : undefined}
                                        />
                                        <h3 className="sa-benefit-title">{b.title}</h3>
                                        <p className="ep-subtext sa-benefit-text">{b.text}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default SelfAssessmentPage;
