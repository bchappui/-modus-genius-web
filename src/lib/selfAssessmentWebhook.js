// Sends the self-assessment submission to an automation webhook (e.g. a
// Zapier "Catch Hook" or a Make.com webhook), which then adds the person to
// beehiiv and triggers the "Personal Profile Summary" email from there.
//
// Set VITE_SELF_ASSESSMENT_WEBHOOK_URL in .env.local; without it this is a
// no-op. Sent as form-encoded fields (a "simple" CORS request, so no
// preflight) — each field shows up individually in the automation.
import { scoreSelfAssessment } from './selfAssessmentScoring.js'

const WEBHOOK_URL = import.meta.env.VITE_SELF_ASSESSMENT_WEBHOOK_URL;

// Separate event for the "rate your report" pop-up's star rating.
export async function sendSelfAssessmentRating(rating, { email, type } = {}) {
    if (!WEBHOOK_URL) return;
    const body = new URLSearchParams({
        source: 'self-assessment-rating',
        rating: String(rating),
        email: email || '',
        personality_type: type || '',
        submitted_at: new Date().toISOString(),
    });
    try {
        await fetch(WEBHOOK_URL, { method: 'POST', body });
    } catch (e) {
        console.error('Error sending self-assessment rating to webhook', e);
    }
}

export async function sendSelfAssessmentToWebhook(answers) {
    if (!WEBHOOK_URL) {
        console.warn('VITE_SELF_ASSESSMENT_WEBHOOK_URL is not set — self-assessment not sent.');
        return;
    }
    const body = new URLSearchParams();
    Object.entries(answers).forEach(([key, value]) => {
        if (value != null) body.append(key, String(value).trim());
    });
    // Ready-to-use results, so the email template only has to display them.
    const result = scoreSelfAssessment(answers);
    body.append('personality_type', result.type);
    body.append('personality_name', result.name);
    body.append('main_element', result.mainElement);
    Object.entries(result.elements).forEach(([el, pct]) => body.append(`element_${el}`, String(pct)));
    Object.entries(result.axes).forEach(([axis, { letter, percent }]) => body.append(`axis_${axis}`, `${letter} ${percent}%`));
    body.append('submitted_at', new Date().toISOString());
    body.append('source', 'self-assessment');

    try {
        await fetch(WEBHOOK_URL, { method: 'POST', body });
    } catch (e) {
        console.error('Error sending self-assessment to webhook', e);
    }
}
