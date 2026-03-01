# Uni Study App

A comprehensive, cross-platform desktop application built with **Tauri + React + TypeScript** designed specifically for university students. This all-in-one academic productivity suite combines note-taking, course management, AI-powered content generation, financial tracking, and advanced study tools.

##  Features

###  Academic Management
- **Course/Repository System**: Organize study materials by semester and subject
- **Grade Tracking**: Comprehensive grading system with GPA calculation and grade projection
- **Lecture Management**: YouTube playlist integration with progress tracking
- **Resource Management**: Support for notes, documents, presentations, PDFs, images, and videos

###  AI-Powered Tools
- **Local LLM Integration**: Support for Ollama and direct GGUF model inference
- **Document Generation**: AI-assisted creation of study notes and documents
- **Presentation Generation**: Automated slide deck creation
- **Flashcard Generation**: AI-powered flashcard creation from study materials
- **Chat Interface**: Local AI chat for study assistance

###  Study Tools
- **Knowledge Graph**: Visual representation of interconnected study concepts
- **Flashcard System**: Spaced repetition with 3D dealer mode visualization
- **Note Editor**: Rich markdown editor with preview
- **Book Library**: EPUB reader with progress tracking, bookmarks, and highlights
- **Focus Mode**: Distraction-free study environment

###  Planning & Organization
- **Task Management**: Todo lists with priority tracking
- **Planner/Calendar**: Event scheduling with recurrence support
- **Study Sessions**: Time tracking with break management
- **D-Day Countdown**: Important deadline tracking

###  Financial Management
- **Expense Tracking**: Categorized spending monitoring
- **Budget Management**: Monthly budget limits and tracking
- **Savings Goals**: Target-based savings planning
- **Asset Tracking**: Investment and asset portfolio management

###  User Experience
- **Multi-Profile Support**: Separate user accounts with authentication
- **Theme System**: Extensive customization with light/dark modes
- **Responsive Design**: Adaptive layouts for different screen sizes
- **Onboarding Flow**: Guided setup for new users
- **Accessibility**: Keyboard navigation and screen reader support

<img width="1920" height="1020" alt="Screenshot 2026-03-01 144022" src="https://github.com/user-attachments/assets/17e9bfc6-edb4-40d6-a0a8-270d001927e7" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144024" src="https://github.com/user-attachments/assets/5daae914-a557-4118-a208-8b55b9ed4f08" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144031" src="https://github.com/user-attachments/assets/cd5a796a-e005-4762-ac03-54fd07604947" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144035" src="https://github.com/user-attachments/assets/31087158-84d8-4b1c-934d-3cb3820efd10" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144038" src="https://github.com/user-attachments/assets/6fe5c5c7-b31f-48fc-987f-7dcba26fdaf5" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144045" src="https://github.com/user-attachments/assets/ea61a671-6d71-4896-8a89-3218183850f9" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144048" src="https://github.com/user-attachments/assets/fb1ff18f-a9de-48c2-a802-d6503c4d0c5c" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144055" src="https://github.com/user-attachments/assets/bb7c3b53-6803-4eb2-9a8f-0f451ae74143" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144057" src="https://github.com/user-attachments/assets/be17826a-0dcf-45d6-b0ed-bb2a0e894d3b" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144103" src="https://github.com/user-attachments/assets/04254f94-406b-412e-9d32-5e2332c5b7e6" />
<img width="1752" height="1020" alt="Screenshot 2026-03-01 143713" src="https://github.com/user-attachments/assets/f465d087-97a3-4ae9-b866-fe08f66315f5" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 143804" src="https://github.com/user-attachments/assets/90ee3197-d4e5-4fb6-ba2d-931276c7c7d8" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 143843" src="https://github.com/user-attachments/assets/e78dfdcc-3104-40ea-909f-852ea225179c" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 143855" src="https://github.com/user-attachments/assets/1cd6b44a-f2c7-40b9-b561-70b573483982" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 143859" src="https://github.com/user-attachments/assets/53fecb34-c6e0-44a5-86f2-87ad9b191a0a" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144009" src="https://github.com/user-attachments/assets/d7c15f1f-367d-401c-af98-367b7567f8fc" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144012" src="https://github.com/user-attachments/assets/b833fb91-93e9-4dc6-a61c-81ec3fa50f93" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144015" src="https://github.com/user-attachments/assets/b821d732-6cb7-4339-9481-690729e50078" />
<img width="1920" height="1020" alt="Screenshot 2026-03-01 144019" src="https://github.com/user-attachments/assets/9ec71be2-d246-4cee-b80b-278fae49f60f" />

##  Tech Stack
### Frontend
- **React 19** with TypeScript
- **Vite** as build tool
- **Tailwind CSS** with custom theming
- **Framer Motion** for animations
- **React Three Fiber** for 3D visualizations

### Backend
- **Tauri** (Rust-based desktop framework)
- **SQLite** with multi-profile database
- **LLaMA.cpp** bindings for local AI inference
- **Tokio** for async operations

### Key Libraries
- **Supabase** for potential cloud sync
- **EPUB.js** for book reading
- **React Force Graph** for knowledge visualization
- **Recharts** for financial charts

##  Installation

### Prerequisites
- Node.js 18+ and npm
- Rust and Cargo
- Tauri CLI (`npm install -g @tauri-apps/cli`)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd uni_study_app

# Install dependencies
npm install

# Start development server
npm run tauri:dev

# Build for production
npm run tauri:build
```

##  Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components
│   ├── routing/        # Navigation routing
│   └── ui/             # Base UI components
├── features/           # Feature-specific components
│   ├── ai/            # AI-powered tools
│   ├── auth/          # Authentication
│   ├── books/         # Book reading
│   ├── courses/       # Course management
│   ├── editor/        # Note/presentation editors
│   ├── finance/       # Financial tracking
│   ├── flashcards/    # Flashcard system
│   ├── knowledge-graph/ # Knowledge visualization
│   ├── library/       # Book library
│   ├── onboarding/    # User onboarding
│   ├── resources/     # Resource management
│   ├── settings/      # App settings
│   └── tasks/         # Task management
├── contexts/          # React contexts
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries
├── pages/             # Main page components
├── types/             # TypeScript type definitions
└── utils/             # Utility functions

src-tauri/
├── migrations/        # Database migrations
├── src/              # Rust backend code
│   ├── db/           # Database modules
│   ├── finance/      # Financial tracking
│   ├── grades/       # Grade management
│   ├── inference/    # AI inference
│   └── ollama/       # LLM integration
└── Cargo.toml        # Rust dependencies
```

## 🔧 Development

### Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Available Scripts
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for web
npm run preview      # Preview production build
npm run tauri:dev    # Start Tauri development
npm run tauri:build  # Build Tauri application
```

##  Database

The application uses SQLite with a comprehensive migration system:
- **Multi-profile architecture**: Separate databases per user
- **17+ migrations**: Iterative feature development
- **Relationship management**: Complex interconnections between entities
- **Performance optimization**: Proper indexing and query optimization

##  AI Integration

### Local LLM Support
- **Ollama Integration**: Connect to local Ollama instances
- **Direct GGUF Inference**: Use LLaMA.cpp for direct model loading
- **GPU Acceleration**: Support for CUDA/Metal acceleration
- **Model Management**: Scan and load local models

### AI Features
- **Content Generation**: Documents, presentations, flashcards
- **Study Assistance**: Chat-based learning support
- **Specialized Prompts**: Tailored for different content types

##  Key Features Deep Dive

### Knowledge Graph
- Visual representation of study concepts
- Interactive node exploration
- Relationship mapping between resources
- Advanced search and filtering

### Financial Management
- Comprehensive expense tracking
- Budget management with alerts
- Investment portfolio monitoring
- Savings goal planning


Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support and questions, please open an issue on the GitHub repository.
