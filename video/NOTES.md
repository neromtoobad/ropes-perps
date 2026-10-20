# ROPES Perps demo — working notes (Oct 20)
- Format (the user's standing ask): a 13.9 s motion ad (7 bars of "What About Action?", Mixkit 474, 120.5 bpm; its drop at 63.470 s lands on the "MAKE IT A BODY" slam 2 bars in), then 9 narration lines in the user's cloned voice (Higgsfield text2speech_v2 elevenlabs) over "Close Up" (Mixkit 1167), ducked. ~101 s.
- prompt-motion techniques: product-film (the ad's Crag is drawn from a live /api/state snapshot with the real climber sprites and the site's own height scale), particles that become data (each position flies in as a dot and becomes a climber), the table→body style switch, kinetic type on beats, real footage in a floating window, callouts with real data, iris end card.
- Footage: record.mjs drives the LIVE site headless with the linked test key seeded into localStorage. Takes: crag (incl. two REAL liquidations falling ~11-13 s), climb (real AVAX 10× order + BAIL), leaders, explorer (the BAIL tx), feedback (GitHub folder).
- The Reactivity callout shows real decoded stream output (spike/react-tail.ts -> build/react.txt).
- Whisper hears the clone's "perp" as "pub/pops" in some lines (accent); a "purp" respelling did not help. Captions use the script's words.
- Pipeline: node captions.mjs && node timeline.mjs && node render.mjs && node mix.mjs -> ../submission/ropes-perps-demo.mp4
