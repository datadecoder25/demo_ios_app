# CalFit Implementation Plan

> **Version**: 1.0  
> **Last Updated**: 2026-10-21  
> **Tech Stack**: Expo (SDK 52+), React Native, TypeScript, Clerk Auth, Neon Postgres, ImageKit, Trigger.dev, Sentry, In-App Purchases

---

## 1. Spec Summary

### Product
**CalFit**: An AI-powered calorie-tracking mobile app where users snap meal photos → AI analyzes nutrition (calories, protein, carbs, fat, fiber) → personalized daily goals (lose/gain/maintain weight) + credit-based usage (4 free analyses/month, then $X/credit).

### Users
- **Primary**: Health/fitness enthusiasts tracking macros.
- **Secondary**: Caregivers logging meals for others (guest → logged-in merge supported).

### Scope (v1 In)
- ✅ Auth: Google, Apple, Anonymous (Clerk)
- ✅ Onboarding: Age, height, weight, activity level, medical conditions, goals (lose/gain/maintain)
- ✅ Meal logging: Photo + manual entry (free-form + optional photo)
- ✅ AI analysis: OpenAI (5-core macros only, 5-10s latency)
- ✅ Credits: 4 free/month, in-app purchases (iOS/Android), Stripe fallback
- ✅ Daily progress: Real-time calorie target tracking (system theme)
- ✅ Profile editing: Change goals, units (Imperial/Metric toggle)
- ✅ Meal history: View/delete past meals, edit AI recommendations
- ✅ Error handling: Retry logic (3x), blurry image alerts, offline error messages

### Scope (v1 Out)
- ❌ Social features (share meals, friends)
- ❌ Barcode scanning
- ❌ Push notifications
- ❌ Weight history tracking (current weight only)
- ❌ Micronutrient breakdown (vitamins/minerals)
- ❌ Web/PWA support

### Core Flows
1. **New User**: App → Clerk Sign-up → Onboarding → Home Screen
2. **Meal Logging**:
   - Photo: Home → Camera → AI Analysis → Edit Recommendations → Save → Daily Total Updated
   - Manual: Home → "+" → Free-form form + optional photo → Save → Daily Total Updated
3. **Credit Purchase**: Profile → Buy Credits → In-App Purchase (iOS/Android) → Credits Added
4. **Profile Edit**: Profile → Edit Personal Info/Goal → Save

### Data Model
| Entity | Key Fields | Relationships |
|--------|------------|---------------|
| `User` | id, clerk_id, anonymous_id, email, phone, created_at | One-to-many meals, one-to-one profile |
| `Profile` | user_id, age, height, weight, activity_level, medical_conditions, goal, unit_preference (imperial/metric), daily_calorie_target | Belongs to one user |
| `Meal` | id, user_id, photo_url, analysis_json (cached), created_at, is_manual, manual_name, is_deleted | Belongs to one user, many-to-many meal_foods |
| `MealFood` | meal_id, food_name, calories, protein, carbs, fat, fiber | Many-to-one meal |
| `CreditTransaction` | id, user_id, amount, type (free/purchase/used), reference_id (meal_id/charge_id), created_at | Belongs to one user |
| `ImageCache` | id, image_url, hash, analysis_json, expires_at | For AI response caching |

### Architecture
```
Expo Mobile App (React Native)
│
├── Auth → Clerk (Google/Apple/Anonymous)
├── Local Storage → Expo SecureStore (auth tokens, offline state)
├── Image Upload → ImageKit (HTTP POST + presets: food-analysis, thumbnail)
│
├── API Layer (Neon Postgres REST via Supabase Client or direct HTTP)
│   ├── User/Profile CRUD
│   ├── Meal/MealFood CRUD
│   ├── CreditTransaction CRUD
│   └── ImageCache CRUD
│
├── AI Analysis (Trigger.dev Background Job)
│   ├── Upload image to ImageKit → Get URL
│   ├── Call OpenAI (GPT-4o mini) with image + prompt
│   ├── On Success: Deduct credits, Save to Neon, Cache AI response
│   └── On Failure: Retry (3x), Notify User
│
├── Error Tracking → Sentry (react-native-sentry)
└── Theme → React Native Paper or Expo Theme (system auto-detect)
```

### Integrations
| Tool | Responsibility |
|------|----------------|
| **Clerk** | Auth (Google/Apple/Anonymous), user sessions, anonymous → logged-in merge |
| **Neon Postgres** | REST API for User, Profile, Meal, CreditTransaction, ImageCache tables |
| **ImageKit** | Image storage, compression, transformations (food-analysis, thumbnail) |
| **OpenAI** | GPT-4o mini for image analysis (calories, macros) |
| **Trigger.dev** | Background jobs: ImageKit upload → OpenAI → Neon save + credit deduction |
| **Sentry** | Error tracking, performance monitoring (iOS/Android crashes) |
| **In-App Purchase** | Credit purchases (iOS App Store, Google Play Billing) |

---

## 2. Assumptions

1. **ImageKit Presets**: `food-analysis` (resize to 1024px max, WebP, quality 80) + `thumbnail` (200x200, circle crop).  
   **If wrong**: Adjust in ImageKit dashboard after setup.

2. **Credit Purchase Flow**: Primary = in-app purchases (iOS/Android mandatory), fallback = Stripe (web).  
   **If wrong**: Switch to Stripe-only or add more options.

3. **Blurry Image Detection**: Client-side heuristic (image entropy calculation via Expo Camera).  
   **If wrong**: Move to server-side via ImageKit webhook.

4. **Guest User Data Retention**: Anonymous meals stored 30 days before auto-deletion (unless user logs in).  
   **If wrong**: Extend or remove retention period.

5. **AI Response Caching**: Cache per image hash for 24 hours (avoid re-analyzing same image).  
   **If wrong**: Increase cache duration or remove caching.

6. **Daily Progress**: Real-time SUM of meals today (no future-dated meals allowed).  
   **If wrong**: Add future-date validation or adjust logic.

7. **Profile Weight**: Current weight only (no history).  
   **If wrong**: Add `WeightLog` table with date tracking.

---

## 3. Open Risks / Unknowns

| Risk | Impact | Mitigation |
|------|--------|------------|
| **OpenAI image size limits** | GPT-4o mini max 20MB input; users might crop >20MB files. | Enforce 10MB *file size* limit + check metadata. |
| **ImageKit rate limits** | Free tier = 2k images/month. If exceeded, cost jumps. | Monitor usage, add warning UI ("80% of monthly limit used"). |
| **Clerk anonymous limits** | Free tier = 10k anonymous users/month. Scale = cost spike. | Track anonymous users, upgrade to paid tier early. |
| **In-app purchase compliance** | Apple rejects apps skipping IAP for digital goods. | Use `react-native-iap` + Stripe fallback (web-only). |
| **Blurry image false positives** | Heuristic detection might misclassify images. | Add user feedback button ("Was this image blurry?") to improve. |
| **AI analysis accuracy** | OpenAI might miscount macros for complex meals. | Show confidence scores (if available) + manual edit option. |

---

## 4. Milestone Breakdown

### Phase 1: Foundation (Week 1-2)
- [ ] Initialize Expo project with TypeScript
- [ ] Set up Clerk Auth (Google/Apple/Anonymous)
- [ ] Configure Sentry (error tracking)
- [ ] Create Neon Postgres schema (User, Profile, Meal, CreditTransaction, ImageCache)
- [ ] Build auth flow: Sign-up → Onboarding → Home Screen

### Phase 2: Core Meal Logging (Week 3-4)
- [ ] Implement Camera screen (new photo + camera roll)
- [ ] Add 10MB image size limit + blurry image detection
- [ ] ImageKit upload (HTTP POST + presets)
- [ ] Manual entry form (free-form + optional photo)
- [ ] Save meals to Neon Postgres

### Phase 3: AI Analysis (Week 5-6)
- [ ] Set up Trigger.dev job: ImageKit upload → OpenAI → Neon save
- [ ] Implement retry logic (3x for failures)
- [ ] Cache AI responses (ImageCache table)
- [ ] Credit deduction (on successful analysis)
- [ ] Results screen (edit recommendations + save)

### Phase 4: Credits & Profile (Week 7)
- [ ] Integrate In-App Purchases (`react-native-iap`)
- [ ] Stripe fallback (web-only)
- [ ] Credit balance display + purchase flow
- [ ] Profile screen: Edit personal info, goals, units (Imperial/Metric toggle)
- [ ] Daily progress screen: Calorie target + macro breakdown

### Phase 5: Polish & Testing (Week 8)
- [ ] Meal history: View/delete past meals
- [ ] Guest → logged-in merge logic
- [ ] Theme: System auto-detect
- [ ] Offline handling: Immediate error for 0 credits
- [ ] End-to-end testing (iOS + Android)
- [ ] Performance tuning (image compression, API latency)

---

## 5. Non-Negotiables for v1

| Requirement | Implementation |
|-------------|----------------|
| **Expo Go Compatibility** | Use `expo install` for all packages; avoid bare React Native code unless config plugins exist. |
| **TypeScript Strict Mode** | Enable `strict: true` in `tsconfig.json`. |
| **Neon Postgres REST API** | No direct Postgres driver from Expo; use Supabase Client or `fetch` + REST endpoints. |
| **Clerk Auth** | Use `@clerk/expo` SDK for Google/Apple/anonymous + merge logic. |
| **In-App Purchases** | `react-native-iap` with iOS/Google Play config (mandatory for digital goods). |
| **Sentry Integration** | `@sentry/react-native` (Expo config plugin). |
| **ImageKit HTTP Upload** | No SDK needed; POST to `https://upload.imagekit.io/{endpoint}`. |
| **Trigger.dev Background Jobs** | HTTP-triggered via `fetch()` from Expo (no SDK needed). |
| **Blurry Image Detection** | Client-side (Expo Camera + image entropy). |

---

## 6. Next Steps

1. **Review this plan** → Confirm assumptions/risks.
2. **Initialize Expo project** → `bunx create-expo-app` with TypeScript.
3. **Set up Clerk Auth** → Google/Apple/Anonymous configuration.
4. **Create Neon Postgres schema** → Run SQL in Neon dashboard.

---

**Ready to proceed?**  
Let me know if you want to adjust any section before I scaffold the Expo project.
