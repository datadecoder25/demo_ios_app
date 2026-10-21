# EAS Build Setup Guide

## Prerequisites

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to EAS:
   ```bash
   eas login
   ```

3. Create a new EAS project:
   ```bash
   eas project:configure
   ```

## Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual configuration values:
   - `EXPO_PUBLIC_NEON_API_URL` - Your Neon Postgres REST API URL
   - `EXPO_PUBLIC_NEON_API_KEY` - Your Neon API key
   - `EXPO_PUBLIC_IMAGEKIT_URL_ENDPOINT` - Your ImageKit URL endpoint
   - `EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY` - Your ImageKit public key
   - `EXPO_PUBLIC_TRIGGER_DEV_URL` - Your Trigger.dev webhook URL
   - `EXPO_PUBLIC_OPENAI_API_KEY` - Your OpenAI API key

## Build Commands

### Development Build (for testing with Expo Go)

```bash
eas build:development
```

### Preview Build (for TestFlight/Play Store testing)

```bash
eas build --profile preview
```

### Production Build

```bash
eas build --profile production
```

## Submit to App Stores

### iOS (App Store)

```bash
eas submit --platform ios
```

### Android (Google Play Store)

```bash
eas submit --platform android
```

## Build Profiles

### development
- For development testing
- Uses development client
- iOS: m1-medium resource class

### preview
- For internal testing
- APK for Android
- iOS: m1-medium resource class

### production
- For App Store/Play Store submission
- Auto-increment version
- iOS: m1-large resource class
- Android: app-bundle format

## Notes

- Make sure to update `app.json` with your EAS project ID after running `eas project:configure`
- The `.env` file is gitignored - never commit it to version control
- For iOS builds, you need an Apple Developer account
- For Android builds, you need a Google Play Console account
