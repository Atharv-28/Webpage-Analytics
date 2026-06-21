(function() {
  // Determine API endpoint host dynamically from script source
  const scriptEl = document.currentScript;
  const apiHost = scriptEl ? new URL(scriptEl.src).origin : window.location.origin;
  const API_ENDPOINT = `${apiHost}/api/events`;

  // 1. Session Management
  function generateSessionId() {
    return 'cf-sess-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
  }

  function getSessionId() {
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
    const now = Date.now();
    let sessionId = localStorage.getItem('cf_session_id');
    let lastActive = localStorage.getItem('cf_session_last_active');

    if (!sessionId || !lastActive || (now - parseInt(lastActive, 10) > sessionTimeout)) {
      // Create new session
      sessionId = generateSessionId();
      localStorage.setItem('cf_session_id', sessionId);
    }
    
    // Update active timestamp
    localStorage.setItem('cf_session_last_active', now.toString());
    return sessionId;
  }

  // Helper to refresh activity timer
  function refreshSessionActivity() {
    localStorage.setItem('cf_session_last_active', Date.now().toString());
  }

  // 2. Event Tracking Core
  function sendTrackingEvent(eventType, metadata = {}) {
    const sessionId = getSessionId();
    const payload = {
      sessionId,
      eventType,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      metadata
    };

    // Use fetch with keepalive: true so events are sent reliably even when navigating away
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(err => {
      // Gracefully swallow errors to not disturb main page execution
      console.warn('[CF Tracker] Ingestion failed:', err.message);
    });
  }

  // 3. Page View Tracking
  function trackPageView() {
    const referrer = document.referrer || '';
    const title = document.title || '';
    sendTrackingEvent('page_view', {
      title,
      referrer,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    });
  }

  // 4. Click Tracking
  function handleDocumentClick(event) {
    refreshSessionActivity();
    
    const target = event.target;
    if (!target) return;

    // Get element details
    const elementTag = target.tagName ? target.tagName.toLowerCase() : '';
    const elementId = target.id || '';
    const elementClass = target.className || '';
    const elementText = (target.innerText || target.value || '').trim().substring(0, 50);

    // Coordinate details
    // pageX/Y represents coordinate relative to the entire document (includes scrolling)
    // clientX/Y represents coordinate relative to the browser window viewport
    const pageX = event.pageX;
    const pageY = event.pageY;
    const clientX = event.clientX;
    const clientY = event.clientY;

    // Screen dimensions when click occurred (critical to draw responsive heatmaps)
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const docWidth = document.documentElement.scrollWidth;
    const docHeight = document.documentElement.scrollHeight;

    // Relational ratios (useful if visualizing clicks on screens of different widths)
    const xRatio = pageX / (docWidth || 1);
    const yRatio = pageY / (docHeight || 1);

    const clickMetadata = {
      elementTag,
      elementId,
      elementClass,
      elementText,
      x: pageX,
      y: pageY,
      clientX,
      clientY,
      screenWidth,
      screenHeight,
      docWidth,
      docHeight,
      xRatio,
      yRatio
    };

    sendTrackingEvent('click', clickMetadata);
  }

  // 5. Initialize listeners on page load
  function initTracker() {
    // 1. Send page view immediately on load
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      trackPageView();
    } else {
      window.addEventListener('DOMContentLoaded', trackPageView);
    }

    // 2. Send clicks
    document.addEventListener('click', handleDocumentClick, true);

    // 3. Keep tracking session alive on mouse moves (debounced or just general interaction)
    const interactionEvents = ['mousemove', 'keypress', 'scroll', 'touchstart'];
    let throttleTimeout = null;
    function throttleActivity() {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        refreshSessionActivity();
        throttleTimeout = null;
      }, 5000); // Only refresh storage at most every 5 seconds
    }
    interactionEvents.forEach(evtName => {
      document.addEventListener(evtName, throttleActivity, { passive: true });
    });

    console.log('[CF Tracker] Initialized successfully. Tracking session:', getSessionId());
  }

  // Start the tracking script automatically
  initTracker();

})();
