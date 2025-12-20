class PopupManager {
  constructor() {
    this.responses = [];
    this.nicknames = {};
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.render();
  }

  async loadData() {
    const data = await chrome.runtime.sendMessage({ type: 'GET_DATA' });
    this.responses = data.responses || [];
    this.nicknames = data.nicknames || {};
  }

  setupEventListeners() {
    document.getElementById('search').oninput = (e) => {
      this.render(e.target.value);
    };

    document.getElementById('manage-btn').onclick = () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
    };
  }

  render(filter = '') {
    const filtered = this.responses.filter(r => 
      r.title.toLowerCase().includes(filter.toLowerCase()) ||
      r.body.toLowerCase().includes(filter.toLowerCase())
    );

    const favorites = filtered.filter(r => r.favorite);
    const all = filtered;

    this.renderList('favorites-list', favorites);
    this.renderList('response-list', all);
  }

  renderList(containerId, responses) {
    const container = document.getElementById(containerId);
    
    if (responses.length === 0) {
      container.innerHTML = '<div style="color: #536471; font-size: 12px; text-align: center; padding: 8px;">No responses found</div>';
      return;
    }

    container.innerHTML = responses.map(response => `
      <div class="response-item" data-id="${response.id}">
        <div class="response-title">${response.title}</div>
        <div class="response-preview">${response.body.substring(0, 60)}...</div>
      </div>
    `).join('');

    container.querySelectorAll('.response-item').forEach(item => {
      item.onclick = () => this.insertResponse(item.dataset.id);
    });
  }

  async insertResponse(responseId) {
    const response = this.responses.find(r => r.id === responseId);
    if (!response) return;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('x.com') && !tab.url.includes('twitter.com')) {
        this.showStatus('Please navigate to X.com first', 'error');
        return;
      }

      await chrome.tabs.sendMessage(tab.id, {
        type: 'INSERT_RESPONSE',
        responseId: responseId
      });

      this.showStatus('Response inserted!', 'success');
      setTimeout(() => window.close(), 1000);
    } catch (error) {
      this.showStatus('Error inserting response', 'error');
    }
  }

  showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.style.color = type === 'error' ? '#f91880' : type === 'success' ? '#00ba7c' : '#536471';
  }
}

new PopupManager();