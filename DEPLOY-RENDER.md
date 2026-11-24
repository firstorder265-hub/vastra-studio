# Render par Live Deploy Guide (100% Free — 3,000 se 5,000 Photos)

Is guide se aapki website **Render (Static Site)** par live ho jayegi aur **Supabase (Free)** ke saath connect ho kar `/admin` se upload ki gayi har photo **sabhi customers ko live dikhegi**.

---

## Step 1: Free Supabase Database & Photo Storage Banayein (2 Minutes)

1. [supabase.com](https://supabase.com) par jayein aur free account banayein.
2. **New Project** click karein (project naam e.g. `vastra-studio`, region `Mumbai (ap-south-1)` choose karein).
3. Project ready hone par left sidebar me **SQL Editor** kholein → **New query** click karein.
4. Is folder ki file `supabase/schema.sql` ka poora code copy karke paste karein aur **Run** click karein.
   - Isse automatically 3 tables (`channel_profile`, `collections`, `fashion_items`) aur `fashion-media` photo storage bucket ban jayega.
5. Ab left sidebar me **Project Settings → API** par jayein aur ye 2 values copy kar lein:
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon public** key

---

## Step 2: Code ko GitHub par Push Karein (1 Minute)

1. GitHub par ek new repository banayein (e.g. `vastra-studio`).
2. `fashion-channel` folder ka code us repo me upload/push kar dein (`.gitignore` already added hai, so `node_modules` aur `.env` upload nahi honge).

---

## Step 3: Render par Live Deploy Karein (2 Minutes)

1. [render.com](https://render.com) par login karein.
2. **New + → Static Site** (ya **Blueprint** agar aap `render.yaml` use karna chahein) select karein aur apni GitHub repo connect karein.
3. Settings check karein:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. **Environment Variables** section me ye 2 keys add karein:
   - `VITE_SUPABASE_URL` = aapka Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = aapki Supabase `anon public` key
5. **Redirects/Rewrites** tab me ek rewrite rule add karein (taaki `/admin` direct open & refresh par kaam kare):
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** `Rewrite`
   *(Agar aapne Render Blueprint `render.yaml` se deploy kiya hai to ye rule automatically set ho jayega!)*
6. **Deploy Static Site** click karein!

---

## Live Hone ke Baad

- **Public Website:** `https://your-site.onrender.com/`
- **Admin Portal:** `https://your-site.onrender.com/admin`
- Admin header me aapko green **Cloud Live** badge dikhega — iska matlab ab aap jo bhi photo upload, delete, ya setting change karenge wo **duniya bhar ke sabhi customers ko live dikhegi**!
- **Free Photo Capacity:** Supabase Free Tier me **1 GB Storage** milta hai = lagbhag **3,000 se 5,000 optimized photos**.
