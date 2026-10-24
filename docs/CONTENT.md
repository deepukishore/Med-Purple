# Educational content and asset provenance

This is a starter educational catalog, not a licensed comprehensive MBBS question bank.

## Original content

- 12 foundation questions, with original wording and short explanations.
- Three original silent diagram animations, 18 seconds each: cardiac conduction, renal corpuscle, and pulmonary gas exchange.
- Six structure descriptions for a deliberately simplified heart.
- Original procedural Three.js geometry and a Med Purple lettermark/app icon.

There are no invented student reviews, user counts, creator credentials, patient records, or engagement statistics. MedBytes attribution reads “Med Purple / Original foundation series.” Clinical/educator review is still needed before formal educational use.

## Further reading links

The application links to these OpenStax Anatomy and Physiology 2e sections. It does not bundle textbook artwork or copy chapter text:

- https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy
- https://openstax.org/books/anatomy-and-physiology-2e/pages/19-2-cardiac-muscle-and-electrical-activity
- https://openstax.org/books/anatomy-and-physiology-2e/pages/25-4-microscopic-anatomy-of-the-kidney
- https://openstax.org/books/anatomy-and-physiology-2e/pages/22-4-gas-exchange
- https://openstax.org/books/anatomy-and-physiology-2e/pages/12-2-nervous-tissue
- https://openstax.org/books/anatomy-and-physiology-2e/pages/18-1-an-overview-of-blood

## Editing videos

`generate_media.py` creates accurate, simple diagrams, progressing captions, MP4 videos, WebP posters, and VTT captions. It requires Pillow, ffmpeg, and the DejaVu Sans font at the path defined in the script; change that path on macOS/Windows. No generation service or network asset is required at runtime.

The videos have no narration. The captions and transcript are the content. Supply educator-recorded media and appropriate permissions when expanding the catalog.

## Fonts and icons

Manrope and DM Serif Display are self-hosted through Fontsource on web and Expo Google Fonts on native. Phosphor is used on web; Ionicons is used for native navigation and controls. Brand assets and medical geometry are original. See the third-party notices for license details.
