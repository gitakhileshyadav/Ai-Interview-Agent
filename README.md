# InterviewAI

A web-based AI interview practice platform that helps you practice interviews with an AI interviewer, get detailed performance analytics, and track your progress over time.


## 🚀 Features

- **Voice-enabled interviews** - Speak naturally with real-time speech recognition and text-to-speech
- **AI interviewer** - Conversational and professional AI interviewer
- **Three interview types** - Technical, Behavioral, HR
- **Experience levels** - Junior, Mid, Senior, Lead
- **Authentication** - Register/login with secure JWT storage
- **Performance charts** - Radar, line trend, and bar charts showing skill development
- **Detailed reports** - Overall score + section breakdowns
- **Full transcript** - Complete interview transcript with AI and candidate messages
- **Progress tracking** - Session history and score improvements

## 🛠️ Technology Stack

- **Frontend**: Vite + Vanilla JavaScript (ES Modules)
- **API**: Server-side proxies (no API keys in the browser)
- **Database**: Turso (SQLite-compatible, embedded SQL)
- **Speech**: Web Speech API (Chrome/Edge native)
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js v18+
- Chrome or Edge browser (Web Speech API support)
- API keys for AI functionality (configured on server)

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd interview-voice-agent

# Install dependencies
npm install

# Run development server
npm run dev
```

The app runs at `http://localhost:5173` by default.

## 🎯 How to Use

1. **Register/Login** - Create an account or log in
2. **Navigate to Interview** - Go to `#/interview` (authentication required)
3. **Configure Session** - Select role, interview type, and experience level
4. **Start Interview** - AI interviewer begins the conversation
5. **Speak your answers** - Click microphone, respond verbally
6. **View Report** - After interview, access `#/report/{sessionId}`
7. **Check Dashboard** - Review performance history and analytics

## 📁 Project Structure

```
interview-voice-agent/
├── .env                    # Environment config (gitignored)
├── .gitignore              # Git ignore rules
├── index.html              # Entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── vercel.json             # Vercel deployment config
│
├── src/                    # Source code
│   ├── main.js            # App entry, router, toast system
│   ├── config.js          # Client config (no secrets)
│   ├── pages/            # Page components
│   ├── components/       # Reusable UI components
│   ├── styles/           # CSS stylesheets
│   └── services/         # API service modules
│
├── api/                    # Serverless API routes
│   ├── auth/             # Auth handlers
│   ├── chat.mjs          # AI chat proxy
│   ├── db.mjs            # Database operations proxy
│   └── lib/              # Database utilities
│
├── public/                 # Static assets
│   ├── 404.html
│   └── favicon.svg
│
└── docs/                   # Documentation folder
    ├── Getting-Started.md
    ├── Project-Overview.md
    ├── File-Reference.md
    └── Tutorial-Flow.md
```

## 📋 API Routes

All API calls are proxied server-side - no external keys reach the browser:

| Route | Description |
|-------|-------------|
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | User login |
| `GET /api/auth/me` | Get current user (validates token) |
| `POST /api/db` | Execute SQL statements |
| `POST /api/chat` | AI chat completion |

## 📄 License

Private - All rights reserved.

---
*This README does not reference specific model names to maintain generality.*