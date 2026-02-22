# Remy Voice Customization

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`
**File changed:** `components/ai/remy-drawer.tsx`

## Summary

Added free, browser-native voice customization to Remy's text-to-speech output. Users can now select from all system-installed voices and tune speed, pitch, and volume via a settings panel in the Remy drawer.

## What Changed

### Voice Settings Panel

- Gear icon (`Settings2`) added to the Remy drawer header, toggles a collapsible settings panel
- **Voice selector**: Dropdown populated from `speechSynthesis.getVoices()`, grouped by English-first with other languages in an optgroup
- **Speed slider**: 0.5x to 2.0x (default 1.0x)
- **Pitch slider**: 0.5 to 1.5 (default 1.0)
- **Volume slider**: 0% to 100% (default 100%)
- **Preview button**: Speaks a short test phrase with current settings
- **Reset button**: Restores all settings to defaults

### Persistence

- Settings stored in `localStorage` under the key `remy-voice-settings`
- Loaded on component mount, saved on every change
- Survives page reloads and browser restarts

### Speech Output

- `handleSpeak` now reads from `voiceSettings` state instead of hardcoded `rate=1, pitch=1`
- Selected voice is resolved from `availableVoices` by `voiceURI`

## Cost

$0. All functionality uses the browser's built-in Web Speech API (`SpeechSynthesis`). No cloud TTS APIs, no external services, no API keys.

## Voice Quality Notes

- **Windows 11**: "Microsoft Aria", "Microsoft Jenny", "Microsoft Guy" are high-quality neural voices (enable in Settings > Accessibility > Narrator > Natural voices)
- **macOS/iOS**: Premium Siri voices available for free download in System Settings
- **Chrome**: Google's neural voices (e.g., "Google UK English Female") ship with the browser
- Voice availability depends on the user's OS and browser — the dropdown automatically reflects what's installed
