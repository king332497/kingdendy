# Full Safe / Local-Only Build

This build preserves the full multi-page project flow while disabling runtime transmission of sensitive form data to Telegram.

## Stage 8
- Existing face-scan camera model and scan sequence are preserved.
- Five separate local file selectors were added inside the Scan Wajah section.
- Files are not uploaded by this UI. Use dummy/example files only.
- The signature area is labeled as a prototype scribble and should not use a real signature.
- The final 6-digit confirmation is a local prototype code, not a banking PIN/OTP.

## Sensitive-data guardrails
- Telegram API endpoints/tokens/chat IDs are removed from runtime HTML pages.
- Login password is not persisted to sessionStorage.
- Verification code is local-only and should not be a real SMS/OTP.
- Identity fields are explicitly labeled for example/dummy data.
