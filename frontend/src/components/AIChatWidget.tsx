import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User, Loader2, Zap } from 'lucide-react'

interface AIChatWidgetProps {
  currentCode: string
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ currentCode }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
    { role: 'assistant', text: 'Hi! I am the CodeMe Assistant. Need a hint on your code? Just ask!' }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const generateMockResponse = (userMsg: string, code: string) => {
    const msg = userMsg.toLowerCase()
    
    // Simple heuristic-based mock AI logic
    if (msg.includes('error') || msg.includes('not working') || msg.includes('bug')) {
      if (!code.trim() || code.trim() === '<!-- Write your HTML code here -->') {
        return "It looks like your editor is currently empty. Try writing some code first and then ask me if you run into any errors!"
      }
      
      // Syntax checks for HTML
      if (code.includes('<') && !code.includes('/>') && !code.includes('</')) {
        return "It looks like you might have unclosed HTML tags. Remember that most elements like `<div>` need a matching closing tag `</div>`."
      }

      if (code.includes('console.log') && !code.includes(';')) {
         return "I see some JavaScript! Don't forget that it's good practice to end your statements with a semicolon `;`."
      }

      return "I'm looking at your code now. A good debugging strategy is to check your terminal output or use `console.log()` to see what values your variables hold. Can you be more specific about what error you are seeing?"
    }

    if (msg.includes('hint') || msg.includes('stuck') || msg.includes('help')) {
      return "Sure thing! Break the problem down into smaller steps. Have you tried checking if all your variables are defined properly? If you're writing HTML, ensure your tags are properly nested."
    }

    if (msg.includes('hello') || msg.includes('hi')) {
      return "Hello there! How can I help you with your code today?"
    }

    if (msg.includes('answer') || msg.includes('solution')) {
      return "I'm here to help you learn, so I can't give you the exact answer. But I *can* point you in the right direction! What specific part of the logic is confusing you?"
    }

    return "That's an interesting question. Based on the code you've written, you might want to review the lesson notes on syntax and logic flow. Let me know if you want a specific hint!"
  }

  const handleSend = () => {
    if (!input.trim()) return

    const userText = input.trim()
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setInput('')
    setIsTyping(true)

    // Simulate AI network delay
    setTimeout(() => {
      const response = generateMockResponse(userText, currentCode)
      setMessages(prev => [...prev, { role: 'assistant', text: response }])
      setIsTyping(false)
    }, 1500)
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        title="Open AI Tutor"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          backgroundColor: 'var(--color-purple)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 24px rgba(139, 47, 166, 0.4)',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        <Zap size={28} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              width: '350px',
              height: '500px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 1000
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px', backgroundColor: 'var(--color-purple)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={20} />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>CodeMe AI Assistant</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                title="Close AI Tutor"
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-secondary)' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ 
                    maxWidth: '85%', 
                    padding: '10px 14px', 
                    borderRadius: '12px',
                    backgroundColor: msg.role === 'user' ? 'var(--color-blue)' : 'var(--bg-primary)',
                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                    border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px',
                    borderBottomLeftRadius: msg.role === 'assistant' ? '2px' : '12px'
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)', fontSize: '0.8rem', padding: '4px' }}>
                  <Loader2 className="animate-spin" size={14} /> AI is thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                style={{ display: 'flex', gap: '8px' }}
              >
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for a hint..."
                  className="input-field"
                  style={{ flex: 1, minHeight: '40px', height: '40px', borderRadius: '20px', paddingLeft: '16px', fontSize: '0.85rem' }}
                />
                <button 
                  type="submit"
                  title="Send message"
                  disabled={!input.trim() || isTyping}
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    backgroundColor: input.trim() && !isTyping ? 'var(--color-purple)' : 'var(--bg-secondary)', 
                    color: input.trim() && !isTyping ? 'white' : 'var(--text-tertiary)',
                    border: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: input.trim() && !isTyping ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
