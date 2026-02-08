# 🎬 StreamVibe - Ultimate Anime & Movie Hub

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![DaisyUI](https://img.shields.io/badge/DaisyUI-5833E0?style=for-the-badge&logo=daisyui&logoColor=white)](https://daisyui.com/)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=progressive-web-apps&logoColor=white)](https://web.dev/progressive-web-apps/)

**StreamVibe** is a minimalist, high-performance streaming dashboard featuring dynamic anime discovery and global TMDB integration. Designed with a "Neural Engine" aesthetic, it provides a seamless interface for accessing film and animation archives across the globe.

---

## 🚀 Core Features

### 🌌 Dual-Mode Engine
Toggle instantly between **Streaming Mode** (Watch) for low-latency playback and **Archival Mode** (Download) for high-quality direct transmissions via the Apex Cloud Network.

### 🧠 Neural Discovery Node
- **Anime Registry**: Deep integration with Iota and Anilist protocols for real-time airing schedules and episode mapping.
- **Global Media Core**: Powered by TMDB for cinematic metadata, trending cinema, and worldwide television archives.
- **Advanced Pagination**: Custom Cluster Selector handling 1000+ episodes for long-running series (e.g., One Piece).

---

## 📡 API Integration Layer

The engine synchronizes with multiple external database nodes to provide real-time accuracy.

### 1. Anime Neural Network (Iota)
**Base URL**: `https://anime-api-iota-six.vercel.app/api/`
- `/` - Discovery Data (Trending, Popular, Top Airing)
- `/search?keyword={query}` - Database Query
- `/episodes/{id}` - Transmission Episode Mapping
- `/stream?id={ep_id}&server={name}&type={sub/dub}` - Source Link Decryption

### 2. Global Media Core (TMDB)
**Base URL**: `https://api.themoviedb.org/3/`
- `/trending/all/week` - Global Weekly Pulse
- `/search/multi?query={q}` - Universal Multi-Sector Search
- `/{tv/movie}/{id}` - Deep Meta-Data Retrieval
- `/tv/{id}/season/{num}` - Episodic Unit Scanning

---

## 🛠️ Embedded Node Infrastructure (Players)

StreamVibe utilizes a redundant multi-node protocol for media delivery.

### Global Cinema & Television (TMDB Based)
| Provider | URL Protocol |
| :--- | :--- |
| **VidNest** | `https://vidnest.fun/{type}/{id}` |
| **VidUp** | `https://vidup.to/{type}/{id}?autoPlay=true` |
| **VidFast** | `https://vidfast.pro/{type}/{id}?autoPlay=true` |
| **VidSrc.to** | `https://vidsrc.to/embed/{type}/{id}` |
| **RiveStream** | `https://rivestream.org/embed?type={type}&id={id}` |
| **VidZee** | `https://player.vidzee.wtf/embed/{type}/{id}` |
| **VidSrc.wtf** | `https://vidsrc.wtf/api/1/{type}/?id={id}` |

### Japanese Animation Sector (Direct Archival)
| Source | Protocol |
| :--- | :--- |
| **VidNest (Pahe)** | `https://vidnest.fun/animepahe/{session}/{ep_id}/{type}` |
| **Iota Proxy** | `https://anime-api-iota-six.vercel.app/api/stream?id={id}` |
| **Apex Cloud** | `https://anime.apex-cloud.workers.dev/?method=series&session={id}` |

---

## 📖 Documentation & Usage

### 1. Navigation
Use the **Neural Navbar** to switch between dimensions:
- **Home**: System status and quick start.
- **Anime**: Japanese animation registry and airing grid.
- **Global**: Hollywood cinema and international television.
- **Saved**: Your personal encrypted vault of bookmarks.

### 2. Archival Mode (Download)
To access raw data files:
1. Search for a title in the **Archive Core**.
2. Select an entry to open the Archival Modal.
3. Click **"Initialize Archive"** to generate direct high-speed downlink coordinates via the **Apex Protocol**.

### 3. Airing Grid (Schedule)
Access the **Live Grid** in the Anime tab to see real-time transmissions. The system automatically fetches fallback posters from **Anilist** if the local node is offline.

---

## 🔧 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/streamvibe.git
   cd streamvibe
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run development server**:
   ```bash
   npm run dev
   ```

---

## 🛡️ Protocol Notice
StreamVibe acts as a neural middleware. It does not host any media files locally. All content is dynamically mapped via external cloud archival protocols. Users are encouraged to use **AdBlock** or **Brave Browser** to ensure the integrity of the external link sector.

---

## 📄 License
This project is licensed under the MIT License.

*StreamVibe Neural Engine v4.0 - Systems Nominal.*