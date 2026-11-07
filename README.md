# SnapTV — Leanback Smart TV & Mobile Streaming Platform

SnapTV is a lightweight, responsive streaming application designed for **Android TV / Google TV** (TCL, Sony, Mi, Fire TV) as well as **Smartphones, Tablets, and Desktops**.

---

## 📺 Features
- **10-Foot Leanback Remote Navigation**: Full D-Pad keyboard/remote navigation with spatial focus, zero scroll lag, and audio sound effects.
- **Dual-Device Phone Remote**: Pair any smartphone via QR code or 4-digit code to control your TV, type searches with mobile keyboard, and beam links.
- **Budget-TV Optimized (Locked 60fps)**:
  - 30MB capped HLS video buffer (prevents low-RAM crashes on 1GB TV sticks).
  - Zero heavy CSS backdrop-blur filters.
  - DOM virtualization batching (36 cards window).
  - Hardware compositor acceleration (`translateZ(0)`).
- **IPTV Live TV Guide**:
  - Verified Free-to-Air HLS broadcasts with real-time health verification.
  - Regional filters: **Haryanvi**, **Hindi**, **Punjabi**, **English & Global**, **Sports & Kabaddi**.
  - Dual-tier category sub-filters (News, Sports, Music, Cinema, Spiritual).
- **Movies & Web Series Providers**:
  - **HDHub4u Ultra**: Bollywood, South Hindi dubbed, Hollywood dual-audio, and Hindi OTT web series with automatic mirror failover.
  - **BollyStream OTT Vault**: Top Indian web series (Panchayat, Mirzapur, Asur, Gullak, Sacred Games) & cinema premieres.
  - **Golden Hindi Classics**: Internet Archive 1080p restored cinema.
- **Web Stream Extractor**: Paste any direct `.m3u8` or video URL to watch with audio boost (+3dB / +6dB), sleep timer, and aspect ratio controls.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm start
```

---

## 📱 Publishing to GitHub & Deploying

### Push to your GitHub Repository:
```bash
# 1. Create a new repository on GitHub (e.g. snaptv)
# 2. Link your remote and push:
git remote add origin https://github.com/<your-username>/snaptv.git
git branch -M main
git push -u origin main
```

### Deploying Free on Cloud:
Deploy on **Render**, **Railway**, **Google Cloud Run**, or **Fly.io** using:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node server.ts` (or `bun server.ts`)
- **Port**: `3000`

---

## 📦 Installing as a Native Android TV App

### Method 1: Web PWA (No APK needed)
1. Open **TV Bro** or **JioPages** on your TV.
2. Visit your hosted app URL.
3. Click **"Install Native App"** or select **"Add to Home Screen"** from browser menu.

### Method 2: Generate Signed Android TV APK via PWABuilder
1. Go to [PWABuilder.com](https://www.pwabuilder.com).
2. Enter your live deployment URL.
3. Select **Android** and download the generated `.apk`.
4. Sideload onto your TV via USB or the **"Send Files to TV"** app.

---

## 📄 License
Apache-2.0
