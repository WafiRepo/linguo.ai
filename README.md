# Lingua — AI Language Learning App

A Duolingo-inspired mobile app for learning languages with a real-time **AI voice teacher**, built with Expo and React Native.

This fork extends the original tutorial project with **Bahasa Indonesia** curriculum, practice quizzes, tutor voice settings (Traditional Chinese / English), and production deployment guides.

## Features

- **Onboarding & auth** — Clerk sign-in/sign-up
- **Language selection** — Indonesian (full curriculum) + other languages
- **AI voice lessons** — Stream Video + Vision Agent (Sari, your AI teacher)
- **Practice mode** — Multiple-choice & translate quizzes from lesson content
- **Progress tracking** — XP, streak, active lesson, "In progress" badge
- **Home dashboard** — Daily goal, continue learning, today's plan

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | Expo 54, React Native, TypeScript, Expo Router |
| Styling | NativeWind v5, Tailwind CSS |
| State | Zustand + AsyncStorage |
| Auth | Clerk |
| Voice / Video | Stream Video, Stream Vision Agents |
| AI | OpenAI Realtime (via Python vision-agent) |
| Analytics | PostHog (optional) |

## Project Structure

```txt
app/              # Routes (tabs, lesson, practice, API routes)
components/       # Reusable UI
data/             # Languages, units, lesson content
lib/              # Curriculum, practice, API helpers
store/            # Zustand stores
vision-agent/     # Python AI teacher service
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- Python 3.12+ (for vision-agent)
- Android emulator / iOS simulator / physical device with **dev client** (required for voice lessons — not Expo Go)

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your keys:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
STREAM_API_KEY=...
STREAM_API_SECRET=...
VISION_AGENT_URL=http://YOUR_LOCAL_IP:8000
```

Get keys from [Clerk](https://clerk.com), [Stream](https://getstream.io), and [OpenAI](https://platform.openai.com).

### 3. Start the vision agent

```bash
cd vision-agent
pip install "vision-agents[getstream,openai]" python-dotenv
# Add OPENAI_API_KEY to vision-agent/.env
python main.py serve-cmd --host 0.0.0.0 --port 8000
```

### 4. Start the mobile app

```bash
npx expo start --dev-client --android
# or --ios
```

For a physical device on the same network, set `VISION_AGENT_URL` to your PC's LAN IP (not `localhost`).

## Practice Mode

On the **Learn** tab, switch to **Practice**:

- **Mixed review** — random questions from unlocked lessons
- **Practice by lesson** — quiz per lesson (multiple-choice & translate)

## Deploy for Testers

To share the app with others (beta testers), you must deploy:

1. **Vision Agent** → Railway / Fly.io
2. **API routes** → EAS Hosting (`eas deploy --prod`)
3. **Mobile app** → EAS Build (APK / TestFlight)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step guide (Indonesian).

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run web` | Web (voice lessons not supported) |
| `npm run deploy:api` | Deploy API routes to EAS Hosting |
| `npm run build:android:preview` | Build Android APK for beta |
| `npm run lint` | Run ESLint |

## Web Limitation

Voice lessons require native WebRTC and are **not available on web**. The web build shows a fallback screen; use Android/iOS for full functionality.

## License

Educational project. See original tutorial by [JavaScript Mastery](https://www.youtube.com/@javascriptmastery).

## Links

- [Expo Documentation](https://docs.expo.dev/)
- [Stream Video Docs](https://getstream.io/video/docs/)
- [Clerk Expo](https://clerk.com/docs/expo/overview)
