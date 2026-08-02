import React, { useState } from 'react'
import SearchModal from './SearchModal.jsx'
import TopNav from './TopNav.jsx'
import './ExplorePage.css'
import './HomePage.css'
import './AboutPage.css'

const MEDALLION_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a465c42001e90b9a93c/view?project=693e8acd001582e2562a';

const CIRCLE_TEXT = 'YOUR EXPERTISE  •  OUR COLLECTION  •  ';
const LEARNING_MODEL_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a4cbeeb003af6991bc5/view?project=693e8acd001582e2562a';
const ICON_SCATTER_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a4cbf6a00035eda679a/view?project=693e8acd001582e2562a';
const ICON_NETWORK_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a4cbf71001dd0f3fb08/view?project=693e8acd001582e2562a';
const EARTH_NIGHT_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a4cbf09003e4a7db7c1/view?project=693e8acd001582e2562a';
const SOCIAL_PHOTO_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a4cbf010010c05ab76d/view?project=693e8acd001582e2562a';
const HOURGLASS_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/6954052f00084044b871/files/6a4cbef7000e3d05533d/view?project=693e8acd001582e2562a';

// The third icon's own asset link (EFFICIENT) wasn't provided — a duplicate
// of ICON_NETWORK_URL was pasted twice by mistake — so it's redrawn here as
// an inline SVG sparkle (6 long spikes + 6 short ones, dot at every tip),
// matching the mockup's icon as closely as possible without that asset.
const SparkleIcon = () => (
    <svg viewBox="0 0 100 100" className="ap-pillar-sparkle" aria-hidden="true">
        {[0, 60, 120, 180, 240, 300].map(angle => (
            <g key={angle} transform={`rotate(${angle} 50 50)`}>
                <line x1="50" y1="50" x2="50" y2="12" stroke="currentColor" strokeWidth="3" />
                <circle cx="50" cy="10" r="3.5" fill="currentColor" />
            </g>
        ))}
        {[30, 90, 150, 210, 270, 330].map(angle => (
            <g key={angle} transform={`rotate(${angle} 50 50)`}>
                <line x1="50" y1="50" x2="50" y2="26" stroke="currentColor" strokeWidth="3" />
                <circle cx="50" cy="24" r="3" fill="currentColor" />
            </g>
        ))}
    </svg>
);

const PILLARS = [
    {
        title: 'OPEN',
        icon: <img src={ICON_SCATTER_URL} alt="" className="ap-pillar-icon-img" />,
        text: 'Gain visibility and recognition by sharing your own expertise and benefit from others with an every growing library of tools',
    },
    {
        title: 'SOCIAL',
        icon: <img src={ICON_NETWORK_URL} alt="" className="ap-pillar-icon-img" />,
        text: 'Build a network of like-minded professionals and get mentorship from top leaders',
    },
    {
        title: 'EFFICIENT',
        icon: <SparkleIcon />,
        text: 'Learn, unlearn, relearn with an innovative approach based on the science of learning',
    },
];

const AboutPage = ({
    searchTerm, onSearchChange, onGoHome, onGoToExplore, onShowGenius, onShowQuotes, onShowNewsletter, onShowSubscribe,
    onShowCreate, onShowFavorites, onLogout, isLoggedIn, movieList, isLoading, errorMessage, onSelectProperty,
    agentAvatar, onOpenProfile,
}) => {
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const scrollToSection = (title) => {
        document.getElementById(`ap-section-${title.toLowerCase()}`)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="ep-page">

            {/* Home stays highlighted (but clickable) since this page continues
                the carousel's mission story — same quirk as before the TopNav
                extraction: disableActiveLink is intentionally left off. */}
            <TopNav
                activeLink="home"
                onGoHome={onGoHome} onGoToExplore={onGoToExplore} onShowGenius={onShowGenius}
                onShowQuotes={onShowQuotes} onShowNewsletter={onShowNewsletter}
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

            {/* ── HERO — same medallion technique as HomePage ── */}
            <div className="ep-hero">
                <div className="ep-hero-medallion" aria-hidden="true">
                    <img src={MEDALLION_URL} alt="" className="ep-medallion-img" />
                </div>
                <svg className="ep-medallion-text" viewBox="0 0 1399 1124">
                    <defs>
                        <path id="ap-circle-path" d="M 445.5,898.7 A 495,495 0 0,1 940.5,41.3" />
                    </defs>
                    <text className="ep-circle-text-el">
                        <textPath href="#ap-circle-path" startOffset="0%">
                            {CIRCLE_TEXT}
                        </textPath>
                    </text>
                </svg>

                <div className="hp-hero-content">
                    <div className="ap-intro">
                        <h1 className="hp-headline ap-headline">
                            Our mission is to democratize the world's best business knowledge to anyone, anywhere
                        </h1>
                        <p className="hp-hashtag ap-hashtag">#DISRUPTIVY</p>

                        <p className="ap-body">
                            Imagine a world where anyone – from young aspiring leader to the world's top experts –,
                            each with their own unique skill, share, learn, and growth together, in a new ecosystem.
                        </p>
                        <p className="ap-body">
                            At Modus Genius, we believe this world is possible. We're building a movement to unlock
                            the exclusive access to the world's best business knowledge – and to do so, we must
                            change the rules of the game.
                        </p>
                        <p className="ap-body">
                            Modus Genius disrupt the traditional higher education model by bridging the skills gap.
                            We welcome all who seek to maximize their potential and invite anyone who want to share
                            their business knowledge in an ever-increasing portfolio of global resources.
                        </p>
                    </div>

                    <div className="ap-testimonial">
                        <div className="ap-testimonial-text">
                            <span className="ap-quote-mark ap-quote-mark--open" aria-hidden="true">&ldquo;</span>
                            <p className="ap-quote">
                                The <span className="ap-quote-hashtag">#disruptivy</span> movement is a powerful
                                critique of the outdated money-driven and elitist higher education system and a call
                                to reimagine business schools and workplaces as a hub of true learning, connection,
                                and systemic change.
                            </p>
                            <p className="ap-quote">
                                Modus Genius provides both a platform to connect the world's best experts and a suite
                                of practical strategies for those ready to elevate their business management skills
                                and lead with impact.
                            </p>
                            <div className="ap-quote-attribution">
                                <span className="ap-quote-author">Nathasha M.</span>
                                <span className="ap-quote-stars">★★★★★</span>
                                <span className="ap-quote-mark ap-quote-mark--close" aria-hidden="true">&rdquo;</span>
                            </div>
                        </div>
                        <div className="ap-testimonial-photo">
                            <img src={LEARNING_MODEL_URL} alt="" className="ap-photo" />
                        </div>
                    </div>

                    <div className="ap-pillars">
                        {PILLARS.map(pillar => (
                            <div key={pillar.title} className="ap-pillar-card">
                                <div className="ap-pillar-hex">
                                    {pillar.icon}
                                </div>
                                <h3 className="ap-pillar-title">{pillar.title}</h3>
                                <p className="ap-pillar-text">{pillar.text}</p>
                                <button
                                    className="ap-pillar-plus"
                                    aria-label={`More about ${pillar.title}`}
                                    onClick={() => scrollToSection(pillar.title)}
                                >+</button>
                            </div>
                        ))}
                    </div>

                    <div className="ap-split-row" id="ap-section-open">
                        <div className="ap-split-text">
                            <h2 className="hp-headline ap-split-title">OPEN</h2>
                            <p className="ap-split-body">
                                <strong>Collective Intelligence</strong> – Unlike our competitors, we tap into the
                                collective knowledge and expertise of every member from around the world, empowering
                                them to contribute to a ever increasing portfolio of resources. Our platform is not
                                just a one-way street; We give you the ability to share your own advice, tools, and
                                insights while at the same time enhance the existing materials, ensuring high-quality
                                resources. Discover, share and add your knowledge!
                            </p>
                            <p className="ap-split-body">
                                <strong>Open knowledge</strong> – At our organization, we embrace the principles of
                                open knowledge. We believe in accessibility and inclusivity, ensuring that anyone has
                                the opportunity to be a member. We are not an elitist organization; our aim is to make
                                knowledge and resources available to all, regardless of your academic background or
                                bank account. Everyone is welcome to contribute, learn, and grow with us.
                            </p>
                            <p className="ap-split-body">
                                <strong>Spread knowledge!</strong> – We invite everyone to help spread the word by
                                sharing our material on social networks! By doing so, you can help amplify our
                                movement. Your support will make it easier for others to access valuable resources,
                                learn, and join our community. Let's work together to create a more connected and
                                informed world. Feel free to share!
                            </p>
                        </div>
                        <div className="ap-split-photo">
                            <img src={EARTH_NIGHT_URL} alt="" className="ap-photo" />
                        </div>
                    </div>

                    <div className="ap-split-row ap-split-row--reverse" id="ap-section-social">
                        <div className="ap-split-text">
                            <h2 className="hp-headline ap-split-title">SOCIAL</h2>
                            <p className="ap-split-body">
                                <strong>Collaborate</strong> – Engaging with your peers is a big part of what makes
                                Modus Genius unique. The Hive functionality is a catalyst for stimulating conversation
                                and debate with like-minded experts, sparking the insight and the ideas that will help
                                you reflect on your most complex business challenges. Engage with Modus Genius's vast
                                network of experts in focused forums that align with the challenges you face, to
                                foster learning, connection and progress toward your goals. Get perspective from
                                peers who have been in similar situations, and benefit from the type of insights and
                                constructive feedback you can't get from your manager, colleagues, friends or family.
                            </p>
                            <p className="ap-split-body">
                                <strong>Network</strong> – Connections are the heart of business success. With
                                ModusGenius, you'll quickly meet the right people and start building meaningful
                                connections. Our powerful, people-first approach ensures that every time you log in to
                                the app, you'll find a global cohort of peers with topics of interest similar to you.
                                You can continue the conversation by making a post, visiting an interactive Group,
                                following a member, or connecting via direct message.
                            </p>
                            <p className="ap-split-body">
                                <strong>Coaching</strong> – We don't ask you to make your own Modus Genius alone. We
                                are an organization with a culture of coaching that brings together many of the
                                world's leading C-suite veterans, Fortune 500 leaders, start-up CEOs and like-minded
                                professionals with the common purpose of making you better. From objective guidance
                                and professional development, to informal mentorships and problem-solving, tap into a
                                dynamic network of peers wherever and whenever you need them. And you are encouraged
                                to offer your insights, experience, and help to those around you.
                            </p>
                        </div>
                        <div className="ap-split-photo">
                            <img src={SOCIAL_PHOTO_URL} alt="" className="ap-photo" />
                        </div>
                    </div>

                    <div className="ap-split-row ap-split-row--narrow-photo" id="ap-section-efficient">
                        <div className="ap-split-text">
                            <h2 className="hp-headline ap-split-title">EFFICIENT</h2>
                            <p className="ap-split-body">
                                <strong>Micro Learning</strong> – Get access to practical and bite-size resources to
                                elevate your skills. Research suggests that 10–20 minutes is the optimal time for
                                maintaining readers engagement before attention starts to drop. long enough to explore
                                a powerful idea but short enough to fit into busy schedules, making it more widely
                                read. It also forces creators to distill their knowledge into a compelling and
                                actionable practices without unnecessary fluff and remove anything and everything that
                                isn't going to have an immediate impact on your business skills.
                            </p>
                            <p className="ap-split-body">
                                <strong>Just-in-Time Learning</strong> – Acquire knowledge precisely when it's needed.
                                Unlike traditional academic programs or MBAs that front-load information, this
                                approach ensures that learning is immediately relevant and applicable with high-impact
                                results. It empowers you to solve real-world challenges on demand, reinforcing
                                retention and practical use for real-time results.
                            </p>
                            <p className="ap-split-body">
                                <strong>Speed Reading</strong> – Enjoy a cutting-edge experience, enhanced by the
                                latest industry research on user viewing patterns. By designing cards that optimize
                                how information is presented, even the hardest concepts will come naturally to you. We
                                ensure effective communication and cater to both casual browsers and users focused on
                                absorbing key information quickly.
                            </p>
                        </div>
                        <div className="ap-split-photo">
                            <img src={HOURGLASS_URL} alt="" className="ap-photo" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;
