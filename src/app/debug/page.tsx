'use client';

import { useState } from 'react';

export default function DebugPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const testChat = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test');
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    }
    setLoading(false);
  };

  const testChatAPI = async () => {
    if (!message) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (res.ok) {
        const reader = res.body?.getReader();
        let result = '';
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += new TextDecoder().decode(value);
          }
        }
        setResponse(result);
      } else {
        setResponse(`HTTP ${res.status}: ${await res.text()}`);
      }
    } catch (error) {
      setResponse(`Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Chess Butler Debug</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testChat} disabled={loading}>
          Test Environment
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Test chat message"
          style={{ padding: '10px', width: '300px' }}
        />
        <button onClick={testChatAPI} disabled={loading || !message}>
          Test Chat API
        </button>
      </div>

      <div style={{ 
        background: '#f0f0f0', 
        padding: '10px', 
        whiteSpace: 'pre-wrap',
        minHeight: '200px'
      }}>
        {loading ? 'Loading...' : response}
      </div>
    </div>
  );
}