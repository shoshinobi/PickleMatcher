# 🏓 PickleMatcher

**Where pickleball meets its perfect match!**

PickleMatcher is a smart pickleball match scheduler that automatically creates fair, balanced games while tracking player statistics in real-time. Built for leagues, clubs, and casual groups who want to ensure everyone gets equal playing time with varied partners.

![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=flat-square&logo=tailwind-css)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)

## ✨ Features

### 🎯 Smart Match Generation
- **No Repeated Partners**: Advanced algorithm prevents the same players from partnering repeatedly
- **Equal Playing Time**: Automatically balances games so everyone plays the same amount
- **Flexible Settings**: Configure rounds (1-20) and courts (1-10) based on your venue

### 📊 Real-Time Statistics
- **Win/Loss Tracking**: Click to record match winners instantly
- **Live Leaderboard**: See win percentages update in real-time
- **Persistent Stats**: All statistics are saved and synced across devices

### 👥 Multi-User Sync
- **Real-Time Updates**: Changes sync every 10 seconds across all users
- **No Account Required**: Share a single URL with your entire group
- **Cloud Storage**: Data persists between sessions via Google Sheets

### 📱 Modern Interface
- **Responsive Design**: Works perfectly on phones, tablets, and desktops
- **Material Design**: Clean, intuitive interface with smooth animations
- **Visual Feedback**: Clear indicators for winners, current matches, and sitting players

## 🚀 Quick Start

### For Players/Organizers

1. **Visit the app** at your deployed URL
2. **Add players** - Enter names individually or comma-separated
3. **Set your courts** - How many courts are available?
4. **Generate schedule** - Click to create fair matchups
5. **Record winners** - Click the winner button after each match

### For Developers

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pickleball-scheduler.git
   cd pickleball-scheduler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   GOOGLE_SHEETS_ID=your-sheet-id
   GOOGLE_API_KEY=your-api-key
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@email
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   GOOGLE_PRIVATE_KEY_ID=your-private-key-id
   GOOGLE_CLIENT_ID=your-client-id
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open** http://localhost:3000

## 🛠️ Technical Stack

- **Framework**: [Next.js 15.3.3](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database**: [Google Sheets API](https://developers.google.com/sheets/api)
- **Hosting**: [Vercel](https://vercel.com/)

## 📋 Prerequisites

- Node.js 18+ 
- Google Cloud Project with Sheets API enabled
- Service Account with access to your Google Sheet
- Vercel account (for deployment)

## 🔧 Configuration

### Google Sheets Setup

1. **Create a Google Sheet** with a "Players" tab
2. **Enable Google Sheets API** in Google Cloud Console
3. **Create a Service Account** and download credentials
4. **Share your sheet** with the service account email
5. **Add credentials** to environment variables

### Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Connect your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy!

## 📖 How It Works

### The Algorithm
PickleMatcher uses a sophisticated scoring system to create balanced matches:

- **Prioritizes players with fewer games** to ensure equal playing time
- **Penalizes repeated partnerships** using exponential scoring
- **Balances team strengths** for competitive matches
- **Handles odd numbers** by rotating who sits out

### Data Storage
- **Players**: Stored in Google Sheets "Players" tab
- **Schedule**: Saved as JSON in hidden "ScheduleData" tab
- **Statistics**: Visible in "Stats" tab and in-app display

## ⚠️ Important Notes

- **Single Group Usage**: This app should only be used by one group at a time
- **Clearing Players**: This action affects all users and resets everything
- **Minimum Players**: You need at least 4 players to generate matches
- **Optimal Size**: Works best with 6-12 players

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues

- Winner selection may occasionally require two clicks due to sync timing
- Large groups (20+ players) may experience slower schedule generation
- Browser must remain open for real-time sync to work

## 📝 License

This project is private and proprietary. All rights reserved.

## 👏 Acknowledgments

- Built with ❤️ by [MO](https://www.malcolmo.co)
- Inspired by the need for fair play in recreational pickleball
- Thanks to all the pickleball players who provided feedback

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Visit [www.malcolmo.co](https://www.malcolmo.co)

---

**Happy Matching! 🏓**