// Background service worker
chrome.runtime.onInstalled.addListener(async () => {
  // Initialize default data
  const { responses, users, nicknames } = await chrome.storage.sync.get(['responses', 'users', 'nicknames']);
  
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
    
    await chrome.storage.sync.set({ responses: defaultResponses });
  }
  
  if (!users) {
    // Migrate old nicknames format if present
    if (nicknames && Object.keys(nicknames).length > 0) {
      const migratedUsers = Object.fromEntries(
        Object.entries(nicknames).map(([handle, nickname]) => 
          [handle, { nickname, emojis: [] }]
        )
      );
      await chrome.storage.sync.set({ users: migratedUsers });
    } else {
      await chrome.storage.sync.set({ 
        users: { 'rjchicago': { nickname: 'RJ', emojis: [] } },
        settings: {
          fallbackBehavior: 'displayName',
          defaultHashtag: ''
        }
      });
    }
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_DATA') {
    chrome.storage.sync.get(['responses', 'users', 'nicknames', 'settings'])
      .then(data => {
        // Migrate old nicknames format if needed
        if (data.nicknames && !data.users) {
          data.users = Object.fromEntries(
            Object.entries(data.nicknames).map(([handle, nickname]) => 
              [handle, { nickname, emojis: [] }]
            )
          );
        }
        sendResponse(data);
      });
    return true;
  }
  
  if (request.type === 'SAVE_DATA') {
    chrome.storage.sync.set(request.data)
      .then(() => sendResponse({ success: true }));
    return true;
  }
  
  if (request.type === 'SAVE_USERS') {
    chrome.storage.sync.set({ users: request.users })
      .then(() => sendResponse({ success: true }));
    return true;
  }
  
  // Legacy support
  if (request.type === 'SAVE_NICKNAMES') {
    const users = Object.fromEntries(
      Object.entries(request.nicknames).map(([handle, nickname]) => 
        [handle, { nickname, emojis: [] }]
      )
    );
    chrome.storage.sync.set({ users })
      .then(() => sendResponse({ success: true }));
    return true;
  }
});