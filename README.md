# Nakano Video Shogi Companion

A professional web-based shogi game companion and analysis tool, optimized for iPad deployment with multiplayer support, AI assistance, and comprehensive game management features.

---

## 📋 Project Handover Documentation

**Complete technical documentation for project handover and maintenance:**

### Essential Documentation (Start Here)
1. **[BUILD_AND_SETUP.md](BUILD_AND_SETUP.md)** - Complete build and setup instructions
2. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Production deployment and iPad configuration
3. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions (READ THIS FIRST!)
4. **[AWS_INFRASTRUCTURE.md](AWS_INFRASTRUCTURE.md)** - AWS infrastructure and rebuild procedures
5. **[LICENSES.md](LICENSES.md)** - Open source software licenses and compliance

### Architecture & Technical Details
- **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)** - System architecture overview
- **[API_SPECIFICATION.md](API_SPECIFICATION.md)** - API format and specifications
- **[COORDINATE_SYSTEM_FIX.md](COORDINATE_SYSTEM_FIX.md)** - Critical coordinate system documentation
- **[FIX_SUMMARY_FINAL.md](FIX_SUMMARY_FINAL.md)** - Summary of major bug fixes
- **[MULTIPLAYER_CONNECTIVITY_FIX.md](MULTIPLAYER_CONNECTIVITY_FIX.md)** - Cross-platform connectivity fix (Feb 3, 2026)

### Feature Documentation
- **[TEXT_DOWNLOAD_FEATURE.md](TEXT_DOWNLOAD_FEATURE.md)** - Text file download functionality
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick reference guide
- **[ACCEPTANCE_TESTS.md](ACCEPTANCE_TESTS.md)** - Testing procedures

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- Git

### Development Setup
```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd shogi-companion-main

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`

### Production Build
```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

For complete build and deployment instructions, see [BUILD_AND_SETUP.md](BUILD_AND_SETUP.md).

---

## 🎯 Key Features

- **Interactive Shogi Board**: Full-featured shogi gameplay with drag-and-drop
- **Multiplayer Support**: Real-time peer-to-peer multiplayer using WebRTC
- **AI Assistant**: Integrated AI for move suggestions and analysis
- **Export Functionality**: Export games in various formats
- **iPad Optimized**: Touch-friendly interface designed for iPad deployment
- **Audio System**: Authentic sound effects for moves and captures
- **Text File Download**: Demo script playback and download functionality

---

## 🏗️ Technology Stack

- **Frontend Framework**: React 18.3.1 with TypeScript 5.8.3
- **Build Tool**: Vite 5.4.19
- **UI Components**: Radix UI + shadcn-ui
- **Styling**: Tailwind CSS 3.4.17
- **State Management**: React Hooks + TanStack Query
- **Multiplayer**: PeerJS 1.5.5 (WebRTC)
- **Deployment**: AWS S3 + CloudFront

For complete technology details, see [BUILD_AND_SETUP.md](BUILD_AND_SETUP.md) and [LICENSES.md](LICENSES.md).

---

## 📦 Project Structure

```
shogi-companion-main/
├── src/
│   ├── components/        # React components
│   │   ├── ShogiBoard.tsx       # Main game board
│   │   ├── AIAssistant.tsx      # AI integration
│   │   ├── ConnectionPanel.tsx  # Multiplayer UI
│   │   └── ui/                  # shadcn-ui components
│   ├── hooks/            # Custom React hooks
│   │   ├── useGameState.ts      # Game state management
│   │   ├── useMultiplayer.ts    # Multiplayer logic
│   │   └── useAudioSystem.ts    # Sound effects
│   ├── pages/            # Page components
│   ├── lib/              # Utility functions
│   └── data/             # Static data (demo scripts, etc.)
├── public/               # Static assets
│   ├── pieces/          # Shogi piece images
│   ├── sounds/          # Audio files
│   └── images/          # Other images
├── BUILD_AND_SETUP.md   # Build documentation
├── DEPLOYMENT_GUIDE.md  # Deployment procedures
├── TROUBLESHOOTING.md   # Issue resolution
└── [other docs]         # Additional documentation
```

---

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Build for development (with source maps)
npm run build:dev

# Preview production build
npm run preview

# Run linter
npm run lint

# Fix linting issues
npm run lint -- --fix
```

---

## 🚨 Critical Information for Maintenance Team

### ⚠️ Known Critical Bugs (FIXED - Do Not Re-introduce)

1. **Double Coordinate Translation Bug** - See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#critical-bugs-fixed)
   - Never translate `row`/`col` from `board.map()` - they are already logical coordinates
   - This bug caused all Guest player moves to go to wrong squares

2. **Multiplayer Board Mirroring Bug** - See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#critical-bugs-fixed)
   - Never mirror board state for network transmission
   - Both players must maintain the same logical board state

3. **Cross-Platform Connectivity Bug** - See [MULTIPLAYER_CONNECTIVITY_FIX.md](MULTIPLAYER_CONNECTIVITY_FIX.md)
   - Must configure ICE/STUN servers for PC-iPad connectivity
   - NAT traversal required for different network connections
   - Added connection timeout and enhanced error handling

4. **Index.css Corruption** - See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#important-indexcss-corruption-issue)
   - If dev server fails with CSS errors, check file integrity

**Before making ANY changes to coordinate logic or multiplayer code, read:**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Section: "Critical Bugs Fixed"
- [COORDINATE_SYSTEM_FIX.md](COORDINATE_SYSTEM_FIX.md) - Complete coordinate system analysis
- [FIX_SUMMARY_FINAL.md](FIX_SUMMARY_FINAL.md) - Executive summary of fixes
- [MULTIPLAYER_CONNECTIVITY_FIX.md](MULTIPLAYER_CONNECTIVITY_FIX.md) - Cross-platform connectivity

---

## 📱 iPad Deployment

This application is optimized for iPad deployment with:
- Touch-friendly drag-and-drop interface
- Home screen installation support (PWA-like behavior)
- Landscape orientation optimization
- Fullscreen mode when launched from home screen

For complete iPad setup instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#ipad-setup-and-configuration).

---

## ☁️ AWS Infrastructure

The application is deployed on AWS using:
- **S3**: Static file hosting
- **CloudFront**: CDN and HTTPS
- **Route 53**: DNS management
- **ACM**: SSL/TLS certificates

For infrastructure rebuild procedures, see [AWS_INFRASTRUCTURE.md](AWS_INFRASTRUCTURE.md).

---

## 📄 License & Third-Party Software

This project uses open source software with permissive licenses (MIT, Apache-2.0, ISC).

**Complete license information**: [LICENSES.md](LICENSES.md)

**Key dependencies**:
- React (MIT) - Facebook, Inc.
- Radix UI (MIT) - WorkOS
- Tailwind CSS (MIT) - Tailwind Labs
- TypeScript (Apache-2.0) - Microsoft
- PeerJS (MIT) - Michelle Bu, Eric Zhang

All licenses allow commercial use, modification, and distribution.

---

## 🆘 Support & Troubleshooting

**First, check the troubleshooting guide**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

Common issues covered:
- Build and development errors
- Deployment problems
- iPad-specific issues
- Coordinate system bugs
- Multiplayer connection issues
- Performance optimization

For architecture questions: [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)

---

## 👥 Handover Contacts

- **Development Team**: [To be assigned]
- **Operations Team**: [To be assigned]
- **AWS Account Access**: [To be documented]
- **Domain Management**: [To be documented]

---

## 📅 Project Information

- **Project Name**: Nakano Video Shogi Companion
- **Version**: 0.0.0
- **Last Updated**: February 2, 2026
- **Status**: Production Ready
- **Primary Use Case**: Professional shogi game companion for video production

---

## 🎯 Handover Checklist

### Documentation
- [x] Build and setup guide created
- [x] AWS infrastructure documented
- [x] Deployment procedures written
- [x] Troubleshooting guide compiled
- [x] Open source licenses documented
- [x] iPad setup instructions provided

### Code Quality
- [x] All critical bugs fixed and documented
- [x] Code commented and clean
- [x] TypeScript types complete
- [x] Linting rules configured

### Deployment Materials
- [x] Production build tested
- [x] Deployment scripts ready
- [ ] AWS credentials provided (handover meeting)
- [ ] Domain access provided (handover meeting)

### Knowledge Transfer
- [ ] Walkthrough session scheduled
- [ ] Contact information exchanged
- [ ] Support procedures established

---

## 📚 Additional Resources

- **Vite Documentation**: https://vitejs.dev/
- **React Documentation**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **shadcn-ui**: https://ui.shadcn.com/
- **PeerJS**: https://peerjs.com/
- **AWS Documentation**: https://docs.aws.amazon.com/

---

**For any questions or issues, start with [TROUBLESHOOTING.md](TROUBLESHOOTING.md)!**
