# The Great Indian Monsoon Survey — indianponcho.com

An interactive, one-question-at-a-time survey in The Indian Poncho Co. brand.
Static site (no build step) + Supabase as the response database.

- Branching: two-wheeler riders get one extra question, everyone else skips it.
- Contact capture: optional email / WhatsApp at the end (validated), shown
  WITH the launch price — that capture rate is your strongest demand signal.
- Source tracking: share `indianponcho.com/?src=wa-society`, `?src=reddit-kochi`
  etc. — the tag is saved with every response so you know which channel works.
- Spam: hidden honeypot field; bot submissions are silently dropped.
- Resilience: if the network drops mid-submit, the response is queued in the
  visitor's browser and they still see the thank-you screen.

## Go live in 4 steps

### 1. Create the database (Supabase, ~5 min)
1. [supabase.com](https://supabase.com) → New project → name it `indian-poncho`
   (region: Mumbai `ap-south-1`).
2. SQL Editor → New query → paste the whole of `setup.sql` → **Run**.
3. Project Settings → API → copy **Project URL** and the **anon public** key.

### 2. Connect the site to the database (~1 min)
Open `config.js` and paste the two values:

```js
SUPABASE_URL: "https://xxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJ...",
```

The anon key is safe to expose — `setup.sql` makes the table insert-only
from the website. Until both values are filled, the app runs in demo mode
(responses go to the browser's localStorage so you can test).

### 3. Deploy (Vercel, ~5 min)
Same routine as the Term Jobs deploy:
1. [vercel.com](https://vercel.com) → Add New → Project.
2. Easiest path: push this `survey-app` folder to a GitHub repo and import it;
   or from this folder run `npx vercel` in Terminal and follow the prompts.
   Framework preset: **Other** (it's plain HTML — no build command needed).
3. You'll get a `something.vercel.app` URL. Test the full flow on your phone.

### 4. Point the domain (~5 min + DNS wait)
1. Vercel → your project → Settings → Domains → add `indianponcho.com`
   (and `www.indianponcho.com`).
2. At your domain registrar, replace the parking records with what Vercel
   shows — typically:
   - `A` record, host `@`, value `76.76.21.21`
   - `CNAME`, host `www`, value `cname.vercel-dns.com`
3. Wait for DNS (minutes to a few hours). Vercel adds HTTPS automatically.

## Viewing your responses
- Supabase → Table Editor → `survey_responses`. Each row = one completed
  survey; the `answers` column holds every question, `email`/`phone` the
  contact, `source` the share-link tag.
- Export anytime: Table Editor → Export → CSV (opens in Numbers/Excel).
- Quick counts (SQL Editor):

```sql
-- responses per day
select created_at::date, count(*) from survey_responses group by 1 order by 1;

-- contact-capture rate (the metric that matters most)
select round(100.0 * count(*) filter (where email is not null or phone is not null)
       / count(*), 1) as capture_pct from survey_responses;

-- which share channel is working
select source, count(*) from survey_responses group by 1 order by 2 desc;
```

## Editing questions
All questions live in `questions.js` — plain text, edit freely. The flow,
branching (`showIf`), and "pick exactly 2" rules are data-driven; no other
file needs touching. The decision framework for reading results is in
`../monsoon-survey-v2.md`.
