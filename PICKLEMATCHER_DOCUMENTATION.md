{
  `path`: `PICKLEMATCHER_DOCUMENTATION.md`,
  `content`: `# PickleMatcher - Project Documentation & Knowledge Base

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Stack](#technical-stack)
3. [Project Structure](#project-structure)
4. [Feature Documentation](#feature-documentation)
5. [Google Sheets Integration](#google-sheets-integration)
6. [Algorithm Details](#algorithm-details)
7. [Environment Configuration](#environment-configuration)
8. [API Endpoints](#api-endpoints)
9. [Component Architecture](#component-architecture)
10. [Deployment Guide](#deployment-guide)
11. [Known Issues & Solutions](#known-issues--solutions)
12. [Future Enhancement Ideas](#future-enhancement-ideas)
13. [Quick Reference Commands](#quick-reference-commands)

---

## Project Overview

**PickleMatcher** is a real-time pickleball match scheduling application that automatically creates fair matchups, tracks statistics, and synchronizes data across all users.

### Core Purpose
- Create balanced pickleball matches ensuring players don't repeatedly partner together
- Track win/loss statistics for competitive play
- Provide real-time synchronization for multiple users
- Ensure equal playing time for all participants

### Key Metrics
- **Minimum Players**: 4
- **Optimal Players**: 6-12
- **Sync Interval**: 10 seconds
- **Data Storage**: Google Sheets
- **Framework**: Next.js 15.3.3

---

## Technical Stack

### Frontend
- **Framework**: Next.js 15.3.3 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Library**: Lucide React (icons)
- **Font**: Roboto Flex

### Backend
- **API Routes**: Next.js API Routes
- **Database**: Google Sheets (via Google Sheets API)
- **Authentication**: Service Account (Google Cloud)

### Infrastructure
- **Hosting**: Vercel
- **Environment Management**: Vercel Environment Variables
- **Version Control**: Git

---

## Project Structure

```
pickleball-scheduler/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── players/
│   │   │   │   └── route.js         # GET/POST/DELETE players
│   │   │   └── schedule/
│   │   │       └── route.js         # GET/POST schedule & stats
│   │   ├── favicon.ico
│   │   ├── globals.css              # Tailwind imports
│   │   ├── layout.tsx               # Root layout with metadata
│   │   └── page.tsx                 # Home page (renders scheduler)
│   │
│   ├── components/
│   │   └── pickleball_scheduler.tsx # Main component (1100+ lines)
│   │
│   └── lib/
│       └── sheets.js                # Google Sheets API wrapper
│
├── public/
│   └── pickleball.svg              # App icon (yellow ball with holes)
│
├── .env.local                      # Environment variables (not in git)
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.ts
```

---

## Feature Documentation

### 1. Player Management
- **Add Players**: Single or comma-separated bulk entry
- **Remove Players**: Individual removal with trash icon
- **Clear All**: Removes all players and resets entire app
- **Persistence**: Stored in Google Sheets \"Players\" tab

### 2. Schedule Generation
- **Algorithm**: Smart matching to avoid repeated partnerships
- **Settings**: 
  - Number of rounds (1-20)
  - Available courts (1-10)
- **Sit-outs**: Automatically handles odd number of players
- **Visual Design**: Material design with shadows and hover states

### 3. Match Recording
- **Winner Selection**: Click \"Winner\" button for winning team
- **Visual Feedback**: 
  - Green highlight for winners
  - Trophy icon
  - Grayed out losing team
- **Clear Result**: Reset button to undo winner selection

### 4. Statistics Tracking
- **Metrics**: Wins, Losses, Win Percentage
- **Display**: Below schedule in grid format
- **Sorting**: Automatically sorted by win percentage
- **Visibility**: Also saved to Google Sheets \"Stats\" tab

### 5. Real-time Synchronization
- **Polling Interval**: 10 seconds
- **Debouncing**: 1-second delay before saving
- **Conflict Prevention**: 3-second cooldown after saves
- **Visibility Check**: Only polls when browser tab is active

---

## Google Sheets Integration

### Sheet Structure
1. **Players Sheet**
   - Column A: Player names
   - Row 1: Header (\"Player Name\")
   - Visible to users

2. **Stats Sheet** (Auto-created)
   - Column A: Player name
   - Column B: Wins
   - Column C: Losses
   - Column D: Win %
   - Visible to users

3. **ScheduleData Sheet** (Auto-created)
   - Cell A1: JSON blob containing schedule and stats
   - Hidden from users
   - Format: `{\"schedule\":[...],\"stats\":{...}}`

### Service Account Setup
```javascript
// Required Google Cloud APIs:
// - Google Sheets API

// Scopes:
['https://www.googleapis.com/auth/spreadsheets']

// Permissions:
// Service account needs Editor access to spreadsheet
```

---

## Algorithm Details

### Match Generation Algorithm
```javascript
// Pseudocode
1. Shuffle all players randomly
2. For each round:
   a. Sort players by games played (ascending)
   b. For each possible team combination:
      - Calculate score based on:
        * Games played (heavily favor fewer games)
        * Partnership frequency (exponential penalty)
        * Previous matchups (bonus for new matchups)
        * Team balance (slight preference)
      - Select best scoring match
   c. Remove matched players from available pool
   d. Repeat until courts filled or insufficient players
```

### Scoring Weights
- **Fewer games bonus**: `(playerCount * 10 - totalGames * 5)`
- **Partnership penalty**: `Math.pow(partnerships, 3) * 50`
- **New matchup bonus**: `+30`
- **Repeated matchup penalty**: `-15`

---

## Environment Configuration

### Required Environment Variables
```bash
# Google Sheets Configuration
GOOGLE_SHEETS_ID=1bXiJD96zEl1YESie-HOuqHSOuKaBKqrRQSI7b1LBF28
GOOGLE_API_KEY=your-api-key

# Service Account Credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\
...\
-----END PRIVATE KEY-----\
\"
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_CLIENT_ID=your-client-id
```

### Local Development
Create `.env.local` file with above variables.

### Production (Vercel)
Add via Vercel Dashboard → Settings → Environment Variables

---

## API Endpoints

### `/api/players`
**GET**: Fetch all players
```json
Response: {
  \"players\": [\"John\", \"Jane\", \"Mike\", \"Sarah\"]
}
```

**POST**: Add/Remove/Clear players
```json
Request: {
  \"action\": \"add|remove|clear\",
  \"names\": [\"John\", \"Jane\"],  // for add
  \"name\": \"John\"              // for remove
}
```

### `/api/schedule`
**GET**: Fetch schedule and stats
```json
Response: {
  \"schedule\": [...],
  \"stats\": {
    \"John\": {\"wins\": 2, \"losses\": 1, \"games\": 3}
  }
}
```

**POST**: Save schedule and stats
```json
Request: {
  \"schedule\": [...],
  \"stats\": {...}
}
```

---

## Component Architecture

### Main Component State
```typescript
// src/components/pickleball_scheduler.tsx
const [players, setPlayers] = useState<string[]>([]);
const [schedule, setSchedule] = useState<Round[]>([]);
const [playerStats, setPlayerStats] = useState<{[key: string]: PlayerStats}>({});
const [rounds, setRounds] = useState(3);
const [availableCourts, setAvailableCourts] = useState(2);
const [isGenerating, setIsGenerating] = useState(false);
const [isSavingSchedule, setIsSavingSchedule] = useState(false);
const [lastSaveTime, setLastSaveTime] = useState(0);
```

### Type Definitions
```typescript
interface Match {
  team1: string[];
  team2: string[];
  court: number;
  winner?: number;
}

interface Round {
  round: number;
  matches: Match[];
  sitOut: string[];
  gameCount: { [key: string]: number };
}

interface PlayerStats {
  wins: number;
  losses: number;
  games: number;
}
```

---

## Deployment Guide

### Prerequisites
1. Vercel account
2. GitHub repository
3. Google Cloud service account
4. Environment variables ready

### Deployment Steps
```bash
# 1. Build locally
npm run build

# 2. Deploy via CLI
vercel --prod

# 3. Or connect GitHub repo in Vercel dashboard
```

### Post-Deployment
1. Verify environment variables in Vercel
2. Test all functionality
3. Share URL with users

---

## Known Issues & Solutions

### Issue 1: Winner Selection Requires Two Clicks
**Cause**: Polling overwrites state during save
**Solution**: Implemented 3-second cooldown after saves

### Issue 2: Multiple Groups Conflict
**Cause**: Single shared data source
**Solution**: Added warning in help modal about single-group usage

### Issue 3: Private Key Formatting
**Cause**: Newline characters in environment variable
**Solution**: Keep `\
` in string, Vercel handles conversion

---

## Future Enhancement Ideas

### High Priority
1. **Tournament Mode**: Bracket-style elimination
2. **Player Ratings**: ELO or skill-based matching
3. **Match History**: View past games and statistics
4. **Export Function**: Download schedules as PDF/CSV

### Medium Priority
1. **WebSocket Integration**: Replace polling with real-time updates
2. **Multiple Groups**: Isolated sessions with codes
3. **Court Assignments**: Automatic court rotation
4. **Time Tracking**: Match duration logging

### Nice to Have
1. **Mobile App**: React Native version
2. **Notifications**: Match ready alerts
3. **Themes**: Dark mode, color customization
4. **Analytics**: Performance graphs over time

---

## Quick Reference Commands

### Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm start
```

### Git Commands
```bash
# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m \"Description of changes\"

# Push to GitHub
git push origin main
```

### Vercel Commands
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Add environment variable
vercel env add VARIABLE_NAME

# Check deployment status
vercel ls
```

### Debugging
```bash
# Check logs in Vercel
vercel logs

# Test API endpoints
curl http://localhost:3000/api/players
curl http://localhost:3000/api/schedule
```

---

## Contact & Credits

**Created by**: MO  
**Website**: www.malcolmo.co  
**Purpose**: Smart pickleball match scheduling  
**License**: Private use  

---

*Last Updated: [Current Date]*
*Version: 1.0.0*
`
}