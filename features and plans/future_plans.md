If you want maximum control and aren’t afraid of build pain → embedded library.

If you want something that works, doesn’t freeze your app, and doesn’t require dealing with C++ build hell inside Tauri → spawn the llama.cpp binary and talk via stdin/stdout or HTTP.

# Future Plans

This document outlines future features planned for the University Study Application, including feasibility assessments and estimated story points (Fibonacci sequence).

## 1. Coursera-like Goal Implementation
**Description:** 
Implement a structured goal-setting system similar to Coursera. Users can set weekly learning targets (e.g., "Study 3 days a week" or "Complete 2 modules"), track their streak, and view visual progress indicators.

**Feasibility:** High
- **Technical Requirements:**
    - New database tables for `Goals`, `GoalProgress`, and `Streaks`.
    - Logic to calculate weekly progress and reset cycles.
    - UI components: Progress rings, streak flame icons, weekly calendar view.
- **Challenges:** 
    - Handling timezones for "daily" resets.
    - Ensuring the system motivates rather than overwhelms.

**Estimated Story Points:** 13
- Backend (Schema & Logic): 5
- Frontend (Dashboard Widgets & Configuration): 5
- Notification/Reminder System: 3

---

## 2. Predefined Note-Taking Methods
**Description:** 
Integrate specific UI modes for popular note-taking methodologies to guide users in structuring their knowledge.
- **Cornell Method:** Split screen with cues, notes, and summary sections.
- **Outline Method:** Hierarchical bullet points with easy indentation controls.
- **Mapping Method:** Visual node-based connections.

**Feasibility:** Medium to Hard (depending on the method)
- **Technical Requirements:**
    - **Cornell:** CSS Grid/Flexbox layouts with separate text areas linked to a single "Note" entity.
    - **Mapping:** Requires a canvas library (e.g., React Flow) which is a significant dependency addition.
- **Challenges:** 
    - Data persistence for complex layouts (storing coordinates for maps).
    - Mobile responsiveness for multi-column layouts like Cornell.

**Estimated Story Points:** 21 (Total)
- Cornell Layout Implementation: 5
- Outline Mode Enhancements: 3
- Mind Mapping/Graph Mode: 13

---

## 3. Templates for Taking Notes
**Description:** 
A library of reusable templates for different subjects (e.g., "Computer Science Lecture", "Literature Review", "Math Problem Set"). Users can save their own notes as templates.

**Feasibility:** High
- **Technical Requirements:**
    - Template storage system (likely a flag in the `Notes` table or a separate `Templates` table).
    - "New Note from Template" modal.
    - Variable substitution (optional, e.g., {{Date}}, {{CourseName}}).
- **Challenges:** 
    - Designing a flexible schema that handles different content types (text, code blocks, math).

**Estimated Story Points:** 5
- Template Schema & Backend: 2
- UI for Template Selection & Creation: 3

---

## 4. Agentic AI
**Description:** 
An autonomous AI assistant that can actively perform tasks within the application rather than just answering questions. Capabilities include:
- Reorganizing folders based on content.
- Scheduling study sessions for upcoming exams.
- Summarizing missed lectures automatically.
- Generating flashcards from new notes without prompting.

**Feasibility:** Low (High Complexity)
- **Technical Requirements:**
    - robust LLM integration with Function Calling (Tools).
    - A "Context Manager" to feed the AI relevant app state.
    - Background job processing for long-running agent tasks.
- **Challenges:** 
    - **Safety:** Preventing the AI from deleting or corrupting user data.
    - **Cost/Performance:** High token usage and latency.
    - **Error Handling:** Managing hallucinations in tool usage.

**Estimated Story Points:** 40 (Epic)
- Agent Framework & Tool Definitions: 13
- Context Management System: 8
- Action Execution Engine: 13
- User Approval UI (Human-in-the-loop): 6

---

## 5. Council of AI
**Description:** 
A "Board of Advisors" feature where the user can simulate a discussion between different AI personas regarding a topic.
- **Example Personas:** "The Academic" (Strict, factual), "The Creative" (Brainstorming), "The Critic" (Finds flaws), "The Simplifier" (ELI5).
The user poses a problem, and the "Council" debates it in a chat interface.

**Feasibility:** Medium
- **Technical Requirements:**
    - Orchestration logic to manage turn-taking between different system prompts.
    - UI that distinguishes between different AI speakers (avatars, colors).
- **Challenges:** 
    - Managing the context window as multiple personas add to the history.
    - Ensuring personas stay distinct and don't blend into a generic AI voice.

**Estimated Story Points:** 13
- Orchestrator Logic (Round-robin or LLM-directed): 8
- Multi-Agent Chat UI: 5
