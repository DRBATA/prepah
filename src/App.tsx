import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!input) return
    
    setLoading(true)
    setResponse('')
    
    try {
      // Call the OpenAI Responses API with any input
      const result = await fetch('/api/pure-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: input })
      })
      
      const data = await result.json()
      
      // Display just the greeting if available, otherwise show full response
      if (data.greeting) {
        setResponse(data.greeting);
      } else {
        setResponse(JSON.stringify(data, null, 2));
      }
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>The Water Bar</h1>
      <div className="card">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type anything for a greeting"
          style={{ padding: '8px', marginRight: '10px', width: '250px' }}
        />
        <button 
          onClick={handleSubmit}
          disabled={loading || !input}
        >
          {loading ? 'Processing...' : 'Get Greeting'}
        </button>
        
        {loading && <div>Loading response...</div>}
        
        {response && (
          <div className="response" style={{ marginTop: '20px', textAlign: 'left' }}>
            <h3>Response:</h3>
            <div style={{ 
              background: '#f5f5f5', 
              padding: '20px', 
              borderRadius: '10px',
              maxWidth: '500px',
              margin: '0 auto',
              whiteSpace: 'pre-wrap'
            }}>
              {response}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default App