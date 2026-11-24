# Vastra Studio — Ladies & Boys Fashion Channel (React + Vite)

Ek premium, channel-style fashion showcase website (Instagram / YouTube channel aesthetic) jahan **Ladies** aur **Boys** dono ke kapdo ki clean **photo-only gallery**, **Follow / Like counters**, **Collections**, **All Sizes filter**, aur **Admin Panel** milta hai.

## Features
- **Channel Profile Look**: Cover banner, verified DP, channel name, bio, live Followers, Total Likes, Photos & Collections count, Follow/Following toggle, aur Share button.
- **Photo-Only Showcase Grid**: Main feed me sirf clean kapdo ki photos dikhti hain (bina text clutter ke). Double-tap se Like hota hai, aur single tap se full Lightbox khulta hai jisme Likes, Collection, Category, aur Available Sizes dikhte hain.
- **Categories, Collections & All Sizes**:
  - `All`, `Ladies`, `Boys` tabs
  - Circular story-style Collection highlights
  - Size filter (`All Sizes`, `XS`–`3XL`, `Free Size`, Kids sizes, + custom sizes)
- **Full Admin Studio (Default PIN: `1234`)**:
  - Single ya multiple photos ek saath upload karein (auto-compressed & saved in browser IndexedDB)
  - Naye collections add/delete karein with custom cover image
  - Har photo ke liye Category, Collection aur Sizes (`All Adult Sizes`, `Kids Sizes`, custom sizes) set ya edit karein
  - Channel DP, Banner, Name, Bio, WhatsApp number aur Admin PIN customize karein
  - Backup Export/Import (JSON) support

## Run Locally (PC par chalane ke liye)
1. [Node.js LTS](https://nodejs.org/) install karein (agar installed nahi hai).
2. Is folder me terminal kholkar run karein:
```bash
npm install
npm run dev
```
3. Browser me `http://localhost:5173` khol lein.

## Website Live Kaise Karein (Free Hosting)
Is project me `netlify.toml` aur `vercel.json` pehle se ready hain:
- **Netlify / Vercel**: Build command `npm run build` aur Publish directory `dist` set karein (ya GitHub repo connect karke 1 click me live kar dein).
- **Important Note (Live Multi-User Sync)**: Abhi photos aur likes browser ke IndexedDB me save hote hain (instant offline/demo testing ke liye). Jab aap live website par chahein ki aapke phone se Admin me upload ki gayi photos duniya ke sabhi visitors ko real-time dikhein aur sabke likes/followers sync hon, to isme **Firebase (Firestore + Storage)** ya **Supabase** connect kiya ja sakta hai.
