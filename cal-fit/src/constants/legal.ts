/**
 * Privacy Policy and Terms of Use, shown in the app at /privacy and /terms (also the public URLs
 * for the App Store and Google Play listings once the web server is hosted).
 *
 * Fill in OPERATOR before submitting to the stores, and have the text reviewed
 * for the countries you launch in. Update LAST_UPDATED whenever the text changes.
 */

export const OPERATOR = 'Cal-Fit'; // TODO: legal name of the person or company publishing the app.
export const CONTACT_EMAIL = 'support@bornomala.site';
export const LAST_UPDATED = 'October 24, 2026';
/** Stored with each user's agreement; bump it (with LAST_UPDATED) when the terms change. */
export const TERMS_VERSION = '2026-10-24';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export const HEALTH_DISCLAIMER =
  'Cal-Fit gives estimates for general wellness, not medical advice. Calorie targets and AI nutrition ' +
  'results can be wrong. Talk to a doctor or registered dietitian before changing your diet, especially ' +
  'if you are pregnant, have a medical condition or a history of disordered eating.';

export const PRIVACY_POLICY: LegalSection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      `This policy explains how ${OPERATOR} ("we", "us") handles your information when you use the Cal-Fit app and website. Questions? Email ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: 'What we collect',
    paragraphs: [
      'Account: your email address, name and, if you sign in with Google or Apple, the profile details they share (such as your name and profile picture). Apple lets you hide your email; we then receive a private relay address.',
      'Profile and health information you enter: gender, age, height, weight, goal weight, activity level and goal, plus the daily targets we calculate from them.',
      'Food and progress: meal photos, the meals and foods you log, AI nutrition estimates, water and habit check-ins, weigh-ins and optional progress photos.',
      'Purchases: which scan packs you bought and when. Payments are handled by Apple or Google; we never see your card details.',
      'Technical: basic server logs (such as request times and errors) needed to run and secure the service. We do not use advertising trackers.',
    ],
  },
  {
    heading: 'How we use it',
    paragraphs: [
      'To run Cal-Fit: sign you in, calculate your targets, analyze meal photos, show your progress, streaks and history, and keep track of your AI scans.',
      'To send marketing emails (tips, recipes and offers) only if you turn on "Email updates". You can turn it off any time in Profile.',
      'To keep the service safe, prevent abuse of free scans and fix problems.',
      'We do not sell your personal information, and we do not use your health information for advertising.',
    ],
  },
  {
    heading: 'Who we share it with',
    paragraphs: [
      'Service providers that process data for us only to run Cal-Fit: Clerk (sign-in), Neon (database and photo storage), OpenAI (analyzing meal photos you submit), Trigger.dev (running the analysis), RevenueCat (verifying purchases) and Apple or Google (payments and app distribution).',
      'Food searches send only the text you type to Open Food Facts.',
      'We may also disclose information if the law requires it, or to protect the safety of our users.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'We keep your data while your account exists. When you delete your account in Profile → Delete Account, we delete your account, photos and logs right away. Copies in encrypted backups are removed within 30 days. To stop free scans from being claimed again by deleting and re-creating an account, we keep a one-way hash of your email address and the months it received free scans; it can\u2019t be turned back into your address.',
    ],
  },
  {
    heading: 'Your choices and rights',
    paragraphs: [
      'You can view and edit your profile in the app, turn marketing emails on or off, and delete your account and all of its data at any time from Profile → Delete Account.',
      `Depending on where you live, you may also have the right to request a copy of your data or to object to or limit how we use it. Email ${CONTACT_EMAIL} and we will respond within 30 days.`,
    ],
  },
  {
    heading: 'Security',
    paragraphs: [
      'Data is encrypted in transit, photos are stored privately and are only reachable through short-lived links, and each user can only access their own records. No system is perfectly secure, so please use a strong, unique password.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'Cal-Fit is not meant for children under 13 (or under 16 where local law sets a higher age), and we do not knowingly collect their information. If you believe a child has created an account, contact us and we will delete it.',
    ],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: [
      'We will post any changes here and update the date at the top. If a change is significant, we will tell you in the app or by email.',
    ],
  },
];

export const TERMS_OF_USE: LegalSection[] = [
  {
    heading: 'Agreement',
    paragraphs: [
      `These terms are an agreement between you and ${OPERATOR}. By creating an account or using Cal-Fit, you agree to them and to our Privacy Policy. If you do not agree, please do not use the app.`,
    ],
  },
  {
    heading: 'Not medical advice',
    paragraphs: [
      HEALTH_DISCLAIMER,
      'Do not use Cal-Fit to diagnose, treat or manage any medical condition, and do not rely on it in an emergency.',
    ],
  },
  {
    heading: 'Your account',
    paragraphs: [
      'You must be at least 13 years old (or the minimum age in your country) to use Cal-Fit. Keep your sign-in details secure; you are responsible for activity on your account. You can delete your account at any time in Profile → Delete Account.',
    ],
  },
  {
    heading: 'AI scans and purchases',
    paragraphs: [
      'Each account receives a number of free AI scans every month, as shown in the app. Unused free scans do not carry over. The free allowance is per email address: deleting and re-creating an account, or using an alias of the same address, does not reset it.',
      'You can buy scan packs through the App Store or Google Play. Purchased scans do not expire while your account exists, are not transferable and have no cash value. Deleting your account removes any unused scans.',
      'Purchases are processed by Apple or Google under their terms. Refunds are handled by Apple or Google under their refund policies, except where the law requires otherwise. If a scan fails, it is not deducted.',
    ],
  },
  {
    heading: 'Your content',
    paragraphs: [
      'You keep ownership of the photos and information you add. You give us permission to store and process them, including sending meal photos to our AI provider, only to provide Cal-Fit to you. Only upload photos you have the right to use.',
    ],
  },
  {
    heading: 'Acceptable use',
    paragraphs: [
      'Do not misuse Cal-Fit: no attempts to access other users’ data, get around scan limits, overload or reverse engineer the service, or upload unlawful or offensive content. We may suspend or close accounts that break these terms.',
    ],
  },
  {
    heading: 'Disclaimers and liability',
    paragraphs: [
      'Cal-Fit is provided "as is". We work to keep it accurate and available but do not guarantee that it will be error-free, uninterrupted or that its estimates are correct.',
      'To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability for any claim is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under consumer protection law.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: [
      'We may update Cal-Fit and these terms. We will post changes here and update the date at the top; continuing to use the app after a change means you accept it.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [`Questions about these terms? Email ${CONTACT_EMAIL}.`],
  },
];

/** Public page for Google Play's account deletion link; works without signing in. */
export const ACCOUNT_DELETION: LegalSection[] = [
  {
    heading: 'Delete your account in the app',
    paragraphs: [
      'Open Cal-Fit, go to Profile and tap "Delete account", then confirm. Your account and data are deleted right away.',
    ],
  },
  {
    heading: 'Or ask us to delete it',
    paragraphs: [
      `If you can't use the app, email ${CONTACT_EMAIL} from the email address you signed up with and ask us to delete your Cal-Fit account. We'll confirm and delete it within 30 days.`,
    ],
  },
  {
    heading: 'Delete some data and keep your account',
    paragraphs: [
      'In the app you can remove meals from your diary (open a meal and tap Delete), remove weigh-ins on the Progress tab, and stop marketing emails by turning off "Email updates" in Profile.',
      `To have specific data permanently erased, such as meal or progress photos, without closing your account, email ${CONTACT_EMAIL} from your sign-up email address and tell us what to remove. We'll erase it within 30 days.`,
    ],
  },
  {
    heading: 'What gets deleted',
    paragraphs: [
      'Your account and sign-in, profile and goals, meals and scan results, meal and progress photos, weigh-ins, water and workout logs, remaining AI scans (including purchased ones) and your email preferences.',
    ],
  },
  {
    heading: 'What we keep',
    paragraphs: [
      'Copies in encrypted backups are removed within 30 days. To prevent abuse of free scans, we keep a one-way hash of your email address and the months it received free scans; it can\u2019t be turned back into your address. Purchase records held by Apple or Google are kept by them under their own policies.',
    ],
  },
];
