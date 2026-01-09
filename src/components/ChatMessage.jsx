import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const ChatMessage = ({ role, text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} group mb-4`}>
            <div className={`relative max-w-[90%] p-4 rounded-2xl text-xs leading-relaxed transition-all ${role === 'user'
                    ? 'bg-purple-600/10 border border-purple-500/20 text-purple-100'
                    : 'bg-white/[0.03] border border-white/10 text-slate-300 shadow-xl backdrop-blur-sm'
                }`}>
                {/* Role Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 opacity-40 text-[9px] uppercase font-black tracking-widest">
                        {role === 'user' ? <User size={12} /> : <Bot size={12} className="text-purple-400" />}
                        <span>{role === 'assistant' ? 'Dwight' : role}</span>
                    </div>

                    {/* Compact Action Buttons */}
                    <button
                        onClick={handleCopy}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded text-white/40 hover:text-white"
                        title="Copy message"
                    >
                        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    </button>
                </div>

                {/* Content */}
                <div className="markdown-content font-medium overflow-x-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {text}
                    </ReactMarkdown>
                </div>

                {/* Decorative glow for assistant messages */}
                {role === 'assistant' && (
                    <div className="absolute -z-10 inset-0 bg-purple-500/5 blur-2xl rounded-full opacity-50 pointer-events-none"></div>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;
