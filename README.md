# 🛁 AM Hancock Bathroom Planner

Interactive bathroom layout planning tool for **AM Hancock & Son** customers. Drag and drop bathroom fixtures onto a customisable room layout to visualise your perfect bathroom design.

![AM Hancock & Son](public/logo.png)

## ✨ Features

- **Drag & Drop Interface** — Add rooms and fixtures by dragging from the sidebar or clicking to add
- **Room Layouts** — Square rooms and L-shaped configurations
- **Bathroom Fixtures** — Bath, shower, toilet, basin, cupboard, radiator, door, mirror, and shower head
- **Multi-Select** — Hold `Shift` to select multiple items, drag them together
- **Resize & Rotate** — Transform handles for precise adjustments
- **Lock Rooms** — Prevent accidental room movement while placing fixtures
- **Undo/Redo** — `Cmd/Ctrl + Z` to undo changes
- **Dimensions Display** — Real-time millimetre measurements

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at [http://localhost:5173](http://localhost:5173)

## 📦 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [React](https://react.dev) | 19.x | UI Framework |
| [Vite](https://vite.dev) | 7.x | Build Tool & Dev Server |
| [Konva](https://konvajs.org) | 10.x | 2D Canvas Library |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Styling |
| [Lucide React](https://lucide.dev) | - | Icons |

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

## 🌐 Deployment

This project is configured for **Netlify** deployment:

- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Auto-deploy:** Pushes to `main` branch trigger automatic deployment

### Manual Deploy

```bash
npm run build
# Upload the 'dist' folder to any static hosting
```

## 📁 Project Structure

```
bathroom-planner/
├── public/
│   ├── logo.png              # AM Hancock logo
│   └── fixtures/             # Fixture images (optional)
├── src/
│   ├── components/
│   │   ├── CanvasEditor.jsx  # Main Konva canvas with shapes
│   │   └── Sidebar.jsx       # Element selection panel
│   ├── App.jsx               # Main app layout & state
│   ├── index.css             # Global styles & design tokens
│   └── main.jsx              # React entry point
├── netlify.toml              # Netlify configuration
├── vite.config.js            # Vite configuration
└── package.json
```

## 🎨 Brand Colours

| Colour | Hex | Usage |
|--------|-----|-------|
| Primary (Orange) | `#ff6600` | Buttons, accents, selection |
| Secondary (Blue) | `#005bab` | Fixture highlights |
| Background | `#f8f9fc` | App background |
| Text Primary | `#1a1a2e` | Headings, labels |
| Text Secondary | `#64748b` | Descriptions, hints |

## 🤝 Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` to check for issues
4. Test locally with `npm run dev`
5. Create a pull request

### Code Style

- ESLint is configured for React best practices
- Use functional components with hooks
- Keep components focused and reusable

## 📝 Future Enhancements

- [ ] Export designs as PDF/image
- [ ] Save/load designs (local storage or cloud)
- [ ] Import room templates
- [ ] Touch/mobile optimisation
- [ ] Measurement annotations
- [ ] Material/colour customisation

## 📄 Licence

Proprietary — AM Hancock & Son © 2026

---

Built with ❤️ for AM Hancock & Son customers
