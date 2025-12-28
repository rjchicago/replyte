// Background service worker
let syncInterval = null;

chrome.runtime.onInstalled.addListener(async () => {
  // Initialize default data
  const { responses, users, nicknames, settings, syncQueue } = await chrome.storage.local.get(['responses', 'users', 'nicknames', 'settings', 'syncQueue']);
  
  if (!responses) {
    const defaultResponses = [
      {
        id: '1',
        title: 'Supportive',
        body: 'This is amazing, {{nickname}}! 🙌',
        tags: ['uplift'],
        favorite: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: '2', 
        title: 'Question',
        body: 'Great point {{nickname}}! What made you think of this approach?',
        tags: ['question'],
        favorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
    
    await chrome.storage.local.set({ responses: defaultResponses });
  }
  
  if (!users) {
    // Migrate old nicknames format if present
    if (nicknames && Object.keys(nicknames).length > 0) {
      const migratedUsers = Object.fromEntries(
        Object.entries(nicknames).map(([handle, nickname]) => 
          [handle, { nickname, emojis: '' }]
        )
      );
      await chrome.storage.local.set({ users: migratedUsers });
    } else {
      await chrome.storage.local.set({ 
        users: { 'rjchicago': { nickname: 'RJ', emojis: '' } }
      });
    }
  }
  
  if (!settings) {
    await chrome.storage.local.set({ 
      settings: {
        favoritesCount: 5,
        serverUrl: '',
        accountEmail: ''
      }
    });
  }
  
  if (!syncQueue) {
    await chrome.storage.local.set({ syncQueue: [] });
  }
  
  // Start sync timer if credentials exist
  const data = await chrome.storage.local.get(['settings']);
  if (data.settings?.serverUrl && data.settings?.apiKey) {
    startSyncTimer();
  }
});

function startSyncTimer() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(processSyncQueue, 30000); // Every 30 seconds
}

function stopSyncTimer() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

async function processSyncQueue() {
  const { syncQueue, settings, syncLog = [] } = await chrome.storage.local.get(['syncQueue', 'settings', 'syncLog']);
  
  if (!syncQueue?.length || !settings?.serverUrl || !settings?.apiKey) {
    return;
  }
  
  console.log(`Processing sync queue: ${syncQueue.length} items, ${syncQueue.filter(item => Date.now() >= item.nextRetry).length} ready`);
  
  const now = Date.now();
  const readyItems = syncQueue.filter(item => now >= item.nextRetry);
  
  if (!readyItems.length) return;
  
  for (const item of readyItems) {
    console.log(`Syncing item ${item.id}:`, item.data);
    try {
      await syncItem(item, settings);
      // Remove successful item
      const updatedQueue = syncQueue.filter(q => q.id !== item.id);
      
      // Add success log
      const successMessage = `Synced ${item.data.handles?.length || 0} handles successfully`;
      console.log(`✅ ${successMessage}`);
      syncLog.push({
        id: `${item.id}-success`,
        timestamp: Date.now(),
        type: 'success',
        message: successMessage
      });
      
      await chrome.storage.local.set({ syncQueue: updatedQueue, syncLog });
    } catch (error) {
      console.error(`❌ Sync failed for item ${item.id}:`, error);
      // Update retry info
      item.retryCount = (item.retryCount || 0) + 1;
      item.nextRetry = now + Math.min(300000, 5000 * Math.pow(2, item.retryCount)); // Max 5 min
      item.lastError = error.message;
      
      // Add error log
      const errorMessage = `Sync failed (attempt ${item.retryCount}): ${error.message}`;
      syncLog.push({
        id: `${item.id}-error-${item.retryCount}`,
        timestamp: Date.now(),
        type: 'error',
        message: errorMessage
      });
      
      if (item.retryCount >= 5) {
        // Remove after 5 failures
        const updatedQueue = syncQueue.filter(q => q.id !== item.id);
        const failedMessage = `Sync permanently failed after 5 attempts`;
        console.error(`❌ ${failedMessage}`);
        syncLog.push({
          id: `${item.id}-failed`,
          timestamp: Date.now(),
          type: 'failed',
          message: failedMessage
        });
        await chrome.storage.local.set({ syncQueue: updatedQueue, syncLog });
      } else {
        console.log(`⏳ Will retry in ${Math.round((item.nextRetry - now) / 1000)}s`);
        await chrome.storage.local.set({ syncQueue, syncLog });
      }
    }
  }
  
  // Keep only last 100 log entries
  if (syncLog.length > 100) {
    syncLog.splice(0, syncLog.length - 100);
    await chrome.storage.local.set({ syncLog });
  }
}

async function syncItem(item, settings) {
  console.log(`Attempting sync to: ${settings.serverUrl}/sync/data`);
  const response = await fetch(`${settings.serverUrl}/sync/data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': settings.apiKey
    },
    body: JSON.stringify(item.data)
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`${response.status}: ${errorText}`);
  }
}

async function addToSyncQueue(data) {
  const { syncQueue = [], syncLog = [] } = await chrome.storage.local.get(['syncQueue', 'syncLog']);
  
  const item = {
    id: Date.now().toString(),
    data,
    createdAt: Date.now(),
    nextRetry: Date.now(),
    retryCount: 0
  };
  
  syncQueue.push(item);
  
  // Add to sync log
  const message = `Queued ${data.handles?.length || 0} handles for sync`;
  console.log(`⏳ ${message}`);
  const logEntry = {
    id: item.id,
    timestamp: Date.now(),
    type: 'queued',
    message
  };
  syncLog.push(logEntry);
  
  // Keep only last 100 log entries
  if (syncLog.length > 100) {
    syncLog.splice(0, syncLog.length - 100);
  }
  
  await chrome.storage.local.set({ syncQueue, syncLog });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_DATA') {
    chrome.storage.local.get(['responses', 'users', 'nicknames', 'settings'])
      .then(data => {
        // Migrate old nicknames format if needed
        if (data.nicknames && !data.users) {
          data.users = Object.fromEntries(
            Object.entries(data.nicknames).map(([handle, nickname]) => 
              [handle, { nickname, emojis: '' }]
            )
          );
        }
        sendResponse(data);
      });
    return true;
  }
  
  if (request.type === 'SAVE_DATA') {
    chrome.storage.local.set(request.data)
      .then(() => sendResponse({ success: true }));
    return true;
  }
  
  if (request.type === 'SAVE_USERS') {
    console.log('SAVE_USERS received:', { changedHandle: request.changedHandle, hasUsers: !!request.users });
    chrome.storage.local.set({ users: request.users })
      .then(async () => {
        // Only queue if there's a specific changed handle
        if (request.changedHandle && request.users[request.changedHandle]) {
          const { settings } = await chrome.storage.local.get(['settings']);
          console.log('Settings check:', { hasUrl: !!settings?.serverUrl, hasKey: !!settings?.apiKey });
          if (settings?.serverUrl && settings?.apiKey) {
            const userData = request.users[request.changedHandle];
            console.log('Adding to sync queue:', { handle: request.changedHandle, userData });
            await addToSyncQueue({ 
              handles: [{ handle: request.changedHandle, ...userData }], 
              templates: [] 
            });
          }
        } else {
          console.log('Not queuing - no changedHandle or user data');
        }
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('SAVE_USERS error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (request.type === 'SAVE_SETTINGS') {
    chrome.storage.local.set({ settings: request.settings })
      .then(() => {
        // Start/stop sync timer based on credentials
        if (request.settings?.serverUrl && request.settings?.apiKey) {
          startSyncTimer();
        } else {
          stopSyncTimer();
        }
        sendResponse({ success: true });
      });
    return true;
  }
  
  if (request.type === 'GET_SYNC_STATUS') {
    chrome.storage.local.get(['syncQueue', 'syncLog'])
      .then(data => {
        const queue = data.syncQueue || [];
        const log = data.syncLog || [];
        const pending = queue.length;
        const failed = queue.filter(item => item.retryCount >= 5).length;
        sendResponse({ pending, failed, hasErrors: failed > 0, log });
      });
    return true;
  }
  
  if (request.type === 'CLEAR_SYNC_LOG') {
    chrome.storage.local.set({ syncLog: [] })
      .then(() => sendResponse({ success: true }));
    return true;
  }
  
  if (request.type === 'LOG_USAGE') {
    chrome.storage.local.get(['settings'])
      .then(async (data) => {
        const settings = data.settings;
        if (settings?.serverUrl && settings?.apiKey) {
          try {
            await fetch(`${settings.serverUrl}/sync/usage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': settings.apiKey
              },
              body: JSON.stringify({
                templateId: request.templateId,
                xUserHandle: request.xUserHandle
              })
            });
          } catch (error) {
            console.log('Usage logging failed:', error);
          }
        }
      });
    return true;
  }
  
  // Legacy support
  if (request.type === 'SAVE_NICKNAMES') {
    const users = Object.fromEntries(
      Object.entries(request.nicknames).map(([handle, nickname]) => 
        [handle, { nickname, emojis: '' }]
      )
    );
    
    chrome.storage.local.get(['users'])
      .then(async (data) => {
        const oldUsers = data.users || {};
        
        // Find changed/new handles
        const changedHandles = [];
        for (const [handle, userData] of Object.entries(users)) {
          const oldData = oldUsers[handle];
          if (!oldData || oldData.nickname !== userData.nickname) {
            changedHandles.push({ handle, ...userData });
          }
        }
        
        await chrome.storage.local.set({ users });
        
        // Only queue changed handles
        if (changedHandles.length > 0) {
          const { settings } = await chrome.storage.local.get(['settings']);
          if (settings?.serverUrl && settings?.apiKey) {
            await addToSyncQueue({ handles: changedHandles, templates: [] });
          }
        }
        
        sendResponse({ success: true });
      });
    return true;
  }
});