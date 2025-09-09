import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import UserComponent from './Components/UserComponent';
import { KnowledgeBaseComponent } from './Components/KnowledgeBased';
import { LLMEngineComponent } from './Components/LLMComponent';
import OutputChatComponent from './Components/OutputComponent';
import Sidebar from './Components/Sidebar';
import './styles/Sidebar.css';
// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          background: '#ff4444',
          color: 'white',
          borderRadius: '8px',
          margin: '10px'
        }}>
          <h3>Something went wrong with this component:</h3>
          <p>{this.state.error?.message || 'Unknown error'}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'white',
              color: '#ff4444',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Custom Node Components
const UserNode = ({ data, isConnectable }) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(0,0,0,0.2))',
      padding: '12px',
      borderRadius: '12px',
      border: '2px solid rgba(59, 130, 246, 0.3)',
      backdropFilter: 'blur(10px)',
      minWidth: '320px',
      boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)'
    }}>
      <Handle
        type="source"
        position={Position.Right}
        id="user-output"
        style={{ background: '#3b82f6', width: '12px', height: '12px' }}
        isConnectable={isConnectable}
      />
      <div style={{
        fontSize: '14px',
        color: '#3b82f6',
        marginBottom: '12px',
        textAlign: 'center',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
         User Query
      </div>
      <UserComponent onSend={data.onSend} />
    </div>
  );
};

const KnowledgeNode = ({ data, isConnectable }) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(0,0,0,0.2))',
      padding: '12px',
      borderRadius: '12px',
      border: '2px solid rgba(245, 158, 11, 0.3)',
      backdropFilter: 'blur(10px)',
      minWidth: '320px',
      boxShadow: '0 8px 32px rgba(245, 158, 11, 0.1)'
    }}>
      <Handle
        type="target"
        position={Position.Left}
        id="knowledge-input"
        style={{ background: '#f59e0b', width: '12px', height: '12px' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="knowledge-output"
        style={{ background: '#f59e0b', width: '12px', height: '12px' }}
        isConnectable={isConnectable}
      />
      <div style={{
        fontSize: '14px',
        color: '#f59e0b',
        marginBottom: '12px',
        textAlign: 'center',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
         Knowledge Base
      </div>
      <KnowledgeBaseComponent incomingQuery={data.query} autoRetrieve={false} onMatches={data.onMatches} />
    </div>
  );
};

const LLMNode = ({ data, isConnectable }) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(109, 40, 217, 0.1), rgba(0,0,0,0.2))',
      padding: '12px',
      borderRadius: '12px',
      border: '2px solid rgba(109, 40, 217, 0.3)',
      backdropFilter: 'blur(10px)',
      minWidth: '320px',
      boxShadow: '0 8px 32px rgba(109, 40, 217, 0.1)'
    }}>
      <Handle
        type="target"
        position={Position.Left}
        id="llm-input"
        style={{ background: '#6d28d9', width: '12px', height: '12px' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="llm-output"
        style={{ background: '#6d28d9', width: '12px', height: '12px' }}
        isConnectable={isConnectable}
      />
      <div style={{
        fontSize: '14px',
        color: '#6d28d9',
        marginBottom: '12px',
        textAlign: 'center',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
         LLM Engine
      </div>
      <ErrorBoundary>
        <LLMEngineComponent 
          query={data.query || ""}
          context={data.context || []}
          defaultPrompt="You are a helpful assistant. Answer clearly."
          provider="gemini"
          enableWeb={false}
          onResponse={data.onResponse}
          autoRun={false}
          renderInlineOutput={false}
          className=""
        />
      </ErrorBoundary>
    </div>
  );
};

const OutputNode = ({ data, isConnectable }) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(0,0,0,0.2))',
      padding: '12px',
      borderRadius: '12px',
      border: '2px solid rgba(34, 197, 94, 0.3)',
      backdropFilter: 'blur(10px)',
      minWidth: '320px',
      boxShadow: '0 8px 32px rgba(34, 197, 94, 0.1)'
    }}>
      <Handle
        type="target"
        position={Position.Left}
        id="output-input"
        style={{ background: '#22c55e', width: '12px', height: '12px' }}
        isConnectable={isConnectable}
      />
      <div style={{
        fontSize: '14px',
        color: '#22c55e',
        marginBottom: '12px',
        textAlign: 'center',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
         Output Chat
      </div>
      <ErrorBoundary>
        <OutputChatComponent 
          onAsk={data.onAsk}
          initialMessages={data.messages || []}
          placeholder="Ask a follow-up question..."
          autoFocus={false}
          className=""
        />
      </ErrorBoundary>
    </div>
  );
};

const nodeTypes = {
  userNode: UserNode,
  knowledgeNode: KnowledgeNode,
  llmNode: LLMNode,
  outputNode: OutputNode,
};

const initialNodes = [
  { 
    id: 'user-node', 
    type: 'userNode',
    position: { x: 50, y: 100 }, 
    data: { label: 'User Query' } 
  },
  { 
    id: 'knowledge-node', 
    type: 'knowledgeNode',
    position: { x: 450, y: 100 }, 
    data: { label: 'Knowledge Base', query: '', context: [] } 
  },
  { 
    id: 'llm-node', 
    type: 'llmNode',
    position: { x: 850, y: 100 }, 
    data: { label: 'LLM Engine', query: '', context: [] } 
  },
  { 
    id: 'output-node', 
    type: 'outputNode',
    position: { x: 1250, y: 100 }, 
    data: { label: 'Output Chat', messages: [] } 
  },
];
const initialEdges = [];
 
export default function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [currentQuery, setCurrentQuery] = useState("");
 
  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params) => {
      // Add edge without label
      const newEdge = {
        ...params,
        id: `edge-${Date.now()}`,
        style: { stroke: '#6d28d9', strokeWidth: 2 },
        markerEnd: {
          type: 'arrowclosed',
          color: '#6d28d9',
        },
      };
      setEdges((edgesSnapshot) => addEdge(newEdge, edgesSnapshot));
    },
    [],
  );

  const handleUserQuery = useCallback(async (payload) => {
    console.log('User query received:', payload);
    // Send the query to KnowledgeBaseComponent and LLM
    setCurrentQuery(payload.text);
    
    // Update both knowledge and LLM nodes with the new query
    setNodes(prevNodes => 
      prevNodes.map(node => {
        if (node.id === 'knowledge-node') {
          return { ...node, data: { ...node.data, query: payload.text } };
        } else if (node.id === 'llm-node') {
          return { ...node, data: { ...node.data, query: payload.text } };
        }
        return node;
      })
    );

    // Create a recent entry (best-effort; ignore errors)
    try {
      const title = String(payload.text || '').slice(0, 80);
      if (title) {
        await fetch('/api/recents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        });
      }
    } catch (e) {
      console.warn('Failed to add recent:', e);
    }
  }, []);

  const handleLLMResponse = useCallback((response) => {
    console.log('LLM response received:', response);
    // Update the output node with the response
    setNodes(prevNodes => 
      prevNodes.map(node => {
        if (node.id === 'output-node') {
          const newMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: response,
            sources: []
          };
          return { 
            ...node, 
            data: { 
              ...node.data, 
              messages: [...(node.data.messages || []), newMessage] 
            } 
          };
        }
        return node;
      })
    );
  }, []);

  const handleOutputAsk = useCallback(async (userText, history) => {
    console.log('Output ask received:', userText);
    // Add user message to output
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userText,
      sources: []
    };
    
    setNodes(prevNodes => 
      prevNodes.map(node => {
        if (node.id === 'output-node') {
          return { 
            ...node, 
            data: { 
              ...node.data, 
              messages: [...(node.data.messages || []), userMessage] 
            } 
          };
        }
        return node;
      })
    );

    // Pipeline orchestration (client-side): call KB retrieve then LLM generate with Gemini
    try {
      const retrieveRes = await fetch('/api/kb/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText, topK: 5 })
      });
      const { matches = [] } = retrieveRes.ok ? await retrieveRes.json() : { matches: [] };

      // Minimize and sanitize context for LLM call
      const context = (Array.isArray(matches) ? matches : [])
        .slice(0, 8)
        .map((m) => ({ chunk: (m && (m.chunk || m.text)) ? String(m.chunk || m.text) : '' }));

      const llmPayload = {
        query: userText,
        context,
        prompt: 'You are a helpful assistant. Answer clearly.',
        model: 'gemini-1.5-flash'
      };
      const llmRes = await fetch('/api/llm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(llmPayload)
      });
      if (!llmRes.ok) {
        const status = llmRes.status;
        let errBody = '';
        try { errBody = await llmRes.text(); } catch {}
        return { text: `LLM error (${status}): ${errBody}` };
      }
      const data = await llmRes.json();
      const text = data.text || '';

      // Also push assistant message into Output node state
      setNodes(prevNodes => 
        prevNodes.map(node => {
          if (node.id === 'output-node') {
            const newMessage = {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: text,
              sources: matches
            };
            return { 
              ...node, 
              data: { 
                ...node.data, 
                messages: [...(node.data.messages || []), newMessage] 
              } 
            };
          }
          return node;
        })
      );

      return { text, sources: matches };
    } catch (e) {
      return { text: `Error: ${String(e)}` };
    }
  }, []);

  // Update nodes with the handlers
  useEffect(() => {
    setNodes(prevNodes => 
      prevNodes.map(node => {
        if (node.id === 'user-node') {
          return { ...node, data: { ...node.data, onSend: handleUserQuery } };
        } else if (node.id === 'llm-node') {
          return { ...node, data: { ...node.data, onResponse: handleLLMResponse } };
        } else if (node.id === 'output-node') {
          return { ...node, data: { ...node.data, onAsk: handleOutputAsk } };
        } else if (node.id === 'knowledge-node') {
          return { ...node, data: { ...node.data, onMatches: (matches) => {
            setNodes(prev => prev.map(n => n.id === 'llm-node' ? { ...n, data: { ...n.data, context: matches } } : n));
          } } };
        }
        return node;
      })
    );
  }, [handleUserQuery, handleLLMResponse, handleOutputAsk]);
 
 // App.jsx (return block)
return (
  <div
    style={{
      display: "flex",
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
      background: "#ffffff",
    }}
  >
    {/* Left: sidebar */}
    <Sidebar />

    

      {/* React Flow canvas fills the remaining space */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        style={{ width: "100%", height: "100%", background: "transparent" }}
        defaultEdgeOptions={{
          style: { stroke: "#6d28d9", strokeWidth: 2 },
          markerEnd: { type: "arrowclosed", color: "#6d28d9" },
          labelStyle: { fill: "#fff", fontWeight: 600 },
          labelBgStyle: { fill: "#6d28d9", fillOpacity: 0.8 },
          labelBgPadding: [4, 8],
          labelBgBorderRadius: 4,
        }}
        fitViewOptions={{ padding: 0.2 }}
      />
    </div>
);
}