# InstaPost Generator

AI-powered Instagram post generator that turns a news link or topic prompt into an editable social media package with captions, hashtags, image suggestions, post templates, and optional video clipping controls.

## Overview

InstaPost Generator is a full-stack web application built for creators, social media teams, and news pages that need to quickly convert an article or idea into an Instagram-ready post. Users can paste an article URL, generate directly from a prompt, search for news sources, edit the generated copy, customize the visual design, and export a 4:5 post layout.

## Features

- Generate Instagram post content from a news article link
- Generate post ideas directly from a topic prompt
- Search news sources before creating a post
- Create multiple caption styles for different tones
- Generate hashtags and keywords
- Suggest post headlines and subheadlines
- Preview editable Instagram-style post visuals
- Switch templates, fonts, colors, padding, and overlay opacity
- Upload and swap custom images
- Use AI providers such as Gemini, OpenAI, Groq, or fallback mode
- Optional image sources through Unsplash and Pexels
- Optional video-aware workflow for articles with video metadata
- Maintains source and post history during the session

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS

### Backend

- Node.js
- Express
- Axios
- RSS Parser
- Mozilla Readability
- JSDOM
- Google Gemini SDK
- OpenAI SDK

## Project Structure

```text
instapostgenerator/
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── config.js
│   └── server.js
├── frontend/
│   ├── assets/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── lib/
│       ├── App.jsx
│       └── main.jsx
├── .env.example
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm
- API key for at least one AI provider if you want live AI generation

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/instapostgenerator.git
cd instapostgenerator
```

Install root dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

Create a local environment file:

```bash
cp .env.example .env
```

Add your API keys inside `.env`.

## Environment Variables

```env
PORT=3000

AI_PROVIDER=gemini
AI_FALLBACK_PROVIDER=groq

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1

NEWS_API_KEY=
UNSPLASH_ACCESS_KEY=
PEXELS_API_KEY=
```

Supported AI providers:

- `gemini`
- `openai`
- `groq`
- `fallback`

## Running Locally

Start both backend and frontend in development mode:

```bash
npm run dev
```

Backend runs on:

```text
http://localhost:3000
```

Frontend runs through Vite, usually on:

```text
http://localhost:5173
```

## Build

Create a production frontend build:

```bash
npm run build
```

Start the backend server:

```bash
npm start
```

The Express server serves the built frontend from `frontend/dist`.

## API Routes

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | Checks backend and AI provider readiness |
| GET | `/api/health` | API health check |
| GET | `/api/asset` | Proxies image or media assets |
| POST | `/api/search-news` | Searches news sources for a topic |
| POST | `/api/generate-from-link` | Generates a post from an article URL |
| POST | `/api/generate-post` | Generates a post from a prompt |

## Scripts

```bash
npm run dev
```

Runs backend and frontend together.

```bash
npm run dev:backend
```

Runs only the backend with Nodemon.

```bash
npm run dev:frontend
```

Runs only the Vite frontend.

```bash
npm run build
```

Builds the frontend for production.

```bash
npm start
```

Starts the production server.

```bash
npm test
```

Runs a basic Node syntax check on the backend server.

## How It Works

1. The user enters a news article URL or topic prompt.
2. The backend extracts article content or searches news sources.
3. The selected AI provider generates captions, headlines, hashtags, keywords, and design copy.
4. The frontend displays the generated post package.
5. The user edits captions, visual settings, image selection, and template options.
6. The final design can be used as an Instagram-ready post asset.

## GitHub Repository Description

```text
AI-powered Instagram post generator that converts news links or topic prompts into editable captions, hashtags, image-based post designs, and social media-ready visuals.
```

## Suggested GitHub Topics

```text
react
vite
tailwindcss
nodejs
express
ai
instagram
content-generation
social-media
news
gemini
openai
groq
```

## Presentation Points

- Built a full-stack AI content generation workflow
- Supports both URL-based and prompt-based generation
- Includes multiple AI provider options with fallback support
- Provides an editable visual post studio instead of only text output
- Includes source search, post history, captions, hashtags, and design controls
- Designed for practical creator and social media team workflows

## Important Security Note

Never commit your real `.env` file or API keys to GitHub. This project includes `.env.example` for safe configuration sharing, while `.env` is ignored by Git.

## License

This project is available under the ISC license.
