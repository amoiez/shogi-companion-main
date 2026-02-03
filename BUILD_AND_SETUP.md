# Build and Setup Guide - Nakano Video Shogi Companion

## Overview
This is a React-based web application for shogi game assistance, built with Vite, TypeScript, and modern React libraries. It includes features for board visualization, multiplayer support, AI assistance, and text file downloading.

## System Requirements

### Required Software
- **Node.js**: Version 18.x or higher (LTS recommended)
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For version control

### Recommended Development Environment
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **IDE**: Visual Studio Code with the following extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense

## Installation Steps

### 1. Clone the Repository
```bash
git clone <YOUR_GIT_URL>
cd shogi-companion-main
```

### 2. Install Node.js (if not installed)
Download and install from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version  # Should be v18.x or higher
npm --version   # Should be v9.x or higher
```

### 3. Install Dependencies
```bash
npm install
```

This will install all required packages listed in `package.json`, including:
- React 18.3.1
- Vite 5.4.19
- TypeScript 5.8.3
- shadcn-ui components
- Tailwind CSS
- All other dependencies

**Note**: If you encounter permission errors on Windows, run the terminal as Administrator.

## Development

### Start Development Server
```bash
npm run dev
```

The application will be available at:
- Local: `http://localhost:8080`
- Network: `http://[your-ip]:8080`

The server is configured to listen on all interfaces (`::`) to allow iPad access during development.

### Development Features
- Hot Module Replacement (HMR) - instant updates without full page reload
- TypeScript type checking
- ESLint for code quality
- Auto-reload on file changes

## Building for Production

### Create Production Build
```bash
npm run build
```

This command:
1. Runs TypeScript compiler for type checking
2. Bundles and minifies all assets
3. Optimizes images and other static files
4. Creates output in the `dist/` directory

### Build Output Structure
```
dist/
├── index.html          # Entry HTML file
├── assets/
│   ├── index-[hash].js      # Main JavaScript bundle
│   ├── index-[hash].css     # Compiled CSS
│   └── [other-assets]       # Images, fonts, etc.
└── [static-files]           # Copied from public/
```

### Create Development Build (for debugging)
```bash
npm run build:dev
```

This creates a build with source maps and without minification for easier debugging.

### Preview Production Build
```bash
npm run preview
```

Serves the production build locally for testing before deployment.

## Code Quality

### Run Linter
```bash
npm run lint
```

Checks code for:
- TypeScript errors
- React best practices violations
- Unused variables and imports
- Code style issues

### Fix Linting Issues Automatically
```bash
npm run lint -- --fix
```

## Project Structure

```
shogi-companion-main/
├── public/              # Static assets (served as-is)
│   ├── images/         # Application images
│   ├── pieces/         # Shogi piece graphics
│   ├── sounds/         # Audio files
│   └── robots.txt      # SEO configuration
├── src/
│   ├── components/     # React components
│   │   ├── ui/        # shadcn-ui components
│   │   ├── ShogiBoard.tsx
│   │   ├── AIAssistant.tsx
│   │   └── [others]
│   ├── hooks/         # Custom React hooks
│   │   ├── useGameState.ts
│   │   ├── useMultiplayer.ts
│   │   └── [others]
│   ├── lib/           # Utility functions
│   ├── pages/         # Page components
│   ├── data/          # Static data files
│   ├── App.tsx        # Main app component
│   ├── main.tsx       # Entry point
│   └── index.css      # Global styles
├── package.json       # Dependencies and scripts
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
├── tailwind.config.ts # Tailwind CSS configuration
└── [documentation]    # Various .md files
```

## Configuration Files

### vite.config.ts
- Server configuration (host, port)
- Build plugins (React SWC, component tagger)
- Path aliases (`@` → `./src`)

### tsconfig.json
- TypeScript compiler options
- Module resolution settings
- Type checking strictness

### tailwind.config.ts
- Theme customization
- Color scheme
- Spacing and sizing utilities

### components.json
- shadcn-ui configuration
- Component generation settings

## Environment Variables

Create a `.env` file in the root directory for environment-specific settings:

```env
VITE_APP_TITLE=Nakano Video Shogi Companion
VITE_API_URL=<your-api-url-if-needed>
```

**Note**: All environment variables for Vite must be prefixed with `VITE_`.

## Common Build Issues and Solutions

### Issue: "Cannot find module" errors
**Solution**: Delete `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 8080 already in use
**Solution**: Change port in `vite.config.ts` or kill the process:
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8080 | xargs kill -9
```

### Issue: TypeScript errors during build
**Solution**: Check all .ts/.tsx files for type errors:
```bash
npx tsc --noEmit
```

### Issue: Out of memory during build
**Solution**: Increase Node.js memory limit:
```bash
node --max-old-space-size=4096 node_modules/vite/bin/vite.js build
```

## Clean Build

To ensure a completely fresh build:

```bash
# Remove build artifacts
rm -rf dist

# Remove dependency cache
rm -rf node_modules .vite

# Reinstall and rebuild
npm install
npm run build
```

## Testing the Build

1. Build the project: `npm run build`
2. Preview locally: `npm run preview`
3. Test all features:
   - Board interaction
   - Multiplayer connection
   - AI assistant
   - File export
   - Audio playback
   - iPad compatibility

## Reproducibility Checklist

- [ ] Node.js version documented
- [ ] All dependencies listed in package.json with exact versions
- [ ] Build scripts tested on clean environment
- [ ] Environment variables documented
- [ ] Static assets present in repository
- [ ] Configuration files committed
- [ ] Build output verified to work standalone

## Third-Party Build Tools

This project uses:
- **Vite** - Build tool and dev server
- **SWC** - Fast TypeScript/React compiler
- **PostCSS** - CSS processing (via Tailwind)
- **ESLint** - Code linting

See LICENSES.md for complete third-party software information.

## Next Steps After Build

1. Review the built files in `dist/`
2. Test the application using `npm run preview`
3. Follow DEPLOYMENT_GUIDE.md for production deployment
4. Configure AWS infrastructure per AWS_INFRASTRUCTURE.md
5. Set up iPad home screen per DEPLOYMENT_GUIDE.md

## Support and Maintenance

For troubleshooting common issues, see TROUBLESHOOTING.md.

For questions about the architecture, see ARCHITECTURE_DIAGRAM.md.

---

**Last Updated**: February 2, 2026  
**Project Version**: 0.0.0  
**Maintainer**: [To be assigned during handover]
