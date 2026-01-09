import axios from 'axios';

/**
 * ADKClient - A bridge between the UI and the Google ADK Agent backend.
 */
class ADKClient {
    constructor(baseUrl = '/adk') {
        this.client = axios.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        this.appName = null;
    }

    /**
     * Set the application name to use for subsequent requests.
     * @param {string} appName 
     */
    setAppName(appName) {
        this.appName = appName;
    }

    /**
     * List all available apps on the ADK server.
     * Returns empty array if ADK server is not available.
     * @returns {Promise<string[]>}
     */
    async listApps() {
        try {
            const response = await this.client.get('/list-apps');
            // The response can be an array of strings or a ListAppsResponse object
            if (Array.isArray(response.data)) {
                return response.data;
            } else if (response.data.apps) {
                return response.data.apps.map(app => app.name);
            }
            return [];
        } catch (error) {
            // If ADK server is not running, return empty array instead of throwing
            if (!error.response) {
                console.warn('ADKClient: ADK server not available, assistant features disabled');
                return [];
            }
            console.error('ADKClient: Failed to list apps', error);
            throw error;
        }
    }

    /**
     * Initialize a session for a user.
     * Handles 409 Conflict gracefully (session already exists).
     * @param {string} userId 
     * @param {string} sessionId 
     * @param {object} initialState 
     * @returns {Promise<object>}
     */
    async createSession(userId, sessionId, initialState = {}) {
        if (!this.appName) throw new Error('App name not set');
        try {
            const response = await this.client.post(
                `/apps/${this.appName}/users/${userId}/sessions/${sessionId}`,
                initialState
            );
            return response.data;
        } catch (error) {
            // 409 Conflict means session already exists - this is OK, just use it
            if (error.response?.status === 409) {
                console.log(`ADKClient: Session ${sessionId} already exists, reusing it`);
                return { sessionId, status: 'existing' };
            }
            console.error(`ADKClient: Failed to create session ${sessionId}`, error);
            throw error;
        }
    }

    /**
     * Run the agent with a new message (Synchronous).
     * @param {string} userId 
     * @param {string} sessionId 
     * @param {string} text 
     * @returns {Promise<string>} The assistant's response text.
     */
    async sendSyncMessage(userId, sessionId, text) {
        if (!this.appName) throw new Error('App name not set');
        try {
            const response = await this.client.post('/run', {
                appName: this.appName,
                userId: userId,
                sessionId: sessionId,
                newMessage: {
                    role: 'user',
                    parts: [{ text: text }]
                }
            });

            // ADK returns an array of events. We look for the model's text response.
            // Usually it's the last event or events with role 'model'.
            const ModelEvents = response.data.filter(event =>
                event.author === 'model' || (event.content && event.content.role === 'model')
            );

            if (ModelEvents.length > 0) {
                // Concatenate all text parts from the model
                return ModelEvents.map(event =>
                    event.content.parts.map(part => part.text || '').join('')
                ).join('\n');
            }

            return 'I processed your request but have no text response.';
        } catch (error) {
            console.error('ADKClient: Error in sendSyncMessage', error);
            throw error;
        }
    }

    /**
     * Run the agent with streaming (SSE).
     * @param {string} userId 
     * @param {string} sessionId 
     * @param {string} text 
     * @param {function} onChunk - Callback for each text chunk received.
     * @param {function} onComplete - Callback when streaming is finished.
     */
    async sendStreamingMessage(userId, sessionId, text, onChunk, onComplete) {
        if (!this.appName) throw new Error('App name not set');

        try {
            const response = await fetch(`${this.client.defaults.baseURL}/run_sse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    appName: this.appName,
                    userId: userId,
                    sessionId: sessionId,
                    newMessage: {
                        role: 'user',
                        parts: [{ text: text }]
                    }
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            // ADK Event objects in SSE
                            const textPart = data.content?.parts?.[0]?.text;
                            if (textPart) {
                                fullContent += textPart;
                                if (onChunk) onChunk(textPart, fullContent);
                            }
                        } catch (e) {
                            // Some lines might not be valid JSON (e.g. heartbeat)
                        }
                    }
                }
            }

            if (onComplete) onComplete(fullContent);
            return fullContent;
        } catch (error) {
            console.error('ADKClient: Error in sendStreamingMessage', error);
            throw error;
        }
    }
}

export const adkClient = new ADKClient();
export default ADKClient;
