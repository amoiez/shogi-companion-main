# Warning and Error Instruction Manual

Date: 2026-03-22
Project: Shogi Companion

## Purpose

This manual explains how to interpret warnings and errors in the project when deployment is working but development checks still report issues.

## Important Distinction

A deployed application can still work even when local quality checks report warnings or errors.

This is because:

- deployment checks whether the application can build and run
- lint checks code quality rules and maintenance safety
- some warnings do not stop runtime behavior
- some errors are development-policy violations rather than production runtime failures

In other words, “deployment is working” does not necessarily mean “all warnings and errors are resolved.”

## Types of Messages

### 1. Runtime Errors

These affect actual application behavior.

Examples:

- application crashes
- moves do not sync
- audio/video connection fails
- piece ownership or board state becomes incorrect

Action:

- Highest priority
- Must be investigated immediately
- Reproduce in browser and check console/network logs

### 2. Build Errors

These prevent packaging or compiling the application correctly.

Examples:

- TypeScript compile failure
- Vite build failure
- import/configuration failure

Action:

- Must be fixed before release packaging
- Run build locally and review the exact failing file and line

### 3. Lint Errors

These violate configured code-quality rules.

They may not break the deployed app immediately, but they should be treated seriously because they often indicate unsafe patterns.

Examples in this project:

- `no-explicit-any`
- `no-empty-object-type`
- `no-require-imports`

Action:

- Fix before final acceptance if possible
- Review whether the rule points to a real maintainability or typing risk

### 4. Lint Warnings

These do not always indicate immediate breakage, but they often identify fragile code.

Examples in this project:

- React Hook dependency warnings
- Fast refresh export warnings

Action:

- Review carefully
- Fix when the warning indicates stale state, cleanup risk, or unstable callback behavior
- Lower urgency than runtime/build failures, but not “ignore by default”

## Recommended Check Procedure

Use the following order when validating the project.

### Step 1. Confirm Runtime Behavior

Verify the actual business-critical features:

- local game logic
- multiplayer synchronization
- hand drops
- exports
- camera/microphone connection

If runtime behavior is broken, fix that first.

### Step 2. Run Lint

Run:

```bash
npm run lint
```

Purpose:

- detect unsafe Hook dependencies
- detect typing issues
- detect code patterns that may become future bugs

### Step 3. Run Build

Run:

```bash
npm run build
```

Purpose:

- confirm production packaging still succeeds
- catch build-time configuration and typing issues not visible in runtime smoke testing

### Step 4. Compare Results

Use this decision logic:

- If runtime fails: treat as urgent defect
- If build fails: release is blocked
- If lint fails but build/deployment still work: app may still run, but code-quality debt remains
- If only low-risk warnings remain: document them clearly and classify them as non-blocking or deferred

## How to Explain This to a Client

Suggested wording:

“Deployment success confirms that the application can currently run in its deployed environment. However, warnings and lint errors indicate there are still code-quality or maintainability issues that should be reviewed. Some of these may be non-blocking in the short term, while others can become future defects if left unresolved.”

## Current Project Interpretation

For this project, the correct interpretation is:

- The deployment working is a positive sign for current runtime operation
- The reported warnings and errors should still be reviewed
- React Hook dependency warnings were important because they could lead to stale closures and cleanup problems
- Other remaining lint issues are separate from runtime verification and should be triaged individually

## Operational Guidance

When warnings or errors are reported in the future:

1. Confirm whether the issue is runtime, build, lint error, or lint warning
2. Decide whether it is blocking or non-blocking
3. Fix runtime and build issues first
4. Fix high-risk lint findings next
5. Document deferred non-blocking items clearly

## Conclusion

The fact that deployment is currently working does not mean warnings and errors can be ignored.

The correct handling policy is:

- treat runtime failures as urgent
- treat build failures as release blockers
- treat lint findings as quality and risk indicators
- prioritize according to impact, not only according to whether deployment currently succeeds
