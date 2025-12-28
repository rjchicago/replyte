// Content script for X integration
class XReplyHelper {
  constructor() {
    this.responses = [];
    this.users = {};
    this.settings = {};
    this.processedTweets = new Set();
    this.init();
  }

  async init() {
    await this.loadData();
    // Only inject on user interaction, not automatically
    this.setupUserInteraction();
  }

  async loadData() {
    try {
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalidated, using fallback data');
        this.responses = [];
        this.users = {};
        this.settings = { favoritesCount: 5, serverUrl: '', accountEmail: '' };
        return;
      }
      
      const data = await chrome.runtime.sendMessage({ type: 'GET_DATA' });
      this.responses = data?.responses || [];
      this.users = data?.users || {};
      // Migrate old nicknames format if present
      if (data?.nicknames && !data?.users) {
        this.users = Object.fromEntries(
          Object.entries(data.nicknames).map(([handle, nickname]) => 
            [handle, { nickname, emojis: '' }]
          )
        );
      }
      this.settings = { favoritesCount: 5, serverUrl: '', accountEmail: '', ...data?.settings };
    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) {
        console.warn('Extension reloaded, please refresh the page');
        // Show user notification
        this.showReloadNotification();
      } else {
        console.error('Failed to load extension data:', error);
      }
      // Fallback to empty data
      this.responses = [];
      this.users = {};
      this.settings = { favoritesCount: 5, serverUrl: '', accountEmail: '' };
    }
  }

  injectUI() {
    const composer = this.findComposer();
    if (!composer || document.getElementById('x-reply-helper-trigger')) return;

    // Create a small trigger button in top-right of composer
    const trigger = document.createElement('button');
    trigger.id = 'x-reply-helper-trigger';
    trigger.className = 'x-reply-trigger-btn';
    trigger.innerHTML = '💬';
    trigger.title = 'Quick Responses';
    
    // Position trigger button
    const composerRect = composer.getBoundingClientRect();
    trigger.style.position = 'fixed';
    trigger.style.top = `${composerRect.top + 5}px`;
    trigger.style.right = `${window.innerWidth - composerRect.right + 5}px`;
    trigger.style.zIndex = '9999';
    
    document.body.appendChild(trigger);
    
    trigger.onclick = (e) => {
      e.stopPropagation();
      this.showInlineModal(trigger);
    };
  }

  findComposer() {
    const selectors = [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="dmComposerTextInput"]',
      '.public-DraftEditor-content',
      '[contenteditable="true"][data-testid*="tweet"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  setupEventListeners() {
    this.setupNicknameButton();
    
    // Handle favorite response buttons
    document.querySelectorAll('.x-reply-btn[data-id]').forEach(btn => {
      btn.onclick = (e) => {
        try {
          e.stopPropagation();
          this.insertResponse(btn.dataset.id);
        } catch (err) {
          console.error('Extension error:', err);
        }
      };
    });
    
    // Handle "..." button
    const moreBtn = document.getElementById('show-all-responses');
    if (moreBtn) {
      moreBtn.onclick = (e) => {
        try {
          e.stopPropagation();
          this.showResponseModal();
        } catch (err) {
          console.error('Extension error:', err);
        }
      };
    }

    const searchInput = document.getElementById('response-search');
    if (searchInput) {
      searchInput.oninput = (e) => {
        try {
          this.filterResponses(e.target.value);
        } catch (err) {
          console.error('Extension error:', err);
        }
      };
    }
  }

  setupNicknameButton() {
    const nicknameBtn = document.getElementById('edit-nickname');
    if (nicknameBtn) {
      nicknameBtn.onclick = (e) => {
        try {
          e.stopPropagation();
          this.showNicknameModal(nicknameBtn.dataset.handle);
        } catch (err) {
          console.error('Extension error:', err);
        }
      };
    }
  }

  showNicknameModal(handle) {
    const context = this.getCurrentTweetContext();
    const defaultNickname = context.displayName ? context.displayName.split(' ')[0] : '';
    const user = this.users[handle] || { nickname: defaultNickname, emojis: '' };
    const currentNickname = user.nickname;
    
    const modal = document.createElement('div');
    modal.className = 'x-nickname-modal';
    modal.innerHTML = `
      <div class="x-nickname-modal-content">
        <div class="x-nickname-modal-header">
          <h3>Nickname for ${handle}</h3>
          <button class="x-modal-close" id="close-nickname-modal">×</button>
        </div>
        <div class="x-nickname-form">
          <input type="text" id="nickname-input" value="${currentNickname}" placeholder="Enter nickname" maxlength="20">
          <input type="text" id="emojis-input" value="${user.emojis || ''}" placeholder="Emojis" style="margin-top: 8px;">
          <div class="x-nickname-buttons">
            <button id="save-nickname" class="x-reply-btn">Save</button>
            <button id="cancel-nickname" class="x-reply-btn">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = modal.querySelector('#nickname-input');
    input.focus();
    input.select();
    
    // Event listeners
    modal.querySelector('#close-nickname-modal').onclick = () => modal.remove();
    modal.querySelector('#cancel-nickname').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.querySelector('#save-nickname').onclick = async () => {
      const nickname = input.value.trim();
      const emojis = modal.querySelector('#emojis-input').value.trim();
      await this.saveNickname(handle, nickname, emojis);
      modal.remove();
      // Update button text
      const btn = document.getElementById('edit-nickname');
      if (btn) btn.textContent = nickname || handle;
    };
    
    input.onkeypress = (e) => {
      if (e.key === 'Enter') {
        modal.querySelector('#save-nickname').click();
      }
    };
  }

  async saveNickname(handle, nickname, emojis = '') {
    if (nickname) {
      this.users[handle] = { nickname, emojis };
    } else {
      delete this.users[handle];
    }
    
    try {
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalidated, nickname saved locally only');
        return;
      }
      
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'SAVE_USERS',
          users: this.users,
          changedHandle: handle
        }, (response) => {
          if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message?.includes('Extension context invalidated')) {
              console.warn('Extension reloaded, nickname saved locally only');
              resolve({ success: true });
            } else {
              reject(chrome.runtime.lastError);
            }
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error('Failed to save nickname:', error);
      // Don't throw - just log and continue
    }
  }

  renderResponses(filter = '') {
    const list = document.getElementById('responses-list');
    if (!list) return;

    const filtered = this.responses.filter(r => 
      r.title.toLowerCase().includes(filter.toLowerCase()) ||
      r.body.toLowerCase().includes(filter.toLowerCase()) ||
      r.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
    );

    list.innerHTML = filtered.map(response => `
      <div class="response-item ${response.favorite ? 'favorite' : ''}" data-id="${response.id}">
        <div class="response-title">${response.title}</div>
        <div class="response-preview">${response.body.substring(0, 50)}...</div>
        <div class="response-tags">${response.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
      </div>
    `).join('');

    list.querySelectorAll('.response-item').forEach(item => {
      item.onclick = (e) => {
        try {
          e.stopPropagation();
          this.insertResponse(item.dataset.id);
        } catch (err) {
          console.error('Extension error:', err);
        }
      };
    });
  }

  showResponseModal() {
    const modal = document.createElement('div');
    modal.className = 'x-response-modal';
    modal.innerHTML = `
      <div class="x-response-modal-content">
        <div class="x-response-modal-header">
          <h3>Select Response</h3>
          <button class="x-modal-close" id="close-response-modal">×</button>
        </div>
        <input type="text" placeholder="Search responses..." id="modal-response-search" class="x-modal-search">
        <div class="x-modal-responses-list" id="modal-responses-list"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Render responses in modal
    this.renderModalResponses();
    
    // Setup modal event listeners
    modal.querySelector('#close-response-modal').onclick = () => modal.remove();
    modal.querySelector('#modal-response-search').oninput = (e) => this.renderModalResponses(e.target.value);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    // Focus search input
    modal.querySelector('#modal-response-search').focus();
  }

  renderModalResponses(filter = '') {
    const list = document.getElementById('modal-responses-list');
    if (!list) return;

    const filtered = this.responses.filter(r => 
      r.title.toLowerCase().includes(filter.toLowerCase()) ||
      r.body.toLowerCase().includes(filter.toLowerCase()) ||
      r.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
    );

    list.innerHTML = filtered.map(response => `
      <div class="x-modal-response-item" data-id="${response.id}">
        <div class="x-modal-response-title">${response.title} ${response.favorite ? '⭐' : ''}</div>
        <div class="x-modal-response-preview">${response.body}</div>
        <div class="x-modal-response-tags">${response.tags.map(tag => `<span class="x-modal-tag">${tag}</span>`).join('')}</div>
      </div>
    `).join('');

    list.querySelectorAll('.x-modal-response-item').forEach(item => {
      item.onclick = () => {
        this.insertResponse(item.dataset.id);
        document.querySelector('.x-response-modal').remove();
      };
    });
  }

  async insertResponse(responseId) {
    const response = this.responses.find(r => String(r.id) === String(responseId));
    if (!response) return;

    const composer = this.findComposer();
    if (!composer) return;

    const context = this.getCurrentTweetContext();
    const processedText = this.processTemplate(response.body, context);
    this.insertText(composer, processedText);
    
    // Log usage
    this.logUsage(responseId, context.handle);
    
    // Hide dropdown
    const dropdown = document.getElementById('responses-dropdown');
    if (dropdown) dropdown.style.display = 'none';
  }

  async logUsage(templateId, xUserHandle) {
    try {
      if (!chrome.runtime?.id) return;
      
      chrome.runtime.sendMessage({
        type: 'LOG_USAGE',
        templateId,
        xUserHandle
      });
    } catch (error) {
      console.log('Usage logging failed:', error);
    }
  }

  getCurrentTweetContext() {
    // Look for the tweet being replied to
    const tweetElement = document.querySelector('[data-testid="tweet"]');
    if (!tweetElement) return {};

    // Try multiple selectors for handle
    let handleElement = tweetElement.querySelector('[data-testid="User-Name"] a[href*="/"]');
    if (!handleElement) {
      handleElement = tweetElement.querySelector('a[href*="/"]:not([href*="/status/"])');
    }
    
    let handle = '';
    if (handleElement) {
      const href = handleElement.getAttribute('href');
      handle = href ? href.replace('/', '').split('/')[0] : '';
    }
    
    // Get display name
    const displayNameElement = tweetElement.querySelector('[data-testid="User-Name"] span');
    const displayName = displayNameElement ? displayNameElement.textContent : '';
    
    // Get nickname
    const nickname = handle ? this.users[handle]?.nickname : '';
    
    return { handle, displayName, nickname };
  }

  insertText(element, text) {
    try {
      element.focus();
      
      // Use selection API to replace content safely
      if (element.contentEditable === 'true') {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
        
        if (document.execCommand && document.execCommand('insertText', false, text)) {
          return;
        }
        
        element.textContent = text;
      } else {
        element.select();
        if (document.execCommand && document.execCommand('insertText', false, text)) {
          return;
        }
        element.value = text;
      }
      
      element.focus();
    } catch (e) {
      // Minimal fallback without events
      if (element.contentEditable === 'true') {
        element.textContent = text;
      } else {
        element.value = text;
      }
    }
  }

  processTemplate(text, context) {
    const user = context.handle ? this.users[context.handle] : null;
    const emojis = user?.emojis || '';
    
    return text
      .replace(/{{nickname}}/g, context.nickname || context.handle || 'User')
      .replace(/{{handle}}/g, context.handle || 'User')
      .replace(/{{displayName}}/g, context.displayName || 'User')
      .replace(/{{emojis}}/g, emojis)
      .replace(/\(\(([^)]+)\)\)/g, (match, options) => {
        const choices = options.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
      });
  }

  filterResponses(query) {
    this.renderResponses(query);
  }

  showReloadNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #1d9bf0; color: white; padding: 12px 16px;
      border-radius: 8px; font-size: 14px; max-width: 300px;
    `;
    notification.textContent = 'Replyte extension updated. Please refresh the page.';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }

  setupUserInteraction() {
    // Only inject UI when user clicks in composer area
    document.addEventListener('click', (e) => {
      const composer = this.findComposer();
      if (composer && (e.target === composer || composer.contains(e.target))) {
        if (!document.getElementById('x-reply-helper-trigger')) {
          this.injectUI();
        }
      } else {
        // Remove trigger if clicking outside composer area
        const existingTrigger = document.getElementById('x-reply-helper-trigger');
        if (existingTrigger) {
          existingTrigger.remove();
        }
        const existingModal = document.getElementById('x-inline-modal');
        if (existingModal) {
          existingModal.remove();
        }
      }
    });
    
    // Clean up when page changes
    const observer = new MutationObserver(() => {
      const existingTrigger = document.getElementById('x-reply-helper-trigger');
      const composer = this.findComposer();
      if (existingTrigger && !composer) {
        existingTrigger.remove();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  showInlineModal(triggerBtn) {
    const existingModal = document.getElementById('x-inline-modal');
    if (existingModal) {
      existingModal.remove();
      return;
    }
    
    const context = this.getCurrentTweetContext();
    const favoritesCount = this.settings.favoritesCount || 5;
    const favorites = this.responses.filter(r => r.favorite).slice(0, favoritesCount);
    
    const modal = document.createElement('div');
    modal.id = 'x-inline-modal';
    modal.className = 'x-inline-modal';
    
    const favoriteButtons = favorites.map(response => 
      `<button class="x-inline-response-btn" data-id="${response.id}">${response.title}</button>`
    ).join('');
    
    const moreButton = this.responses.length > favoritesCount ? 
      '<button class="x-inline-response-btn x-more-btn" id="show-all-inline">More...</button>' : '';
    
    const nicknameButton = context.handle ? 
      `<button class="x-inline-response-btn x-nickname-btn" data-handle="${context.handle}">
        <span>${context.nickname || context.handle}</span>
        ${context.handle && this.users[context.handle]?.emojis ? `<span class="x-nickname-emojis">${this.users[context.handle].emojis}</span>` : ''}
      </button>` : '';
    
    modal.innerHTML = `
      <div class="x-inline-responses">
        ${nicknameButton ? `<div class="x-inline-nickname">${nicknameButton}</div>` : ''}
        ${favoriteButtons}
        ${moreButton}
      </div>
    `;
    
    const triggerRect = triggerBtn.getBoundingClientRect();
    modal.style.position = 'fixed';
    modal.style.zIndex = '10000';
    
    document.body.appendChild(modal);
    
    // Smart positioning - check if modal fits below, otherwise place above
    const modalRect = modal.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    
    if (spaceBelow >= modalRect.height + 10) {
      // Place below
      modal.style.top = `${triggerRect.bottom + 5}px`;
    } else if (spaceAbove >= modalRect.height + 10) {
      // Place above
      modal.style.top = `${triggerRect.top - modalRect.height - 5}px`;
    } else {
      // Center vertically if neither fits well
      modal.style.top = `${Math.max(10, (viewportHeight - modalRect.height) / 2)}px`;
    }
    
    // Horizontal positioning - prefer right-aligned but adjust if needed
    const spaceRight = window.innerWidth - triggerRect.right;
    if (spaceRight >= modalRect.width) {
      modal.style.right = `${window.innerWidth - triggerRect.right}px`;
    } else {
      modal.style.left = `${Math.max(10, triggerRect.left - modalRect.width + triggerRect.width)}px`;
    }
    
    modal.querySelectorAll('.x-inline-response-btn[data-id]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this.insertResponse(btn.dataset.id);
        modal.remove();
      };
    });
    
    const moreBtn = modal.querySelector('#show-all-inline');
    if (moreBtn) {
      moreBtn.onclick = (e) => {
        e.stopPropagation();
        modal.remove();
        this.showResponseModal();
      };
    }
    
    const nicknameBtn = modal.querySelector('.x-nickname-btn');
    if (nicknameBtn) {
      nicknameBtn.onclick = (e) => {
        e.stopPropagation();
        modal.remove();
        this.showNicknameModal(nicknameBtn.dataset.handle);
      };
    }
    
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!modal.contains(e.target) && e.target !== triggerBtn) {
          modal.remove();
        }
      }, { once: true });
    }, 0);
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new XReplyHelper());
} else {
  new XReplyHelper();
}