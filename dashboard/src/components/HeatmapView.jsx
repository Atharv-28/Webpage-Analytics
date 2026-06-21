import { useState, useEffect, useRef } from 'react';
import TouchAppIcon from '@mui/icons-material/TouchApp';

export const HeatmapView = ({ sessions }) => {
  const [urls, setUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Customizer state
  const [dotRadius, setDotRadius] = useState(25);
  const [dotOpacity, setDotOpacity] = useState(0.8);
  const [showIframe, setShowIframe] = useState(true);
  const [zoom, setZoom] = useState(0.75); // default zoom scale factor (75%)

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Extract unique URLs from sessions
  useEffect(() => {
    const uniqueUrls = new Set();
    sessions.forEach(s => {
      s.urls.forEach(url => uniqueUrls.add(url));
    });
    const urlList = Array.from(uniqueUrls);
    setUrls(urlList);
    
    // Auto-select first URL if available
    if (urlList.length > 0 && !selectedUrl) {
      setSelectedUrl(urlList[0]);
    }
  }, [sessions]);

  // Fetch click events when URL changes and setup periodic syncing
  useEffect(() => {
    if (!selectedUrl) return;

    const fetchHeatmapData = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const response = await fetch(`/api/heatmap?url=${encodeURIComponent(selectedUrl)}`);
        const data = await response.json();
        setClicks(data);
      } catch (err) {
        console.error('Error fetching heatmap clicks:', err);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchHeatmapData();

    // Auto-sync heatmap clicks every 5 seconds
    const interval = setInterval(() => {
      fetchHeatmapData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedUrl]);

  // Draw Heatmap Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || clicks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    clicks.forEach(click => {
      // Use the document coordinate ratios to plot dots
      const x = click.metadata.xRatio * canvas.width;
      const y = click.metadata.yRatio * canvas.height;

      // Create glowing radial gradient for heat mapping
      const gradient = ctx.createRadialGradient(x, y, 2, x, y, dotRadius);
      
      // Heat color ranges: hot red inside -> orange/yellow -> green -> transparent
      gradient.addColorStop(0, `rgba(239, 68, 68, ${dotOpacity})`);
      gradient.addColorStop(0.2, `rgba(245, 158, 11, ${dotOpacity * 0.75})`);
      gradient.addColorStop(0.5, `rgba(16, 185, 129, ${dotOpacity * 0.3})`);
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [clicks, dotRadius, dotOpacity, showIframe]);

  // Calculate some analytics stats for the page clicks
  const getTotalClicks = () => clicks.length;

  const getMostClickedElement = () => {
    if (clicks.length === 0) return 'None';
    const counts = {};
    clicks.forEach(c => {
      const tag = c.metadata.elementTag;
      const text = c.metadata.elementText ? ` "${c.metadata.elementText}"` : '';
      const key = `${tag}${text}`.trim();
      counts[key] = (counts[key] || 0) + 1;
    });

    let topElement = '';
    let max = 0;
    Object.entries(counts).forEach(([el, count]) => {
      if (count > max) {
        max = count;
        topElement = el;
      }
    });
    return `${topElement} (${max} clicks)`;
  };

  const getAvgResolution = () => {
    if (clicks.length === 0) return 'N/A';
    let totalW = 0;
    let totalH = 0;
    clicks.forEach(c => {
      totalW += c.metadata.screenWidth || 1200;
      totalH += c.metadata.screenHeight || 800;
    });
    const avgW = Math.round(totalW / clicks.length);
    const avgH = Math.round(totalH / clicks.length);
    return `${avgW} x ${avgH}`;
  };

  // Extract page size
  const getCanvasDimensions = () => {
    if (clicks.length === 0) return { width: 1200, height: 800 };
    // Find the max scroll width and height recorded
    let maxW = 1200;
    let maxH = 800;
    clicks.forEach(c => {
      if (c.metadata.docWidth && c.metadata.docWidth > maxW) maxW = c.metadata.docWidth;
      if (c.metadata.docHeight && c.metadata.docHeight > maxH) maxH = c.metadata.docHeight;
    });
    // Cap height for visual sanity
    return { width: maxW, height: maxH };
  };

  const dimensions = getCanvasDimensions();

  // Helper to extract path
  const getUrlPath = (urlStr) => {
    try {
      const url = new URL(urlStr);
      return url.pathname + url.search;
    } catch {
      return urlStr;
    }
  };

  // Determine if URL is local demo to load inside iframe
  const isDemoUrl = selectedUrl && (selectedUrl.includes('/demo') || selectedUrl.endsWith('demo.html'));

  return (
    <div className="heatmap-view-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header controls panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label htmlFor="url-select" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Select Page URL:
            </label>
            <select
              id="url-select"
              value={selectedUrl}
              onChange={(e) => setSelectedUrl(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '280px'
              }}
            >
              {urls.length === 0 ? (
                <option value="">No pages tracked yet</option>
              ) : (
                urls.map((url, i) => (
                  <option key={i} value={url}>
                    {getUrlPath(url)} ({url})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            
            {/* Radius slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Size:</span>
              <input
                type="range"
                min="10"
                max="80"
                value={dotRadius}
                onChange={(e) => setDotRadius(Number(e.target.value))}
                style={{ cursor: 'pointer', width: '100px' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: '30px' }}>
                {dotRadius}px
              </span>
            </div>

            {/* Opacity slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Intensity:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={dotOpacity}
                onChange={(e) => setDotOpacity(Number(e.target.value))}
                style={{ cursor: 'pointer', width: '100px' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: '35px' }}>
                {Math.round(dotOpacity * 100)}%
              </span>
            </div>

            {/* Zoom / Scale factor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Zoom:</span>
              <input
                type="range"
                min="0.25"
                max="1.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ cursor: 'pointer', width: '100px' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: '35px' }}>
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Background toggle */}
            {isDemoUrl && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <input
                  id="iframe-toggle-checkbox"
                  type="checkbox"
                  checked={showIframe}
                  onChange={(e) => setShowIframe(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Show Live Demo Iframe
              </label>
            )}
          </div>
        </div>

        {/* Analytics stats mini dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Clicks Recorded
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-blue)', fontFamily: 'var(--font-display)' }}>
              {getTotalClicks()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Most Clicked Element
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {getMostClickedElement()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Avg. Resolution
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-purple)', fontFamily: 'var(--font-display)' }}>
              {getAvgResolution()}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Visual heatmap stage */}
      <div 
        ref={containerRef}
        className="heatmap-stage-outer" 
        style={{ 
          position: 'relative', 
          backgroundColor: '#111625', 
          borderRadius: '12px', 
          border: '1px solid var(--border-color)',
          overflow: 'auto',
          height: '650px',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <span style={{ color: 'var(--text-muted)' }}>Loading click records...</span>
          </div>
        ) : !selectedUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Please select a tracked URL from the options to visualize.
          </div>
        ) : clicks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', color: 'var(--text-muted)' }}><TouchAppIcon fontSize="inherit" /></div>
            <span>No click events recorded for this URL.</span>
            <span style={{ fontSize: '0.8rem' }}>Interact with the page to trigger click tracking.</span>
          </div>
        ) : (
          <div 
            className="heatmap-scale-wrapper" 
            style={{ 
              position: 'relative', 
              width: `${dimensions.width * zoom}px`, 
              height: `${dimensions.height * zoom}px`,
              margin: '0 auto',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            >
              {/* Background Layer: Live Iframe pointing to /demo */}
              {isDemoUrl && showIframe ? (
                <iframe
                  id="heatmap-background-iframe"
                  src={selectedUrl}
                  title="Heatmap Demo Page Frame"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    pointerEvents: 'none', // Prevents clicks inside frame from stealing events
                    opacity: 0.55,
                    zIndex: 1
                  }}
                />
              ) : (
                // Fallback dark grid board
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(var(--border-color) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    backgroundColor: '#0a0d16',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1
                  }}
                >
                  <div style={{ color: 'rgba(255,255,255,0.05)', fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold' }}>
                    GRID VISUALIZATION STAGE<br />
                    <span style={{ fontSize: '0.85rem' }}>({dimensions.width}px x {dimensions.height}px)</span>
                  </div>
                </div>
              )}

              {/* Heatmap Overlay Canvas */}
              <canvas
                ref={canvasRef}
                id="heatmap-overlay-canvas"
                width={dimensions.width}
                height={dimensions.height}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 10,
                  pointerEvents: 'none' // Click-through
                }}
              />
            </div>
          </div>
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
