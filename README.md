# $AURAD | Aura Debt website

Static website for $AURAD, a community meme coin on Solana. It's plain HTML, CSS and JS with no build step, and it's hosted on GitHub Pages.

- `index.html`: page content
- `style.css`: neon brand (black, #00ff88, #ff0044)
- `app.js`: launch countdown, joke aura-debt calculator and waitlist form
- `config.js`: public Supabase URL, publishable key and launch time

## Waitlist
The form posts to a Supabase `waitlist` table using the **publishable** key. Row level security only allows anonymous inserts. Nobody can read the list through the public API. Spam protection: database format checks, unique indexes, a honeypot field and a minimum fill time.

## Disclaimer
$AURAD is a meme coin with no intrinsic value or expectation of financial return. Nothing here is financial advice. There is no presale.
