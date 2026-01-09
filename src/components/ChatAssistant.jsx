import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Bot, User, ChevronRight, ChevronLeft, Terminal, RefreshCw } from 'lucide-react';
import { adkClient } from '../services/adkClient';
import ChatMessage from './ChatMessage';

// Fixed username
const USER_NAME = 'ashwin';
const DEFAULT_APP_NAME = 'inventory_management_agent';

// Generate session ID in format "session_XXXX"
const generateSessionId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    return `session_${randomNum}`;
};

const ChatAssistant = ({ isCollapsed, onToggle }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(generateSessionId());
    const [appName, setAppName] = useState(DEFAULT_APP_NAME);
    const [width, setWidth] = useState(400); // Resizable width
    const [isResizing, setIsResizing] = useState(false);
    
    // Min/max constraints for width
    const MIN_WIDTH = 280;
    const MAX_WIDTH_RATIO = 0.7; // Max 70% of window width

    const scrollRef = useRef(null);
    const resizeRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isCollapsed]);

    // Resize handlers
    const handleMouseDown = useCallback((e) => {
        setIsResizing(true);
        e.preventDefault();
        e.stopPropagation();
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;

            const newWidth = window.innerWidth - e.clientX;
            const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
            
            // Constrain width between MIN_WIDTH and maxWidth
            if (newWidth >= MIN_WIDTH && newWidth <= maxWidth) {
                setWidth(newWidth);
            } else if (newWidth < MIN_WIDTH) {
                setWidth(MIN_WIDTH);
            } else if (newWidth > maxWidth) {
                setWidth(maxWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    const [adkAvailable, setAdkAvailable] = useState(null); // null = checking, true = available, false = unavailable
    const [isCreatingSession, setIsCreatingSession] = useState(false);

    // System instructions for the agent to follow
    const SYSTEM_INSTRUCTIONS = `
    You are Dwight, the Obsidian Intelligence Assistant for Ixia Inventory Explorer.
    
    CRITICAL STRUCTURE GUIDELINES:
    1. For Card/Hardware Details: Use Markdown Tables. Columns: Card #, Card Type, Serial Number, Number of Ports, State.
    2. For License Details: Use Markdown Tables. Columns: License #, Part Number, Description, Expiry Date, Status.
    3. For LLDP information: If no peer data is available or most fields are "NA", do not list them. Instead, say: "There is no LLDP peer data available for chassis [IP]."
    
    GENERAL GUIDELINES:
    - Be concise, professional, and helpful.
    - Use technical but accessible language.
    - If data is too large for a table, use a summary followed by the table.
    `;

    // Cleans the assistant response to ensure it follows clarity guidelines
    const cleanResponse = (text) => {
        if (!text) return text;

        const lowerText = text.toLowerCase();
        const naCount = (text.match(/\b(NA|N\/A|n\/a)\b/g) || []).length;
        const lines = text.split('\n').filter(l => l.trim().length > 0);

        // Count lines that have actual data (not just NA or empty)
        const dataLines = lines.filter(line => {
            const trimmed = line.trim();
            // A line has data if it's not just NA, dashes, or whitespace
            return trimmed.length > 0 &&
                !trimmed.match(/^[\s\-|NA]+$/) &&
                trimmed.toLowerCase() !== 'na';
        });

        // Only clean if the response is TRULY empty (very high NA ratio and few data lines)
        // This prevents filtering out valid responses that happen to have some NA values
        const naRatio = naCount / Math.max(lines.length, 1);
        const hasRealData = dataLines.length > 5; // If more than 5 lines have real data, keep it

        // Only trigger cleanup if NA ratio is very high (>70%) AND there's minimal real data
        if (naRatio > 0.7 && !hasRealData && naCount >= 5) {
            const ipMatch = text.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            const ip = ipMatch ? ipMatch[0] : 'the chassis';

            if (lowerText.includes('lldp')) {
                return `There is no LLDP peer data available for chassis ${ip}.`;
            }

            if (lowerText.includes('port') || lowerText.includes('interface')) {
                return `No detailed port configuration available for chassis ${ip}.`;
            }

            return `Requested information for chassis ${ip} is currently unavailable (no data found).`;
        }

        return text;
    };

    // Initialize/create session
    const initializeSession = useCallback(async (newSessionId) => {
        setIsCreatingSession(true);
        try {
            // 1. Get available apps (returns [] if ADK server not available)
            const apps = await adkClient.listApps();

            // If no apps available, ADK server is not running
            if (apps.length === 0) {
                console.warn('ADK server not available, chat assistant disabled');
                setAdkAvailable(false);
                setMessages([{
                    role: 'assistant',
                    text: 'Intelligence Assistant is offline. Start the ADK server to enable AI features.'
                }]);
                return;
            }

            const activeApp = apps.includes(DEFAULT_APP_NAME) ? DEFAULT_APP_NAME : (apps[0] || DEFAULT_APP_NAME);
            setAppName(activeApp);
            adkClient.setAppName(activeApp);

            // 2. Initialize session with context and instructions
            await adkClient.createSession(USER_NAME, newSessionId, {
                state: {
                    started_at: new Date().toISOString(),
                    context: 'Ixia Inventory Explorer',
                    user: USER_NAME,
                    instructions: SYSTEM_INSTRUCTIONS, // Hint to the agent if supported
                    preferred_format: {
                        empty_lldp: "There is no LLDP peer data available for chassis {ip}",
                        use_tables: true
                    }
                }
            });
            console.log(`ADK Session initialized: ${newSessionId} for user: ${USER_NAME}, app: ${activeApp}`);
            setAdkAvailable(true);
            setMessages([{
                role: 'assistant',
                text: `Hello ${USER_NAME}! I am Dwight, your Obsidian Intelligence Assistant. Session ${newSessionId} is ready. How can I help you today?`
            }]);
        } catch (error) {
            // Don't block the app, just disable ADK features
            console.warn('ADK Agent initialization failed (non-critical):', error.message);
            setAdkAvailable(false);
            setMessages([{
                role: 'assistant',
                text: 'Intelligence Assistant encountered an error. Please try again later.'
            }]);
        } finally {
            setIsCreatingSession(false);
        }
    }, []);

    // Initialize session on mount
    useEffect(() => {
        initializeSession(sessionId);
    }, []);

    // Create a new session
    const handleNewSession = async () => {
        const newSessionId = generateSessionId();
        setSessionId(newSessionId);
        setMessages([]); // Clear chat history
        await initializeSession(newSessionId);
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Use the bridge client to send the message
            let assistantText = await adkClient.sendSyncMessage(USER_NAME, sessionId, input);

            // Apply feedback-driven clarity rules
            assistantText = cleanResponse(assistantText);

            setMessages((prev) => [...prev, { role: 'assistant', text: assistantText }]);
        } catch (error) {
            console.error('Error calling agent:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', text: 'Error: Could not reach the assistant. Make sure the ADK server is running: http://localhost:8000' }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className={`flex flex-col border-l border-white/10 bg-[#0a0a0c] transition-none h-full overflow-hidden relative`}
            style={{ width: isCollapsed ? '48px' : `${width}px` }}
        >
            {/* Resize Handle - Wide grab area with visual indicator */}
            {!isCollapsed && (
                <div
                    ref={resizeRef}
                    onMouseDown={handleMouseDown}
                    className={`absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-50 group flex items-center justify-center
                        ${isResizing ? 'bg-purple-500/20' : 'hover:bg-purple-500/10'}`}
                    style={{ cursor: 'ew-resize' }}
                >
                    {/* Visual drag indicator */}
                    <div className={`w-1 h-16 rounded-full transition-all duration-150
                        ${isResizing 
                            ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' 
                            : 'bg-white/10 group-hover:bg-purple-500/70 group-hover:shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                        }`} 
                    />
                    {/* Grip dots */}
                    <div className={`absolute flex flex-col gap-1 transition-opacity
                        ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div className="w-0.5 h-0.5 rounded-full bg-purple-400"></div>
                        <div className="w-0.5 h-0.5 rounded-full bg-purple-400"></div>
                        <div className="w-0.5 h-0.5 rounded-full bg-purple-400"></div>
                    </div>
                    {/* Width indicator tooltip while resizing */}
                    {isResizing && (
                        <div className="absolute -left-14 top-1/2 -translate-y-1/2 bg-purple-600 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            {width}px
                        </div>
                    )}
                </div>
            )}

            {/* Collapse Toggle Handle */}
            <button
                onClick={onToggle}
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white z-50 hover:bg-purple-500 transition-colors shadow-lg"
            >
                {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Sidebar Header */}
            <div className={`p-4 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border-b border-white/10 ${isCollapsed ? 'flex items-center justify-center' : ''}`}>
                {!isCollapsed ? (
                    <div className="space-y-2">
                        {/* Top row: Title and New Session button */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)] ${adkAvailable ? 'bg-green-500' : adkAvailable === false ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-200 text-xs tracking-[0.1em] uppercase block leading-none">Dwight - Intelligence Hub</span>
                                </div>
                            </div>
                            <button
                                onClick={handleNewSession}
                                disabled={isCreatingSession || !adkAvailable}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-[10px] font-semibold text-purple-300 uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Start a new session"
                            >
                                <RefreshCw size={12} className={isCreatingSession ? 'animate-spin' : ''} />
                                New Session
                            </button>
                        </div>
                        {/* Bottom row: Session info */}
                        <div className="flex items-center justify-between text-[9px] font-mono">
                            <span className="text-white/30 uppercase">User: <span className="text-cyan-400">{USER_NAME}</span></span>
                            <span className="text-white/30">Assistant: <span className="text-purple-400 font-bold">Dwight</span> | Session: <span className="text-emerald-400 font-semibold">{sessionId}</span></span>
                        </div>
                    </div>
                ) : (
                    <Terminal size={18} className="text-purple-400" />
                )}
            </div>

            {!isCollapsed && (
                <>
                    {/* Chat Messages Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {messages.map((ms, idx) => (
                            <ChatMessage key={idx} role={ms.role} text={ms.text} />
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white/2 border border-white/5 p-4 rounded-2xl">
                                    <div className="flex gap-1.5">
                                        <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1 h-1 bg-purple-300 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Context Footer */}
                    <div className="p-4 bg-white/[0.02] border-t border-white/10">
                        <div className="relative group">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && adkAvailable) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={adkAvailable ? "Command input..." : "Assistant offline..."}
                                disabled={!adkAvailable}
                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 pr-12 text-xs text-white placeholder-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all resize-none min-h-[45px] max-h-32 disabled:opacity-50"
                                rows={1}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim() || !adkAvailable}
                                className="absolute right-2.5 bottom-2.5 p-1.5 text-purple-500 hover:text-purple-400 disabled:opacity-20 transition-all"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between px-1 opacity-40">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${adkAvailable ? 'bg-green-500' : adkAvailable === false ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                                <span className="text-[8px] font-black tracking-widest uppercase text-white/40">
                                    {adkAvailable ? 'Bridge Link Stable' : adkAvailable === false ? 'Offline' : 'Connecting...'}
                                </span>
                            </div>
                            <span className="text-[8px] font-mono italic">v2.1.0-sidebar</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChatAssistant;
