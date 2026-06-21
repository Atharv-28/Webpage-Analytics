import { useState } from 'react';

export const SessionsView = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  events,
  loadingEvents
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEventId, setExpandedEventId] = useState(null);

  // Filter sessions by search term
  const filteredSessions = sessions.filter(s =>
    s.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.urls.some(url => url.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Helper: Format datetime
  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper: Get session duration
  const getDuration = (start, end) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff < 1000) return '0s';
    const seconds = Math.floor(diff / 1000) % 60;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    let str = '';
    if (hours > 0) str += `${hours}h `;
    if (minutes > 0) str += `${minutes}m `;
    if (seconds > 0 || str === '') str += `${seconds}s`;
    return str.trim();
  };

  // Helper: Extract relative path from absolute URL
  const getUrlPath = (urlStr) => {
    try {
      const url = new URL(urlStr);
      return url.pathname + url.search;
    } catch {
      return urlStr;
    }
  };

  // Helper: Format timestamp delay from start event
  const getRelativeOffset = (eventTimeStr, startTimeStr) => {
    const diff = new Date(eventTimeStr).getTime() - new Date(startTimeStr).getTime();
    return `+${(diff / 1000).toFixed(1)}s`;
  };

  const toggleEventExpand = (id) => {
    if (expandedEventId === id) {
      setExpandedEventId(null);
    } else {
      setExpandedEventId(id);
    }
  };

  return (
    <div className="sessions-view-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', height: '100%' }}>
      
      {/* 1. Left Sidebar: Sessions List */}
      <div className="sessions-list-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'hidden', height: 'calc(100vh - 140px)' }}>
        <div className="search-box">
          <input
            id="session-search-input"
            type="text"
            placeholder="Search sessions or URLs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-panel)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.9rem',
              transition: 'border-color 0.2s'
            }}
          />
        </div>

        <div className="sessions-scroll" style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '4px' }}>
          {filteredSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No sessions found.
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = selectedSessionId === session.sessionId;
              return (
                <div
                  key={session.sessionId}
                  id={`session-card-${session.sessionId}`}
                  onClick={() => onSelectSession(session.sessionId)}
                  className={`card ${isActive ? 'active-card' : ''}`}
                  style={{
                    cursor: 'pointer',
                    padding: '1rem',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-panel)',
                    borderColor: isActive ? 'var(--accent-blue)' : 'var(--border-color)',
                    boxShadow: isActive ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span 
                      style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '0.8rem', 
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '600'
                      }}
                    >
                      {session.sessionId.substring(0, 16)}...
                    </span>
                    <span className="badge badge-purple">{session.eventCount} events</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    <span>{formatDate(session.startedAt)}</span>
                    <span>•</span>
                    <span>{formatTime(session.startedAt)}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--accent-green)', fontWeight: '500' }}>
                      {getDuration(session.startedAt, session.endedAt)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Paths Visited
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {session.urls.map((url, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.75rem',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '180px'
                          }}
                        >
                          {getUrlPath(url)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right Pane: User Journey Details */}
      <div className="journey-panel card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
        {!selectedSessionId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifycontent: 'center', flexGrow: 1, color: 'var(--text-muted)', gap: '1rem' }}>
            <div style={{ fontSize: '3rem' }}>🎯</div>
            <h3>Select a session to view user journey</h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '360px', textAlign: 'center' }}>
              Explore the detailed actions, timestamps, and page interactions performed by the customer in this session.
            </p>
          </div>
        ) : loadingEvents ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: '1rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <span style={{ color: 'var(--text-muted)' }}>Fetching events...</span>
          </div>
        ) : events.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
            <span style={{ color: 'var(--text-muted)' }}>No events recorded for this session.</span>
          </div>
        ) : (
          <>
            <div className="journey-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="heading-display" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                  Session Journey
                </h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ID: {selectedSessionId}
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div>Total Duration: <strong style={{ color: 'var(--accent-green)' }}>{getDuration(events[0].timestamp, events[events.length - 1].timestamp)}</strong></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IP: {events[0].ip || 'unknown'}</div>
              </div>
            </div>

            <div className="journey-events-scroll" style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '8px' }}>
              <div className="timeline-container" style={{ position: 'relative', paddingLeft: '2rem', borderLeft: '2px solid var(--border-color)', margin: '0.5rem 0 2rem 1rem' }}>
                {events.map((event, index) => {
                  const eventId = event._id || index.toString();
                  const isExpanded = expandedEventId === eventId;
                  const isPageView = event.eventType === 'page_view';
                  
                  // Compute offset
                  const relativeOffset = getRelativeOffset(event.timestamp, events[0].timestamp);

                  return (
                    <div 
                      key={eventId} 
                      className="timeline-item"
                      style={{ position: 'relative', marginBottom: '2rem' }}
                    >
                      {/* Timeline Circle Bullet */}
                      <div 
                        style={{
                          position: 'absolute',
                          left: 'calc(-2rem - 7px)',
                          top: '4px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: isPageView ? 'var(--accent-blue)' : 'var(--accent-purple)',
                          border: '2px solid var(--bg-panel)',
                          boxShadow: isPageView ? '0 0 8px rgba(59, 130, 246, 0.6)' : '0 0 8px rgba(139, 92, 246, 0.6)',
                          zIndex: 2
                        }}
                      ></div>

                      {/* Event header line */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`badge ${isPageView ? 'badge-blue' : 'badge-purple'}`}>
                            {event.eventType}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                            {relativeOffset}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {formatTime(event.timestamp)}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {getUrlPath(event.url)}
                        </span>
                      </div>

                      {/* Event details card */}
                      <div 
                        onClick={() => toggleEventExpand(eventId)}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '8px',
                          padding: '0.85rem 1rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                        }}
                      >
                        {isPageView ? (
                          <div style={{ fontSize: '0.9rem' }}>
                            Visited page: <strong style={{ color: '#fff' }}>{event.metadata.title || 'Untitled Page'}</strong>
                            {event.metadata.referrer && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                Referrer: {event.metadata.referrer}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.9rem' }}>
                            Clicked <code style={{ color: 'var(--accent-purple)', padding: '0 4px', background: 'rgba(139, 92, 246, 0.1)' }}>{event.metadata.elementTag}</code>
                            {event.metadata.elementText && (
                              <span> with text <strong style={{ color: '#fff' }}>"{event.metadata.elementText}"</strong></span>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                              <span>Coordinates: <strong>X: {event.metadata.x}, Y: {event.metadata.y}</strong></span>
                              <span>Viewport: <strong>{event.metadata.screenWidth}x{event.metadata.screenHeight}</strong></span>
                            </div>
                          </div>
                        )}

                        {/* Expanded details */}
                        {isExpanded && (
                          <div 
                            style={{ 
                              marginTop: '0.75rem', 
                              paddingTop: '0.75rem', 
                              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                              fontSize: '0.8rem',
                              color: 'var(--text-secondary)'
                            }}
                            onClick={(e) => e.stopPropagation()} // Stop toggle when copying or clicking inside
                          >
                            <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Event Details (Raw Payload)</div>
                            <pre style={{
                              backgroundColor: 'var(--bg-dark)',
                              padding: '0.75rem',
                              borderRadius: '6px',
                              overflowX: 'auto',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.75rem',
                              color: '#34d399',
                              border: '1px solid var(--border-color)'
                            }}>
                              {JSON.stringify(event, null, 2)}
                            </pre>
                            {event.userAgent && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <strong>User Agent:</strong> {event.userAgent}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
