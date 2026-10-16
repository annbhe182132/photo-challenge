# Photo Challenge — Timer Pause Fix

## Behavior
- The turn timer pauses when the player leaves the Camera page, navigates back, the tab becomes hidden, or the page is closing.
- Remaining seconds are saved rather than resetting to the full turn duration.
- When the player returns, the clock resumes only after the camera is live again.
- In multi-device mode, the server stores the remaining seconds so other devices stop counting down too.
- If an image was already captured before leaving, it can still be submitted while the same turn is paused; a new/untouched turn still requires a live camera first.

## Files changed
- `frontend/src/context/GameContext.tsx`
- `frontend/src/pages/Camera/CameraPage.tsx`
- `frontend/src/pages/Challenge/ChallengePage.tsx`
- `frontend/src/pages/AIVerify/AIVerifyPage.tsx`
- `frontend/src/pages/Lobby/LobbyPage.tsx`
- `frontend/src/pages/ScanQR/ScanQRPage.tsx`
- `frontend/src/services/api.ts`
- `server/src/controllers/roomController.js`
- `server/src/models/Room.js`
- `server/src/routes/roomRoutes.js`

## Validation
- `node --check` passed for the changed backend files.
- `server/test/gameRules.test.js`: 16/16 passed.
- TypeScript/TSX syntax transpilation passed for all changed frontend files.
- A full frontend TypeScript build was not completed because the environment lacks installed frontend dependencies.

No changes were pushed to GitHub.
