# InterviewAI

A web-based AI interview practice platform that lets you practice interviews with an AI interviewer, get detailed performance analytics, and track your progress over time.

![InterviewAI](public/favicon.svg)

## 🚀 Features

- **Voice-enabled interviews** - Speak naturally with real-time speech recognition and text-to-speech
- **AI interviewer** ("Alex") powered by LLaMA 3.3-70B, conversational and professional
- **Three interview types**: Technical (coding/system design), Behavioral (STAR method), HR (culture fit)
- **Experience levels**: Junior, Mid, Senior, Lead/Principal
- **Authentication** - Register/login with secure JWT storage
- **Performance charts** - Radar, line trend, and bar charts showing skill development
- **Detailed reports** - Overall score + communication, technical, confidence, problem-solving breakdowns
- **Full transcript** - Complete interview transcript with AI and candidate messages
- **Progress tracking** - Session history, completion rates, score improvements

## 🛠️ Tech Stack

- **Frontend**: Vite, ES Modules, Chart.js
- **API**: Server-side proxies (Vercel) - no API keys in the browser
- **Database**: Turso (SQLite-compatible)
- **Speech**: Web Speech API (Chrome/Edge native)
- **AI**: LLaMA 3.3-70B via server-side proxy
- **Styling**: CSS custom properties, modern gradient design

## 📋 Prerequisites

- Node.js 18+
- Chrome or Edge browser (Web Speech API support)
- Turso database account (for persistent data)

## 🔧 Installation

```bash
# Clone the repository
git clone 

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env  # Or create .env with required variables
```

## 🌿 Environment Variables

Create a `.env` file in the project root:

```
# Vercel deployment URL (for API proxy routes)
VERCEL_URL=your-vercel-url

# Optional: Customize app configuration
VITE_APP_NAME=InterviewAI
VITE_APP_VERSION=1.0.0
```

The `.env` file is already gitignored - secrets stay server-side.

## ▶️ Running the App

```bash
# Start development server (Vite, port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app runs at `http://localhost:5173` by default.

## 🎯 How to Use

### 1. **Register / Login**
- Navigate to `/login` or `/register`
- Create an account with name, email, and password
- JWT token stored in localStorage for authenticated routes

### 2. **Start an Interview**
- Go to `/interview` (requires authentication)
- Select your **target role** (e.g., Software Engineer)
- Choose **interview type**: Technical, Behavioral, or HR
- Select **experience level**: Junior, Mid, Senior, or Lead
- Click "Start Interview" - Alex will begin the conversation

### 3. **During the Interview**
- Click the microphone button to speak your answers
- Alex will listen, respond, and ask follow-up questions
- Progress tracker shows question number and percentage complete
- Real-time transcript displays the conversation

### 4. **View Your Report**
- Interview auto-ends after 12 questions or click "End Interview"
- Navigate to `/report/{sessionId}` to view your detailed analysis
- See overall score + section breakdowns
- Review strengths, weaknesses, and actionable recommendations
- Read the full transcript and export via print

### 5. **Track Progress**
- Dashboard at `/dashboard` shows your session history
- Charts visualize scores over time and by interview type
- Stat cards track total sessions, completion rate, average/best scores

## 📁 Project Structure

```
interview-voice-agent/
├── .env                    # Environment config (gitignored)
├ .gitignore               # Git ignore rules
├── index.html              # Entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration with API proxy
├── vercel.json           # Vercel deployment config
├── dist/                   # Production build output
│
├── public/                 # Static assets
│   ├── 404.html
│   └── favicon.svg
│
├── src/
│   ├── main.js             # App entry, router, toast system
│   ├── config.js           # Client config (no secrets)
│   ├── styles/             # CSS per-page styles
│   │   ├── main.css
│   ├── auth.css
│   ├── dashboard.css
│   └── interview.css
│   ├── pages/              # Page components
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── dashboard.js
│   │   ├── interview.js
│   │   └── report.js
│   ├── components/         # Reusable components
│   │   └── charts.js       # Chart.js radar/line/bar charts
│   └── services/           # API service modules
│       ├── auth.js         # Register, login, getCurrentUser, logout
│       ├── turso.js        # Database operations (server proxy)
│       ├── interview.js    # AI interviewer engine
│       └── speech.js       # Web Speech API wrapper
│
└── api/                    # Serverless API routes (Vercel)
    ├── auth/
    │   └── route.mjs
    ├── chat.mjs          # AI chat proxy
    ├── db.mjs            # Database operations proxy
    └── lib/              # Database utilities
```

## 🔌 API Routes

All API calls are proxied server-side - no external keys reach the browser:

| Route | Description |
|-------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | User login |
| `GET /api/auth/me` | Get current user (validates token) |
| `POST /api/db` | Execute SQL statements |
| `POST /api/chat` | AI chat completion (LLaMA 3.3-70B) |

## 🗄️ Database Schema

Key tables (managed server-side via Turso):

- **users** - id, name, email, password_hash, created_at
- **sessions** - id, user_id, title, role, interview_type, experience_level, status, score, duration, created_at, completed_at
- **messages** - id, session_id, role, content, timestamp
- **analysis** - id, session_id, strengths, weaknesses, overall_score, communication_score, technical_score, confidence_score, problem_solving_score, summary, recommendations, created_at

## 🚀 Deployment

This project is configured for **Vercel** deployment (`vercel.json` included):

```bash
vercel
```

The Vite config proxies API calls during development:
- `localhost:5173/api/*` → `http://localhost:3000` (local dev)
- Production proxies to your Vercel deployment URL

## 📦 Built With

- [Vite](https://vitejs.dev/) - Frontend tooling
- [Chart.js](https://chartjs.org/) - Data visualization
- [Turso](https://turso.tech/) - Embedded SQL database
- [Web Speech API] - Browser-native speech recognition & synthesis
- [LLaMA 3.3-70B] - AI model via server proxy

## 📄 License

Private - All rights reserved.