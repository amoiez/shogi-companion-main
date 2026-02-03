# Open Source Software Licenses - Nakano Video Shogi Companion

## Overview
This document lists all third-party open source software (OSS) used in the Nakano Video Shogi Companion application, along with their licenses and usage context.

**Last Updated**: February 2, 2026  
**Generated From**: package.json v0.0.0

## License Summary

| License Type | Count | Risk Level |
|-------------|-------|------------|
| MIT | 60+ | Low |
| Apache-2.0 | 2 | Low |
| ISC | 1 | Low |
| BSD-3-Clause | 1 | Low |

**Overall Assessment**: All dependencies use permissive licenses that allow commercial use, modification, and distribution.

## Production Dependencies

These libraries are included in the final application bundle.

### UI Framework & Core Libraries

#### React & React DOM
- **Package**: react, react-dom
- **Version**: 18.3.1
- **License**: MIT
- **Copyright**: Facebook, Inc. and its affiliates
- **Purpose**: Core UI framework
- **Homepage**: https://reactjs.org/
- **License Text**: https://github.com/facebook/react/blob/main/LICENSE

#### React Router DOM
- **Package**: react-router-dom
- **Version**: 6.30.1
- **License**: MIT
- **Copyright**: Remix Software Inc.
- **Purpose**: Client-side routing
- **Homepage**: https://reactrouter.com/

#### React Hook Form
- **Package**: react-hook-form
- **Version**: 7.61.1
- **License**: MIT
- **Copyright**: Bill Luo
- **Purpose**: Form state management
- **Homepage**: https://react-hook-form.com/

### State Management & Data Fetching

#### TanStack React Query
- **Package**: @tanstack/react-query
- **Version**: 5.83.0
- **License**: MIT
- **Copyright**: Tanner Linsley
- **Purpose**: Server state management and caching
- **Homepage**: https://tanstack.com/query/

### UI Components (Radix UI)

All Radix UI packages are licensed under MIT by WorkOS.

#### Radix UI Components
- **Packages**: 
  - @radix-ui/react-accordion (1.2.11)
  - @radix-ui/react-alert-dialog (1.1.14)
  - @radix-ui/react-aspect-ratio (1.1.7)
  - @radix-ui/react-avatar (1.1.10)
  - @radix-ui/react-checkbox (1.3.2)
  - @radix-ui/react-collapsible (1.1.11)
  - @radix-ui/react-context-menu (2.2.15)
  - @radix-ui/react-dialog (1.1.14)
  - @radix-ui/react-dropdown-menu (2.1.15)
  - @radix-ui/react-hover-card (1.1.14)
  - @radix-ui/react-label (2.1.7)
  - @radix-ui/react-menubar (1.1.15)
  - @radix-ui/react-navigation-menu (1.2.13)
  - @radix-ui/react-popover (1.1.14)
  - @radix-ui/react-progress (1.1.7)
  - @radix-ui/react-radio-group (1.3.7)
  - @radix-ui/react-scroll-area (1.2.9)
  - @radix-ui/react-select (2.2.5)
  - @radix-ui/react-separator (1.1.7)
  - @radix-ui/react-slider (1.3.5)
  - @radix-ui/react-slot (1.2.3)
  - @radix-ui/react-switch (1.2.5)
  - @radix-ui/react-tabs (1.1.12)
  - @radix-ui/react-toast (1.2.14)
  - @radix-ui/react-toggle (1.1.9)
  - @radix-ui/react-toggle-group (1.1.10)
  - @radix-ui/react-tooltip (1.2.7)
- **License**: MIT
- **Copyright**: WorkOS
- **Purpose**: Accessible UI component primitives
- **Homepage**: https://www.radix-ui.com/

#### React Resizable Panels
- **Package**: react-resizable-panels
- **Version**: 2.1.9
- **License**: MIT
- **Copyright**: Brian Vaughn
- **Purpose**: Resizable panel layouts

### Styling & CSS

#### Tailwind CSS Dependencies
- **Package**: tailwind-merge
- **Version**: 2.6.0
- **License**: MIT
- **Purpose**: Merge Tailwind CSS classes
- **Homepage**: https://github.com/dcastil/tailwind-merge

- **Package**: tailwindcss-animate
- **Version**: 1.0.7
- **License**: MIT
- **Purpose**: Animation utilities for Tailwind
- **Homepage**: https://github.com/jamiebuilds/tailwindcss-animate

#### Class Variance Authority
- **Package**: class-variance-authority
- **Version**: 0.7.1
- **License**: Apache-2.0
- **Copyright**: Joe Bell
- **Purpose**: CSS class variant management
- **Homepage**: https://cva.style/

#### clsx
- **Package**: clsx
- **Version**: 2.1.1
- **License**: MIT
- **Copyright**: Luke Edwards
- **Purpose**: Conditional CSS class names
- **Homepage**: https://github.com/lukeed/clsx

### UI Enhancement Libraries

#### Lucide React
- **Package**: lucide-react
- **Version**: 0.462.0
- **License**: ISC
- **Copyright**: Lucide Contributors
- **Purpose**: Icon library
- **Homepage**: https://lucide.dev/

#### Sonner
- **Package**: sonner
- **Version**: 1.7.4
- **License**: MIT
- **Copyright**: Emil Kowalski
- **Purpose**: Toast notifications
- **Homepage**: https://sonner.emilkowal.ski/

#### Embla Carousel React
- **Package**: embla-carousel-react
- **Version**: 8.6.0
- **License**: MIT
- **Copyright**: David Jerleke
- **Purpose**: Carousel/slider component
- **Homepage**: https://www.embla-carousel.com/

#### Vaul
- **Package**: vaul
- **Version**: 0.9.9
- **License**: MIT
- **Copyright**: Emil Kowalski
- **Purpose**: Drawer component
- **Homepage**: https://vaul.emilkowal.ski/

#### Next Themes
- **Package**: next-themes
- **Version**: 0.3.0
- **License**: MIT
- **Copyright**: Paco Coursey
- **Purpose**: Theme management (dark/light mode)
- **Homepage**: https://github.com/pacocoursey/next-themes

### Data Visualization

#### Recharts
- **Package**: recharts
- **Version**: 2.15.4
- **License**: MIT
- **Copyright**: Recharts Group
- **Purpose**: Chart components (if used)
- **Homepage**: https://recharts.org/

### Form & Validation

#### @hookform/resolvers
- **Package**: @hookform/resolvers
- **Version**: 3.10.0
- **License**: MIT
- **Purpose**: Form validation resolvers
- **Homepage**: https://github.com/react-hook-form/resolvers

#### Zod
- **Package**: zod
- **Version**: 3.25.76
- **License**: MIT
- **Copyright**: Colin McDonnell
- **Purpose**: TypeScript-first schema validation
- **Homepage**: https://zod.dev/

### Input Components

#### input-otp
- **Package**: input-otp
- **Version**: 1.4.2
- **License**: MIT
- **Purpose**: OTP (One-Time Password) input component
- **Homepage**: https://input-otp.rodz.dev/

#### cmdk
- **Package**: cmdk
- **Version**: 1.1.1
- **License**: MIT
- **Copyright**: Paco Coursey
- **Purpose**: Command palette component
- **Homepage**: https://cmdk.paco.me/

### Date & Time

#### date-fns
- **Package**: date-fns
- **Version**: 3.6.0
- **License**: MIT
- **Copyright**: Sasha Koss
- **Purpose**: Date utility functions
- **Homepage**: https://date-fns.org/

#### react-day-picker
- **Package**: react-day-picker
- **Version**: 8.10.1
- **License**: MIT
- **Copyright**: Giampaolo Bellavite
- **Purpose**: Date picker component
- **Homepage**: https://react-day-picker.js.org/

### Peer-to-Peer / Multiplayer

#### PeerJS
- **Package**: peerjs
- **Version**: 1.5.5
- **License**: MIT
- **Copyright**: Michelle Bu, Eric Zhang
- **Purpose**: WebRTC peer-to-peer data connections
- **Homepage**: https://peerjs.com/
- **Note**: Used for multiplayer functionality

## Development Dependencies

These libraries are only used during development and building, not included in final bundle.

### Build Tools

#### Vite
- **Package**: vite
- **Version**: 5.4.19
- **License**: MIT
- **Copyright**: Evan You
- **Purpose**: Build tool and dev server
- **Homepage**: https://vitejs.dev/

#### @vitejs/plugin-react-swc
- **Package**: @vitejs/plugin-react-swc
- **Version**: 3.11.0
- **License**: MIT
- **Purpose**: React plugin using SWC compiler
- **Homepage**: https://github.com/vitejs/vite-plugin-react-swc

### TypeScript

#### TypeScript
- **Package**: typescript
- **Version**: 5.8.3
- **License**: Apache-2.0
- **Copyright**: Microsoft Corporation
- **Purpose**: TypeScript compiler
- **Homepage**: https://www.typescriptlang.org/

#### TypeScript Type Definitions
- **Packages**: @types/node, @types/react, @types/react-dom
- **Versions**: Various
- **License**: MIT
- **Copyright**: Various contributors
- **Purpose**: TypeScript type definitions
- **Repository**: https://github.com/DefinitelyTyped/DefinitelyTyped

#### typescript-eslint
- **Package**: typescript-eslint
- **Version**: 8.38.0
- **License**: BSD-3-Clause and MIT
- **Purpose**: ESLint support for TypeScript
- **Homepage**: https://typescript-eslint.io/

### Code Quality

#### ESLint
- **Package**: eslint
- **Version**: 9.32.0
- **License**: MIT
- **Copyright**: OpenJS Foundation
- **Purpose**: JavaScript/TypeScript linting
- **Homepage**: https://eslint.org/

#### @eslint/js
- **Package**: @eslint/js
- **Version**: 9.32.0
- **License**: MIT
- **Purpose**: ESLint JavaScript rules

#### eslint-plugin-react-hooks
- **Package**: eslint-plugin-react-hooks
- **Version**: 5.2.0
- **License**: MIT
- **Copyright**: Facebook, Inc.
- **Purpose**: ESLint rules for React Hooks

#### eslint-plugin-react-refresh
- **Package**: eslint-plugin-react-refresh
- **Version**: 0.4.20
- **License**: MIT
- **Purpose**: ESLint rules for React Refresh

#### globals
- **Package**: globals
- **Version**: 15.15.0
- **License**: MIT
- **Purpose**: Global variable definitions for ESLint

### CSS Processing

#### Tailwind CSS
- **Package**: tailwindcss
- **Version**: 3.4.17
- **License**: MIT
- **Copyright**: Tailwind Labs
- **Purpose**: Utility-first CSS framework
- **Homepage**: https://tailwindcss.com/

#### @tailwindcss/typography
- **Package**: @tailwindcss/typography
- **Version**: 0.5.16
- **License**: MIT
- **Purpose**: Typography plugin for Tailwind
- **Homepage**: https://tailwindcss.com/docs/typography-plugin

#### PostCSS
- **Package**: postcss
- **Version**: 8.5.6
- **License**: MIT
- **Copyright**: Andrey Sitnik
- **Purpose**: CSS transformation tool
- **Homepage**: https://postcss.org/

#### Autoprefixer
- **Package**: autoprefixer
- **Version**: 10.4.21
- **License**: MIT
- **Copyright**: Andrey Sitnik
- **Purpose**: Adds vendor prefixes to CSS
- **Homepage**: https://github.com/postcss/autoprefixer

### Development Tools

#### lovable-tagger
- **Package**: lovable-tagger
- **Version**: 1.1.13
- **License**: MIT (assumed)
- **Purpose**: Component tagging for Lovable platform
- **Note**: Development tool only, not in production build

## License Compliance Notes

### MIT License Summary
The MIT License is a permissive license that allows:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

Requirements:
- ⚠️ Include copyright notice and license text in distributed software
- ⚠️ Include original license when redistributing

### Apache-2.0 License Summary
The Apache License 2.0 is a permissive license that allows:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Patent use
- ✅ Private use

Requirements:
- ⚠️ Include copyright notice and license text
- ⚠️ State changes made to the code
- ⚠️ Include NOTICE file if present

### ISC License Summary
The ISC License is functionally equivalent to MIT, allowing the same permissions.

### BSD-3-Clause License Summary
Similar to MIT, but includes a non-endorsement clause.

## Attribution Requirements

For production deployment, it is recommended to include a "Third-Party Notices" or "Open Source Licenses" page in the application footer or about section.

### Suggested Attribution Text

```
This application uses open source software. The following is a list of 
the software and their respective licenses:

React (MIT) - Facebook, Inc.
Radix UI (MIT) - WorkOS
Tailwind CSS (MIT) - Tailwind Labs
TypeScript (Apache-2.0) - Microsoft Corporation
Vite (MIT) - Evan You
PeerJS (MIT) - Michelle Bu, Eric Zhang

For a complete list of dependencies and their licenses, see:
[Link to this LICENSES.md file]
```

## License Text Storage

Full license texts for all dependencies can be found in:
- `node_modules/[package-name]/LICENSE` (for each package)
- Most are also available in the package's npm registry page

## Generating Updated License Report

To generate an updated license report, use:

```bash
# Install license checker
npm install -g license-checker

# Generate report
license-checker --json --out licenses-report.json

# Or for a simpler text output
license-checker --summary
```

## Legal Recommendations

1. **Include Attribution**: Add a "Licenses" or "Third-Party Notices" section in your application
2. **Preserve Copyright**: Keep copyright notices when redistributing
3. **Document Changes**: If you modify any third-party code, document the changes
4. **Regular Audits**: Review licenses when updating dependencies
5. **Legal Review**: Have legal counsel review license compliance before major releases

## Risk Assessment

**Overall Risk Level**: LOW

- All dependencies use permissive, business-friendly licenses
- No copyleft licenses (GPL, AGPL) that would require source disclosure
- No known licensing conflicts
- All licenses allow commercial use and redistribution

## Contact for License Questions

For questions about licensing or to report license compliance issues:
- **Project Maintainer**: [To be assigned]
- **Legal Contact**: [To be assigned]

## Automated License Checking

Consider integrating automated license checking in CI/CD:

```bash
# Add to package.json scripts
"check-licenses": "license-checker --failOn 'GPL;AGPL'"
```

## Updates and Maintenance

This license document should be reviewed and updated:
- When adding new dependencies
- Before major releases
- At least quarterly
- When licensing policies change

---

**Document Version**: 1.0  
**Last Updated**: February 2, 2026  
**Next Review**: May 2, 2026  
**Maintained By**: [To be assigned during handover]
