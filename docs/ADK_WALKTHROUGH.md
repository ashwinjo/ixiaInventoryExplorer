# ADK Agent Bridge & Chatbot Walkthrough

This walkthrough explains how the **ADK Client Bridge** connects the UI Chatbot widget to the **Google ADK Agent** backend.

## 1. The Bridge Architecture

The integration is divided into three layers:
- **UI Component (`ChatAssistant.jsx`)**: Now integrated as a **collapsible side pane** (sidebar) on the right side of the layout.
- **Bridge Client (`adkClient.js`)**: An abstraction layer that simplifies talking to the ADK API (using the `/adk` proxy path).
- **ADK Agent Backend**: The FastAPI server running at `localhost:8000`.

## 2. ADK Client Bridge (`src/services/adkClient.js`)

The `ADKClient` class provides a clean JavaScript interface for the ADK API:

- **`listApps()`**: Discovers available agents on the server.
- **`createSession(userId, sessionId)`**: Establishes a stateful session for the user.
- **`sendSyncMessage(userId, sessionId, text)`**: Sends a message and waits for the full assistant response.

## 3. The Chatbot Interaction Flow

1. **Initialization**: When the `Layout` renders, the `ChatAssistant` sidebar mounts and:
   - Fetches available apps from the backend.
   - Initializes a session with `userId` and `sessionId`.
2. **User Input**: Type commands or questions in the sidebar's input area.
3. **Toggle Layout**: Use the purple handle on the left edge of the sidebar to collapse or expand the intelligence hub.
4. **Processing**: The model processes the request using MCP tools (specifically `agent_mcp_tools_calls`).
5. **Response**: The assistant's text is displayed in the sidebar chat area.

## 4. How to Run

1. **Start the ADK Agent**:
   ```bash
   adk run --port 8000
   ```
2. **Start the UI**:
   ```bash
   npm run dev
   ```
3. **Interact**: The "Intelligence Hub" is always available on the right. Pull it out using the toggle handle if it's collapsed.

---
*Powered by Google ADK (Agent Development Kit)*
