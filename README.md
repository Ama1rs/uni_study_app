# Uni Study App

A comprehensive, cross-platform desktop application built with **Tauri + React + TypeScript** designed specifically for university students. This all-in-one academic productivity suite combines note-taking, course management, AI-powered content generation, financial tracking, and advanced study tools.

## 🚀 Features

### 🎓 Academic Management
- **Course/Repository System**: Organize study materials by semester and subject
- **Grade Tracking**: Comprehensive grading system with GPA calculation and grade projection
- **Lecture Management**: YouTube playlist integration with progress tracking
- **Resource Management**: Support for notes, documents, presentations, PDFs, images, and videos

### 🧠 AI-Powered Tools
- **Local LLM Integration**: Support for Ollama and direct GGUF model inference
- **Document Generation**: AI-assisted creation of study notes and documents
- **Presentation Generation**: Automated slide deck creation
- **Flashcard Generation**: AI-powered flashcard creation from study materials
- **Chat Interface**: Local AI chat for study assistance

### 📚 Study Tools
- **Knowledge Graph**: Visual representation of interconnected study concepts
- **Flashcard System**: Spaced repetition with 3D dealer mode visualization
- **Note Editor**: Rich markdown editor with preview
- **Book Library**: EPUB reader with progress tracking, bookmarks, and highlights
- **Focus Mode**: Distraction-free study environment

### 📅 Planning & Organization
- **Task Management**: Todo lists with priority tracking
- **Planner/Calendar**: Event scheduling with recurrence support
- **Study Sessions**: Time tracking with break management
- **D-Day Countdown**: Important deadline tracking

### 💰 Financial Management
- **Expense Tracking**: Categorized spending monitoring
- **Budget Management**: Monthly budget limits and tracking
- **Savings Goals**: Target-based savings planning
- **Asset Tracking**: Investment and asset portfolio management

### 🎨 User Experience
- **Multi-Profile Support**: Separate user accounts with authentication
- **Theme System**: Extensive customization with light/dark modes
- **Responsive Design**: Adaptive layouts for different screen sizes
- **Onboarding Flow**: Guided setup for new users
- **Accessibility**: Keyboard navigation and screen reader support

## 🛠️ Tech Stack

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

## 📦 Installation

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

## 🏗️ Project Structure

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

## 📊 Database

The application uses SQLite with a comprehensive migration system:
- **Multi-profile architecture**: Separate databases per user
- **17+ migrations**: Iterative feature development
- **Relationship management**: Complex interconnections between entities
- **Performance optimization**: Proper indexing and query optimization

## 🤖 AI Integration

### Local LLM Support
- **Ollama Integration**: Connect to local Ollama instances
- **Direct GGUF Inference**: Use LLaMA.cpp for direct model loading
- **GPU Acceleration**: Support for CUDA/Metal acceleration
- **Model Management**: Scan and load local models

### AI Features
- **Content Generation**: Documents, presentations, flashcards
- **Study Assistance**: Chat-based learning support
- **Specialized Prompts**: Tailored for different content types

## 🎯 Key Features Deep Dive

### Knowledge Graph
- Visual representation of study concepts
- Interactive node exploration
- Relationship mapping between resources
- Advanced search and filtering

### 3D Flashcard System
- React Three Fiber powered 3D environment
- Dealer mode with character animations
- Spaced repetition algorithm
- Progress tracking and analytics

### Financial Management
- Comprehensive expense tracking
- Budget management with alerts
- Investment portfolio monitoring
- Savings goal planning

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support and questions, please open an issue on the GitHub repository.
