// Stand-alone site with only the two waitlist pages, published on its own
// (npm run build → dist-waitlist/; the full app is npm run build:app). No login, no Appwrite, none of
// the rest of the app.
//   /                   → waitlist signup (beehiiv form)
//   /?thanks=waitlist   → thank-you page (beehiiv's redirect after signup)
import { createRoot } from 'react-dom/client'
import './index.css'
import NewsletterSignupPage from './components/pages/NewsletterSignupPage.jsx'
import ThanksArchive from './components/pages/ThanksArchive.jsx'

const showThanks = new URLSearchParams(window.location.search).has('thanks');
const goHome = () => { window.location.href = '/'; };

createRoot(document.getElementById('root')).render(
    <main>
        {showThanks
            ? <ThanksArchive waitlist movieList={[]} />
            : <NewsletterSignupPage waitlist onBack={goHome} />}
    </main>
)
