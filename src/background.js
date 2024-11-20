chrome.runtime.onConnect.addListener(function(port) {
  port.onDisconnect.addListener(function() {
  });
});

if (!chrome.identity) {
  console.error('Chrome identity API not available');
}

chrome.runtime.onInstalled.addListener(() => {
  if (!chrome.identity) {
    console.error('Identity API not available after install');
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getAuthToken") {
    if (!chrome.identity) {
      sendResponse({ error: 'Identity API not available' });
      return false;
    }
    
    const options = { 
      interactive: true
    };
    
    new Promise((resolve, reject) => {
      chrome.identity.getAuthToken(options, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(token);
      });
    })
    .then(token => {
      if (!token) {
        throw new Error('No token received from OAuth flow');
      }
      sendResponse({ token: token });
    })
    .catch(error => {
      sendResponse({ error: error.message || 'Authentication failed' });
    });
    
    return true;
  }
});
