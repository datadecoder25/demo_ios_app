# Google Play listing: Cal-Fit

Copy-paste answers for the Play Console. Items marked **TODO** need your input.

## Store listing (Grow → Store presence → Main store listing)

| Field | Value |
|---|---|
| App name (max 30) | `Cal-Fit: AI Calorie Counter` |
| Short description (max 80) | `Snap your meal, get calories & macros. Gain weight and build muscle with AI.` |
| App icon | `store/android/play-icon-512.png` (512×512) |
| Feature graphic | `store/android/feature-graphic-1024x500.png` (1024×500) |
| Phone screenshots | 2–8 images, 9:16 (e.g. 1080×1920). See "Screenshots" below. |
| Category | Health & Fitness |
| Contact email | `support@bornomala.site` |
| Website | optional |
| Privacy policy | `https://cal-fit.expo.app/privacy` |

### Full description (max 4000)

```
Cal-Fit makes eating enough simple. Snap a photo of your meal and AI estimates the calories, protein, carbs, fat and fiber in seconds, so you always know how close you are to your daily target.

Built for people who want to gain weight and build muscle:
• Personal daily calorie and macro targets from your age, height, weight, activity and goal
• AI meal scans: take a photo or pick one from your gallery
• Adjust portions before saving, and log food manually any time (always free)
• Food search with nutrition facts
• Streaks, XP and daily tasks to keep you consistent
• Water and workout check-ins
• Weight tracking with progress photos and a before/after view
• Weekly calorie and weight charts

Free to use: every account gets 4 AI scans each month. Need more? Buy a scan pack once; there is no subscription and purchased scans never expire.

Your data stays yours. Delete your account and all of your data from the app at any time.

Cal-Fit gives estimates for general wellness, not medical advice. Talk to a doctor or registered dietitian before changing your diet.
```

## App content (Policy → App content)

| Section | Answer |
|---|---|
| Privacy policy | `https://cal-fit.expo.app/privacy` |
| Ads | No, the app contains no ads |
| App access | All functionality requires sign-in → add a demo account (see below) |
| Content rating | Fill the IARC questionnaire: category "All other app types"; no violence, sexual content, profanity, drugs, gambling; users can't chat or share content with each other; no location sharing; **digital purchases: yes**. Expected rating: Everyone / PEGI 3 |
| Target audience | 18 and over (simplest; avoids the Families policy) |
| News app | No |
| Health apps | Declare: nutrition and weight management. Not a medical device; no diagnosis or treatment |
| Financial features | None |
| Government app | No |
| Data safety | See below |
| Account deletion | In-app: Profile → Delete account. Web link: `https://cal-fit.expo.app/account-deletion` (how to delete, or request it by email) |

### Demo account for reviewers (App access)

Google's reviewers sign in from a new device, and Clerk asks for an emailed code on new devices. Either:
- give an account on an inbox you watch during review and say "a 6-digit code is emailed on first sign-in; contact <email> if needed", or
- turn off "new device verification" in Clerk before submitting (Claude can do this).

**TODO** create the demo account once production sign-in is set up (production Clerk has its own users).

## Data safety (Policy → App content → Data safety)

General: data is **encrypted in transit**; users **can request deletion** (in-app and the web link above); the app does **not** sell data or share it with third parties for their own purposes. Processors acting for Cal-Fit (Clerk, Neon, OpenAI, Trigger.dev, RevenueCat, Google Play billing) count as service providers, so nothing is "shared" in Play's sense.

| Data type | Collected | Required? | Purposes |
|---|---|---|---|
| Personal info → Name | Yes | Optional (from sign-up or Google/Apple) | Account management, App functionality |
| Personal info → Email address | Yes | Required | Account management, App functionality, Developer communications (only with the opt-in) |
| Personal info → User IDs | Yes | Required | Account management, App functionality |
| Health and fitness → Health info | Yes (weight, height, age, gender, meals and nutrition) | Required | App functionality, Personalization |
| Health and fitness → Fitness info | Yes (activity level, workout check-ins) | Optional | App functionality |
| Photos and videos → Photos | Yes (meal and progress photos) | Optional | App functionality |
| Financial info → Purchase history | Yes (scan packs) | Optional | App functionality |
| Location, contacts, messages, audio, files, calendar, web history, device IDs | No | | |
| App activity, app info and performance | No (no analytics or crash SDKs) | | |

## Release (Test and release)

1. Closed testing → create a track, add at least **12 testers** (Google accounts, by email list or Google Group).
2. Upload the `.aab` from `eas build --platform android --profile production`. The first upload must be done by hand in Play Console; later ones can use `eas submit`.
3. Keep the closed test running **14 days** with testers opted in, then apply for production access.

## Screenshots to capture

Phone, 9:16, at least 1080×1920: Welcome, Home dashboard, AI scan result, Foods search, Progress charts, Profile.

## Before going public

- Done: Clerk production on `calfit.bornomala.site` with Google, the `role` claim, Neon trusting its JWKS, and `calfit://sso-callback` allowed. Apple waits for the Apple Developer account (hidden on Android).
- Developer name in `src/constants/legal.ts` (`OPERATOR`, **TODO**).
- RevenueCat Play Store app + products `calfit_scans_20` / `calfit_scans_100`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
