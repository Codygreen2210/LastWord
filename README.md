# Last Word

> AI writes your perfect text comeback. Three styles. One winner.

A web app where you paste a text fight (or upload a screenshot) and AI generates three reply styles: **savage**, **mature**, and **petty**. Built to ship in a weekend, deploy from your phone, and go viral on TikTok.

---

## 🚀 Deploy this from your phone in ~15 minutes

You don't need a laptop. You don't need to write code. Follow these steps in order.

### Step 1 — Get an Anthropic API key (~3 min)

This is what powers the AI replies. The first $5 of credit is free for new accounts.

1. On your phone, go to **[console.anthropic.com](https://console.anthropic.com)**
2. Sign up (Google sign-in works)
3. Go to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-…`) and paste it somewhere safe like a note. **You only see it once.**

### Step 2 — Put the code on GitHub (~5 min)

1. Go to **[github.com](https://github.com)** on your phone, sign in (or create an account)
2. Tap the **+** in the top right → **New repository**
3. Name it `last-word` (anything works), set it to **Public**, tap **Create repository**
4. On the empty repo page, tap **uploading an existing file** (it's a small link)
5. Tap the **choose your files** area and select all the files from the `last-word` folder you downloaded:
   - `index.html`
   - `style.css`
   - `script.js`
   - `package.json`
   - `vercel.json`
   - `.gitignore`
   - `README.md`
   - And the `api` folder containing `generate.js` *(if your phone won't let you upload a folder, create the file directly: tap "Add file" → "Create new file" → name it `api/generate.js` and paste the contents)*
6. Scroll down, tap **Commit changes**

### Step 3 — Deploy to Vercel (~5 min)

Vercel is what turns your GitHub code into a live website. Free for hobby projects.

1. Go to **[vercel.com](https://vercel.com)** → sign up with your GitHub account (one tap)
2. On the dashboard, tap **Add New… → Project**
3. Pick the `last-word` repository → tap **Import**
4. **IMPORTANT** — before you tap Deploy, scroll down to **Environment Variables** and add:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: paste the key you copied in Step 1
   - Tap **Add**
5. Tap **Deploy**
6. Wait ~60 seconds. You'll get a live URL like `last-word-abc123.vercel.app`

**That's it. You're live.** Open the URL on your phone and try it.

### Step 4 — Add your own domain (optional, ~10 min)

If you want `lastword.app` instead of `last-word-abc123.vercel.app`:

1. Buy a domain on **[namecheap.com](https://namecheap.com)** or **[porkbun.com](https://porkbun.com)** (~$10–15)
2. In Vercel: project → **Settings → Domains** → add your domain
3. Vercel tells you which DNS records to add at your registrar; copy them in. Live in a few minutes.

---

## 💸 Adding payments (Phase 2)

The free version is fine for launching and going viral. When you're ready to charge:

1. Sign up at **[stripe.com](https://stripe.com)**
2. Create a product → "Last Word Premium" → $4.99/month
3. Use **Stripe Payment Links** (no code needed) — paste the link as a button on the page
4. Add a simple usage limit in `api/generate.js` (e.g., check a cookie, free users get 3 replies/day)

If you want to keep it lighter: use a one-time **$9 unlock** instead of a subscription. Friction is lower, conversion is higher.

---

## 🎯 The actual hard part: distribution

Building it was the easy 10%. Going viral is the 90%.

**TikTok script template that works:**

> 1. Hook (first 1 second): "POV: my AI writes my texts now"
> 2. Show the screenshot of a juicy text fight (real or staged)
> 3. Cut to: paste it into Last Word, tap generate
> 4. Reveal the SAVAGE reply with a slow zoom
> 5. End on a reaction face. Caption: "the petty one is unhinged 😭"

**Posting cadence**: 3–5 short videos a day for 30 days. Different hooks (ex drama, work drama, friend drama, family drama). The algorithm needs reps before it picks one up.

**Subreddits to share in (read each sub's rules first, don't be spammy)**:
- r/sidehustle
- r/InternetIsBeautiful
- r/ChatGPT
- r/SideProject
- r/indiehackers

**X/Threads**: post screenshots of the funniest replies daily. Tag @AnthropicAI when relevant.

---

## 🛠 Tech stack

- **Frontend**: vanilla HTML / CSS / JS (no framework, fast)
- **Backend**: single Vercel serverless function
- **AI**: Claude (Sonnet 4.6) via the Anthropic SDK
- **Hosting**: Vercel (free tier)

That's it. No database, no auth, no build step. Designed to be hackable by someone who's never deployed code.

---

## 📁 Project structure

```
last-word/
├── index.html        ← the app UI
├── style.css         ← editorial / tabloid styling
├── script.js         ← frontend logic
├── api/
│   └── generate.js   ← serverless function that calls Claude
├── package.json      ← Node dependencies
├── vercel.json       ← Vercel config
├── .gitignore
└── README.md         ← this file
```

---

## ⚙️ Local development (laptop only — skip if deploying from phone)

```bash
npm install
npm install -g vercel
vercel dev
```

Add `ANTHROPIC_API_KEY=sk-ant-...` to a `.env.local` file in the project root.

---

## 🪪 License

MIT. Do whatever you want with it.

## 🙏 Credits

Built with [Claude](https://www.anthropic.com/claude). Idea, code, and design generated in one chat session.
