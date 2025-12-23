class ResponseManager {
  constructor() {
    this.responses = [];
    this.users = {};
    this.settings = { favoritesCount: 5, serverUrl: '', accountEmail: '' };
    this.currentResponse = null;
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.render();
    this.loadSettings();
  }

  async loadData() {
    try {
      // Try loading from cloud first
      const cloudLoaded = await this.loadFromCloud();
      
      if (!cloudLoaded && typeof chrome !== 'undefined' && chrome.storage) {
        const data = await chrome.storage.sync.get(['responses', 'users', 'nicknames', 'settings']);
        this.responses = data.responses || [];
        this.users = data.users || {};
        this.settings = { ...this.settings, ...data.settings };
        // Migrate old nicknames format if present
        if (data.nicknames && !data.users) {
          this.users = Object.fromEntries(
            Object.entries(data.nicknames).map(([handle, nickname]) => 
              [handle, { nickname, emojis: [] }]
            )
          );
        }
      } else if (!cloudLoaded) {
        // Fallback for testing without Chrome extension
        this.responses = [
          { id: '1', title: 'Supportive', body: 'This is amazing, {{nickname}}! 🙌', tags: ['uplift'], favorite: true, createdAt: Date.now(), updatedAt: Date.now() },
          { id: '2', title: 'Question', body: 'Great point {{nickname}}! What made you think of this?', tags: ['question'], favorite: false, createdAt: Date.now(), updatedAt: Date.now() }
        ];
        this.users = { 'testuser': { nickname: 'TU', emojis: [] }, 'johndoe': { nickname: 'JD', emojis: [] } };
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async saveData() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.sync.set({
          responses: this.responses,
          users: this.users,
          settings: this.settings
        });
        
        // Sync to cloud if user is logged in
        await this.syncToCloud();
      } else {
        // Fallback for testing - just log
        console.log('Data saved (test mode):', { responses: this.responses, users: this.users });
      }
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  async syncToCloud() {
    try {
      const token = await this.getAuthToken();
      if (!token) return;
      
      await fetch('http://localhost:3000/api/sync/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          handles: Object.entries(this.users).map(([handle, data]) => ({ handle, ...data })),
          templates: this.responses,
          settings: this.settings
        })
      });
    } catch (error) {
      console.log('Cloud sync failed:', error.message);
    }
  }

  async loadFromCloud() {
    try {
      const token = await this.getAuthToken();
      if (!token) return false;
      
      const response = await fetch('http://localhost:3000/api/sync/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.responses = data.templates || [];
        this.users = data.handles.reduce((acc, h) => {
          const { handle, ...userData } = h;
          acc[handle] = userData;
          return acc;
        }, {});
        return true;
      }
    } catch (error) {
      console.log('Cloud load failed:', error.message);
    }
    return false;
  }

  async getAuthToken() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const data = await chrome.storage.local.get(['authToken']);
      return data.authToken;
    }
    return null;
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.onclick = () => this.switchTab(tab.dataset.tab);
    });

    // Response management
    document.getElementById('new-response-btn').onclick = () => this.showResponseModal();
    document.getElementById('response-search').oninput = (e) => this.renderResponses(e.target.value);
    document.getElementById('response-form').onsubmit = (e) => this.saveResponse(e);
    document.getElementById('cancel-response').onclick = () => this.hideResponseModal();

    // Nickname management
    const nicknameBtn = document.getElementById('new-nickname-btn');
    if (nicknameBtn) {
      nicknameBtn.onclick = () => {
        console.log('Add Nickname button clicked');
        this.showNicknameModal();
      };
    } else {
      console.error('new-nickname-btn not found');
    }
    document.getElementById('nickname-search').oninput = (e) => this.renderUsers(e.target.value);

    // Import/Export
    document.getElementById('import-btn').onclick = () => document.getElementById('import-file').click();
    document.getElementById('export-btn').onclick = () => this.exportData();
    document.getElementById('import-file').onchange = (e) => this.importData(e);
    
    // Settings
    document.getElementById('save-settings').onclick = () => this.saveSettings();

    // Modal close on background click
    document.getElementById('response-modal').onclick = (e) => {
      if (e.target.classList.contains('modal')) this.hideResponseModal();
    };
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  render() {
    this.renderResponses();
    this.renderUsers();
    this.loadSettings();
  }

  renderResponses(filter = '') {
    const filtered = this.responses.filter(r => 
      r.title.toLowerCase().includes(filter.toLowerCase()) ||
      r.body.toLowerCase().includes(filter.toLowerCase()) ||
      r.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
    );

    const grid = document.getElementById('response-grid');
    if (!grid) {
      console.error('response-grid element not found');
      return;
    }
    
    console.log('Rendering', filtered.length, 'responses');
    grid.innerHTML = filtered.map(response => `
      <div class="response-card">
        <div class="response-header">
          <div class="response-title">${response.title} ${response.favorite ? '⭐' : ''}</div>
        </div>
        <div class="response-body">${response.body}</div>
        <div class="response-tags">
          ${response.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <div class="response-actions">
          <button class="btn btn-secondary btn-small" data-action="edit" data-id="${response.id}">Edit</button>
          <button class="btn btn-secondary btn-small" data-action="delete" data-id="${response.id}">Delete</button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners to buttons
    grid.querySelectorAll('button[data-action]').forEach(btn => {
      btn.onclick = (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        if (action === 'edit') {
          this.editResponse(id);
        } else if (action === 'delete') {
          this.deleteResponse(id);
        }
      };
    });
  }

  renderUsers(filter = '') {
    const list = document.getElementById('nickname-list');
    if (!list) {
      console.error('nickname-list element not found');
      return;
    }
    
    const entries = Object.entries(this.users).filter(([handle, user]) => 
      handle.toLowerCase().includes(filter.toLowerCase()) ||
      user.nickname.toLowerCase().includes(filter.toLowerCase())
    );
    
    console.log('Rendering', entries.length, 'users from', Object.keys(this.users).length, 'total');
    
    if (entries.length === 0) {
      list.innerHTML = '<div style="color: #536471; text-align: center; padding: 20px;">No nicknames saved yet. Click "Add Nickname" to get started.</div>';
      return;
    }
    
    list.innerHTML = entries.map(([handle, user]) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 8px;">
        <div>
          <strong>@${handle}</strong> → ${user.nickname}
          ${user.emojis.length > 0 ? `<span style="margin-left: 8px;">${user.emojis.join(' ')}</span>` : ''}
        </div>
        <div>
          <button class="btn btn-secondary btn-small" data-action="edit-nickname" data-handle="${handle}" style="margin-right: 8px;">Edit</button>
          <button class="btn btn-secondary btn-small" data-action="delete-nickname" data-handle="${handle}">Delete</button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners to buttons
    list.querySelectorAll('button[data-action]').forEach(btn => {
      const action = btn.dataset.action;
      const handle = btn.dataset.handle;
      if (action === 'edit-nickname') {
        btn.onclick = () => this.editUser(handle);
      } else if (action === 'delete-nickname') {
        btn.onclick = () => this.deleteUser(handle);
      }
    });
  }

  showNicknameModal(user = null) {
    console.log('showNicknameModal called with:', user);
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'nickname-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>${user ? 'Edit Nickname' : 'Add Nickname'}</h2>
        <form id="nickname-form">
          <div class="form-group">
            <label for="nickname-handle">X Handle</label>
            <input type="text" id="nickname-handle" placeholder="@username" ${user ? 'readonly' : 'required'} value="${user ? user.handle : ''}">
          </div>
          <div class="form-group">
            <label for="nickname-name">Nickname</label>
            <input type="text" id="nickname-name" required value="${user ? user.nickname : ''}">
          </div>
          <div class="form-group">
            <label for="nickname-emojis">Emojis (space separated)</label>
            <input type="text" id="nickname-emojis" placeholder="🎨 🚀 💡" value="${user ? user.emojis.join(' ') : ''}">
          </div>
          <div class="actions">
            <button type="button" class="btn btn-secondary" id="cancel-nickname">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    modal.querySelector('#cancel-nickname').onclick = () => modal.remove();
    modal.querySelector('#nickname-form').onsubmit = (e) => this.saveNickname(e, modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    console.log('Modal created and displayed');
  }

  async saveNickname(e, modal) {
    e.preventDefault();
    
    let handle = document.getElementById('nickname-handle').value.trim();
    const nickname = document.getElementById('nickname-name').value.trim();
    const emojisInput = document.getElementById('nickname-emojis').value.trim();
    const emojis = emojisInput ? emojisInput.split(/\s+/).filter(e => e) : [];
    
    if (!handle || !nickname) return;
    
    // Remove @ if present
    handle = handle.replace(/^@/, '');
    
    this.users[handle] = { nickname, emojis };
    await this.saveData();
    modal.remove();
    this.renderUsers();
  }

  showResponseModal(response = null) {
    console.log('showResponseModal called with:', response);
    this.currentResponse = response;
    const modal = document.getElementById('response-modal');
    const title = document.getElementById('response-modal-title');
    
    if (!modal) {
      console.error('response-modal element not found');
      return;
    }
    
    // Always reset form first
    document.getElementById('response-form').reset();
    
    if (response) {
      title.textContent = 'Edit Response';
      document.getElementById('response-title').value = response.title;
      document.getElementById('response-body').value = response.body;
      document.getElementById('response-tags').value = response.tags.join(', ');
      document.getElementById('response-favorite').checked = response.favorite;
    } else {
      title.textContent = 'New Response';
    }
    
    modal.style.display = 'block';
    console.log('Modal displayed');
  }

  hideResponseModal() {
    document.getElementById('response-modal').style.display = 'none';
    this.currentResponse = null;
  }

  async saveResponse(e) {
    e.preventDefault();
    
    const title = document.getElementById('response-title').value;
    const body = document.getElementById('response-body').value;
    const tags = document.getElementById('response-tags').value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    const favorite = document.getElementById('response-favorite').checked;

    if (this.currentResponse) {
      // Edit existing
      const index = this.responses.findIndex(r => r.id === this.currentResponse.id);
      this.responses[index] = {
        ...this.currentResponse,
        title,
        body,
        tags,
        favorite,
        updatedAt: Date.now()
      };
    } else {
      // Create new
      const newResponse = {
        id: Date.now().toString(),
        title,
        body,
        tags,
        favorite,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.responses.push(newResponse);
    }

    await this.saveData();
    this.hideResponseModal();
    this.renderResponses();
  }

  editResponse(id) {
    console.log('editResponse called with id:', id);
    const response = this.responses.find(r => r.id === id);
    console.log('Found response:', response);
    if (response) {
      this.showResponseModal(response);
    } else {
      console.error('Response not found for id:', id);
    }
  }

  async deleteResponse(id) {
    if (confirm('Delete this response?')) {
      this.responses = this.responses.filter(r => r.id !== id);
      await this.saveData();
      this.renderResponses();
    }
  }

  async deleteUser(handle) {
    if (confirm(`Delete nickname for @${handle}?`)) {
      delete this.users[handle];
      await this.saveData();
      this.renderUsers();
    }
  }

  editUser(handle) {
    const user = this.users[handle];
    if (user) {
      this.showNicknameModal({ handle, ...user });
    }
  }

  exportData() {
    const data = {
      responses: this.responses,
      users: this.users,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `x-reply-helper-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.responses) this.responses = data.responses;
      if (data.users) {
        this.users = data.users;
      } else if (data.nicknames) {
        // Migrate old format
        this.users = Object.fromEntries(
          Object.entries(data.nicknames).map(([handle, nickname]) => 
            [handle, { nickname, emojis: [] }]
          )
        );
      }
      
      await this.saveData();
      this.render();
      alert('Data imported successfully!');
    } catch (error) {
      alert('Failed to import data. Please check the file format.');
    }
  }
  
  loadSettings() {
    document.getElementById('favorites-count').value = this.settings.favoritesCount || 5;
    document.getElementById('server-url').value = this.settings.serverUrl || '';
    document.getElementById('account-email').value = this.settings.accountEmail || '';
  }
  
  async saveSettings() {
    this.settings.favoritesCount = parseInt(document.getElementById('favorites-count').value) || 5;
    this.settings.serverUrl = document.getElementById('server-url').value.trim();
    this.settings.accountEmail = document.getElementById('account-email').value.trim();
    
    await this.saveData();
    alert('Settings saved!');
  }
}

const manager = new ResponseManager();