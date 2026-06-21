import { useState, useEffect } from 'react';
import { SessionsView } from './components/SessionsView';
import { HeatmapView } from './components/HeatmapView';

function App() {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [dbStatus, setDbStatus] = useState(null);
  
  // Active session tracking details
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSessionEvents, setSelectedSessionEvents] = useState([]);
  
  // Loading indicators
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Load database status
  const fetchDbStatus = async () => {
    try {
      const response = await fetch('/api/db-status');
      if (response.ok) {
        const data = await response.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch DB status:', err);
    }
  };

  // Load all sessions
  const fetchSessions = async (showSilently = false) => {
    if (!showSilently) setLoadingSessions(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('API server returned an error');
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setErrorMsg('Could not load sessions. Please ensure the backend server is running.');
    } finally {
      if (!showSilently) setLoadingSessions(false);
    }
  };

  // Load specific session events
  const fetchSessionEvents = async (sessionId) => {
    setLoadingEvents(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('API server returned an error');
      const data = await response.json();
      setSelectedSessionEvents(data);
    } catch (err) {
      console.error(`Error fetching events for session ${sessionId}:`, err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Initial loads
  useEffect(() => {
    fetchSessions();
    fetchDbStatus();

    // Auto-refresh sessions list every 10 seconds for real-time feel
    const timer = setInterval(() => {
      fetchSessions(true);
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Sync session selection fetch
  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionEvents(selectedSessionId);
    } else {
      setSelectedSessionEvents([]);
    }
  }, [selectedSessionId]);

  const handleRefresh = () => {
    fetchSessions();
    fetchDbStatus();
    if (selectedSessionId) {
      fetchSessionEvents(selectedSessionId);
    }
  };

  return (
    <div className="app-container">
      
      {/* 1. Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="logo-container">
            <div className="logo-icon">CF</div>
            <div className="logo-text">CausalFunnel</div>
          </div>

          <nav className="nav-links">
            <button 
              id="tab-btn-sessions"
              onClick={() => setActiveTab('sessions')}
              className={`nav-item ${activeTab === 'sessions' ? 'active' : ''}`}
            >
              📊 Sessions Journey
            </button>
            <button 
              id="tab-btn-heatmap"
              onClick={() => setActiveTab('heatmap')}
              className={`nav-item ${activeTab === 'heatmap' ? 'active' : ''}`}
            >
              🔥 Heatmap Viewer
            </button>
          </nav>
        </div>

        {/* Database Status indicator at the bottom */}
        {dbStatus && (
          <div 
            style={{ 
              padding: '0.75rem', 
              borderRadius: '8px', 
              backgroundColor: dbStatus.useFallback ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              border: `1px solid ${dbStatus.useFallback ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
              fontSize: '0.75rem'
            }}
          >
            <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>DATA STORAGE MODE:</div>
            <div 
              style={{ 
                color: dbStatus.useFallback ? '#fbbf24' : '#34d399', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: dbStatus.useFallback ? '#fbbf24' : '#34d399',
                display: 'inline-block' 
              }}></span>
              {dbStatus.databaseType}
            </div>
          </div>
        )}
      </aside>

      {/* 2. Main Content Board */}
      <main className="main-content">
        
        {/* Top Control Bar */}
        <header className="top-bar">
          <div>
            <h2 className="heading-display" style={{ fontSize: '1.5rem', fontWeight: '800' }}>
              {activeTab === 'sessions' ? 'User Interaction Sessions' : 'Interactive Clicks Heatmap'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {activeTab === 'sessions' 
                ? 'Timeline logs of individual browsing journeys.' 
                : 'Aggregated mouse click coordinate distribution.'}
            </p>
          </div>
          
          <button
            id="global-refresh-button"
            onClick={handleRefresh}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-color)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
          >
            🔄 Sync Data
          </button>
        </header>

        {/* Primary View Area */}
        <section className="view-container">
          {errorMsg ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: '#ef4444',
              gap: '1rem',
              textAlign: 'center',
              maxWidth: '400px',
              margin: '2rem auto'
            }}>
              <span style={{ fontSize: '2.5rem' }}>⚠️</span>
              <h4>Connection Error</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{errorMsg}</p>
              <button 
                onClick={handleRefresh} 
                style={{
                  background: 'var(--accent-gradient)',
                  border: 'none',
                  color: 'white',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Retry Connection
              </button>
            </div>
          ) : loadingSessions ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '1rem' }}>
              <div className="spinner" style={{ width: '45px', height: '45px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ color: 'var(--text-secondary)' }}>Loading analytics dashboard...</span>
            </div>
          ) : (
            <>
              {activeTab === 'sessions' ? (
                <SessionsView
                  sessions={sessions}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={setSelectedSessionId}
                  events={selectedSessionEvents}
                  loadingEvents={loadingEvents}
                />
              ) : (
                <HeatmapView sessions={sessions} />
              )}
            </>
          )}
        </section>
      </main>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
