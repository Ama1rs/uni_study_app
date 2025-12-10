# Uni Study App – Project Overview

## Current State (In‑Development)
- **Core UI**: Fully functional dashboard, settings modal, and theme system (light/dark with glassmorphism). 
- **Local LLM Integration**: Chat component (`ChatLocalLLM`) talks to Ollama via Tauri commands; connection status, model selection, and settings panel are live.
- **Focus Mode**: Pomodoro timer with ambient‑sound controls and light‑mode UI fixes.
- **Repository Management**: Basic CRUD UI for study repositories, with modal forms and hover‑state theming.
- **Theme & Appearance**: Dynamic CSS variables (`--glass-bg`, `--bg-hover`, etc.) ensure consistent look across themes.

## Features in Progress
- **Streaming LLM Responses** – real‑time token streaming for a smoother chat experience.
- **Conversation Persistence** – saving chat history locally and loading it on app start.
- **Enhanced Settings** – persisting user preferences (theme, accent, AI provider) across sessions.
- **Database Layer** – SQLite integration for storing repositories, tasks, and planner events.

## Planned Features
- **AI Provider Switch** – support for OpenAI‑compatible APIs (e.g., GPT‑OSS 120B) alongside Ollama.
- **Advanced Planner** – calendar view, recurring events, and export to iCal.
- **Knowledge Graph** – visual graph of topics and notes, powered by a lightweight graph library.
- **Export/Import** – markdown and JSON import/export for notes and repositories.
- **Mobile/Desktop Sync** – optional cloud sync via a simple REST backend.

---
*The project is actively being built; contributions and feedback are welcome.*
