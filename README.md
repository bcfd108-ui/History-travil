# On Old Ground — hosted app

The public hosted edition of On Old Ground (formerly History Travel): a
historical road trip reference built from primary sources, with a
scavenger-hunt game layered on top. Research and planning run at full depth
from anywhere; the game is played on the ground.

- `app/` — the Next.js application (deployed on Vercel, root directory `app`)
- `corpus/` — the research dossiers the app's catalog is built from at
  build time by `app/scripts/convert.mjs`
- The four `HT-RES-*.md` files at the root are the home-bench dossiers.

Live: https://onoldground.com (canonical; production also answers at
https://history-travil.vercel.app, and the history-travel project is a
mirror of the same build)
Saving: visitor accounts (Supabase) wired November 19, 2026.
