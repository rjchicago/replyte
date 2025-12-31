import React, { useState, useEffect } from 'react';
import './App.css';

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, credentials: "include" });

  if (res.status === 401) {
    const here = window.location.href;
    const tinyauthUrl = window.location.origin.replace(/^https?:\/\/[^.]+/, 'https://tinyauth');
    window.location.assign(`${tinyauthUrl}/login?redirect_uri=${encodeURIComponent(here)}`);
    return; // stop normal handling
  }

  return res;
}

const PencilIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const RefreshIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState(null);
  const [activeTab, setActiveTab] = useState('handles');
  const [apiKey, setApiKey] = useState(null);
  const [handles, setHandles] = useState([]);
  const [filteredHandles, setFilteredHandles] = useState([]);
  const [handleSearch, setHandleSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showAddHandle, setShowAddHandle] = useState(false);
  const [editingHandle, setEditingHandle] = useState(null);
  const [newHandle, setNewHandle] = useState({ handle: '', nickname: '', emojis: '' });
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ title: '', body: '', favorite: false });
  const [templatePreviews, setTemplatePreviews] = useState({});
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [spacing, setSpacing] = useState(() => {
    return localStorage.getItem('replyte-spacing') || 'normal';
  });
  const [usageData, setUsageData] = useState([]);
  const [filteredUsageData, setFilteredUsageData] = useState([]);
  const [usageRange, setUsageRange] = useState('7');
  const [usageGroupBy, setUsageGroupBy] = useState('both');
  const [usageFilter, setUsageFilter] = useState('');
  const [loadingUsage, setLoadingUsage] = useState(false);

  const renderTemplate = (template) => {
    const exampleUser = {
      nickname: 'John Doe',
      handle: 'johndoe', 
      displayName: 'John Doe',
      emojis: '👍✨'
    };
    
    let rendered = template.body || template.content || '';
    
    // Replace placeholders
    rendered = rendered.replace(/{{nickname}}/g, exampleUser.nickname);
    rendered = rendered.replace(/{{handle}}/g, exampleUser.handle);
    rendered = rendered.replace(/{{displayName}}/g, exampleUser.displayName);
    rendered = rendered.replace(/{{emojis}}/g, exampleUser.emojis);
    
    // Handle random selections ((option1|option2|option3))
    rendered = rendered.replace(/\(\(([^)]+)\)\)/g, (match, options) => {
      const choices = options.split('|');
      return choices[Math.floor(Math.random() * choices.length)];
    });
    
    return rendered;
  };
  
  const refreshPreview = (templateId) => {
    let template;
    if (String(templateId).startsWith('edit-')) {
      template = editingTemplate;
    } else {
      template = templates.find(t => t.id === templateId);
    }
    
    if (template) {
      setTemplatePreviews(prev => ({
        ...prev,
        [templateId]: renderTemplate(template)
      }));
    }
  };

  useEffect(() => {
    filterUsageData(usageFilter);
  }, [usageData]);

  useEffect(() => {
    if (activeTab === 'usage') {
      loadUsageReport();
    }
  }, [activeTab, usageRange, usageGroupBy]);

  useEffect(() => {
    localStorage.setItem('replyte-spacing', spacing);
  }, [spacing]);

  useEffect(() => {
    const previews = {};
    templates.forEach(template => {
      previews[template.id] = renderTemplate(template);
    });
    setTemplatePreviews(previews);
  }, [templates]);

  useEffect(() => {
    loadUser();
    loadHandles();
    loadTemplates();
    checkHeaders();
  }, []);

  const loadUser = async () => {
    try {
      const res = await apiFetch('/api/user/info');
      if (res?.ok) {
        const userData = await res.json();
        setUser(userData);
        setUserName(userData?.name || userData?.email);
        setApiKey(userData?.apiKey);
      } else if (res) {
        console.error('API error:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadUsageReport = async () => {
    setLoadingUsage(true);
    try {
      const res = await fetch(`/api/usage/report?days=${usageRange}&groupBy=${usageGroupBy}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setUsageData(data);
        setFilteredUsageData(data);
      }
    } catch (error) {
      console.error('Failed to load usage report:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

  const filterUsageData = (filter) => {
    setUsageFilter(filter);
    if (!filter) {
      setFilteredUsageData(usageData);
    } else {
      const filtered = usageData.filter(item => {
        const searchText = filter.toLowerCase();
        return (
          (item.name && item.name.toLowerCase().includes(searchText)) ||
          (item.nickname && item.nickname.toLowerCase().includes(searchText)) ||
          (item.template && item.template.toLowerCase().includes(searchText)) ||
          (item.handle && item.handle.toLowerCase().includes(searchText))
        );
      });
      setFilteredUsageData(filtered);
    }
  };

  const loadHandles = async () => {
    try {
      const res = await fetch('/api/handles', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setHandles(data);
        setFilteredHandles(data);
      } else {
        console.error('Failed to load handles:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Failed to load handles:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      } else {
        console.error('Failed to load templates:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const checkHeaders = async () => {
    try {
      const res = await fetch('/debug/headers');
      if (res.ok) {
        const data = await res.json();
        console.log('Web service headers:', data);
      }
    } catch (error) {
      // Silently ignore debug endpoint errors
      console.log('Debug headers not available');
    }
  };

  const generateApiKey = async () => {
    try {
      const res = await fetch('/api/user/generate-api-key', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
      }
    } catch (error) {
      console.error('Failed to generate API key:', error);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    alert('API key copied to clipboard!');
  };

  const addTemplate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      });
      if (res.ok) {
        loadTemplates();
        setNewTemplate({ title: '', body: '', favorite: false });
        setShowAddTemplate(false);
      }
    } catch (error) {
      console.error('Failed to add template:', error);
    }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/templates/${id}/delete`, {
        method: 'GET',
        credentials: 'include'
      });
      if (res.ok) {
        loadTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const editTemplate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTemplate.title,
          body: editingTemplate.body,
          favorite: editingTemplate.favorite
        })
      });
      if (res.ok) {
        loadTemplates();
        setEditingTemplate(null);
      }
    } catch (error) {
      console.error('Failed to edit template:', error);
    }
  };

  const addHandle = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/handles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: newHandle.handle,
          nickname: newHandle.nickname,
          emojis: newHandle.emojis
        })
      });
      if (res.ok) {
        loadHandles();
        setNewHandle({ handle: '', nickname: '', emojis: '' });
        setShowAddHandle(false);
        setHandleSearch('');
      } else {
        console.error('Failed to add handle:', res.status, await res.text());
        if (res.status === 401) {
          window.location.href = 'https://tinyauth.localtest.me/login';
        }
      }
    } catch (error) {
      console.error('Failed to add handle:', error);
    }
  };

  const deleteHandle = async (id) => {
    if (!confirm('Are you sure you want to delete this handle?')) return;
    try {
      // Use a simple GET request with delete action to avoid CORS preflight
      const res = await fetch(`/api/handles/${id}/delete`, {
        method: 'GET',
        credentials: 'include'
      });
      if (res.ok) {
        loadHandles();
      }
    } catch (error) {
      console.error('Failed to delete handle:', error);
    }
  };

  const editHandle = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch(`/api/handles/${editingHandle.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: editingHandle.handle,
          nickname: editingHandle.nickname,
          emojis: editingHandle.emojis
        })
      });
      if (res.ok) {
        loadHandles();
        setEditingHandle(null);
      }
    } catch (error) {
      console.error('Failed to edit handle:', error);
    }
  };

  const filterHandles = (search) => {
    setHandleSearch(search);
    if (!search) {
      setFilteredHandles(handles);
    } else {
      const filtered = handles.filter(h => 
        h.handle.toLowerCase().includes(search.toLowerCase()) ||
        h.nickname.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredHandles(filtered);
    }
  };

  useEffect(() => {
    filterHandles(handleSearch);
  }, [handles]);

  const exportData = async () => {
    setExporting(true);
    try {
      const data = {
        responses: templates.map(t => ({
          id: t.id.toString(),
          title: t.title || t.name,
          body: t.body || t.content,
          favorite: t.favorite || false,
          tags: t.tags || [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        })),
        users: handles.reduce((acc, h) => {
          acc[h.handle] = {
            nickname: h.nickname,
            emojis: h.emojis ? [h.emojis] : []
          };
          return acc;
        }, {}),
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `replyte-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Import handles (users)
      if (data.users) {
        for (const [handle, userData] of Object.entries(data.users)) {
          // Skip empty handles or nicknames
          if (!handle || !userData.nickname) continue;
          
          await fetch('/api/handles', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              handle,
              nickname: userData.nickname,
              emojis: userData.emojis?.join('') || ''
            })
          });
        }
      }
      
      // Import templates (responses)
      if (data.responses) {
        for (const template of data.responses) {
          await fetch('/api/templates', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: template.title,
              body: template.body,
              favorite: template.favorite || false,
              tags: template.tags || []
            })
          });
        }
      }
      
      // Reload data
      await loadHandles();
      await loadTemplates();
      
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please check the file format.');
    } finally {
      setImporting(false);
      event.target.value = ''; // Reset file input
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Replyte</h1>
            </div>
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">{userName || user.email}</span>
                <a 
                  href="https://tinyauth.localtest.me/logout" 
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {user && (
            <div>
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button 
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'handles' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('handles')}
                  >
                    Handles
                  </button>
                  <button 
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'templates' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('templates')}
                  >
                    Templates
                  </button>
                  <button 
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'usage' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('usage')}
                  >
                    Usage
                  </button>
                  <button 
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'settings' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setActiveTab('settings')}
                  >
                    Settings
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-6">
                {activeTab === 'handles' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-medium text-gray-900">X Handles</h2>
                      <div className="flex space-x-2">
                        <button 
                          onClick={loadHandles}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
                          title="Reload handles from server"
                        >
                          <RefreshIcon className="h-4 w-4" />
                          <span>Reload</span>
                        </button>
                        <button 
                          onClick={() => setShowAddHandle(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                        >
                          Add Handle
                        </button>
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      placeholder="Search handles..."
                      value={handleSearch}
                      onChange={(e) => filterHandles(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
                    />
                    
                    {showAddHandle && (
                      <div className="mb-6 bg-white p-4 rounded-lg shadow border">
                        <form onSubmit={addHandle}>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <input
                              type="text"
                              placeholder="Handle (without @)"
                              value={newHandle.handle}
                              onChange={(e) => setNewHandle({...newHandle, handle: e.target.value})}
                              className="border border-gray-300 rounded-md px-3 py-2"
                              required
                            />
                            <input
                              type="text"
                              placeholder="Nickname"
                              value={newHandle.nickname}
                              onChange={(e) => setNewHandle({...newHandle, nickname: e.target.value})}
                              className="border border-gray-300 rounded-md px-3 py-2"
                              required
                            />
                            <input
                              type="text"
                              placeholder="Emojis (optional)"
                              value={newHandle.emojis}
                              onChange={(e) => setNewHandle({...newHandle, emojis: e.target.value})}
                              className="border border-gray-300 rounded-md px-3 py-2"
                            />
                          </div>
                          <div className="mt-4 flex space-x-2">
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm">
                              Save
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setShowAddHandle(false)}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                    <div className={`space-y-${spacing === 'compact' ? '1' : spacing === 'comfortable' ? '3' : '2'}`}>
                      {filteredHandles.map(handle => (
                        <div key={handle.id} className={`bg-white ${spacing === 'compact' ? 'p-1.5' : spacing === 'comfortable' ? 'p-4' : 'p-3'} rounded-lg shadow border`}>
                          {editingHandle?.id === handle.id ? (
                            <form onSubmit={editHandle} className="space-y-3">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <input
                                  type="text"
                                  value={editingHandle.handle}
                                  onChange={(e) => setEditingHandle({...editingHandle, handle: e.target.value})}
                                  className="border border-gray-300 rounded-md px-3 py-2"
                                  required
                                />
                                <input
                                  type="text"
                                  value={editingHandle.nickname}
                                  onChange={(e) => setEditingHandle({...editingHandle, nickname: e.target.value})}
                                  className="border border-gray-300 rounded-md px-3 py-2"
                                  required
                                />
                                <input
                                  type="text"
                                  value={editingHandle.emojis || ''}
                                  onChange={(e) => setEditingHandle({...editingHandle, emojis: e.target.value})}
                                  className="border border-gray-300 rounded-md px-3 py-2"
                                />
                              </div>
                              <div className="flex space-x-2">
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                                  Save
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setEditingHandle(null)}
                                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex justify-between items-center">
                              <div className={`font-medium text-gray-900 ${spacing === 'compact' ? 'text-sm' : ''}`}>
                                @{handle.handle} → {handle.nickname}
                                {handle.emojis && <span className="ml-2">{handle.emojis}</span>}
                              </div>
                              <div className="flex space-x-1">
                                <button 
                                  onClick={() => setEditingHandle(handle)}
                                  className={`${spacing === 'compact' ? 'p-1' : 'p-2'} rounded-md hover:bg-blue-50 text-blue-600`}
                                  title="Edit"
                                >
                                  <PencilIcon className={spacing === 'compact' ? 'h-4 w-4' : 'h-5 w-5'} />
                                </button>
                                <button 
                                  onClick={() => deleteHandle(handle.id)}
                                  className={`${spacing === 'compact' ? 'p-1' : 'p-2'} rounded-md hover:bg-red-50 text-red-600`}
                                  title="Delete"
                                >
                                  <TrashIcon className={spacing === 'compact' ? 'h-4 w-4' : 'h-5 w-5'} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'templates' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-medium text-gray-900">Templates</h2>
                      <button 
                        onClick={() => setShowAddTemplate(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Add Template
                      </button>
                    </div>
                    
                    {showAddTemplate && (
                      <div className="mb-6 bg-white p-4 rounded-lg shadow border">
                        <form onSubmit={addTemplate}>
                          <div className="space-y-4">
                            <input
                              type="text"
                              placeholder="Template title"
                              value={newTemplate.title}
                              onChange={(e) => setNewTemplate({...newTemplate, title: e.target.value})}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              required
                            />
                            <textarea
                              placeholder="Template body"
                              value={newTemplate.body}
                              onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
                              required
                            />
                            {newTemplate.body && (
                              <div className="p-2 bg-gray-50 rounded border-l-4 border-blue-200">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium text-gray-500">Preview:</span>
                                  <button 
                                    type="button"
                                    onClick={() => setTemplatePreviews(prev => ({ ...prev, 'new-template': renderTemplate(newTemplate) }))}
                                    className="p-1 rounded hover:bg-gray-200 text-gray-500"
                                    title="Refresh preview"
                                  >
                                    <RefreshIcon className="h-3 w-3" />
                                  </button>
                                </div>
                                <p className={`text-gray-700 ${spacing === 'compact' ? 'text-xs' : 'text-sm'}`}>
                                  {templatePreviews['new-template'] || renderTemplate(newTemplate)}
                                </p>
                              </div>
                            )}
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newTemplate.favorite}
                                onChange={(e) => setNewTemplate({...newTemplate, favorite: e.target.checked})}
                                className="mr-2"
                              />
                              Favorite
                            </label>
                          </div>
                          <div className="mt-4 flex space-x-2">
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm">
                              Save
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setShowAddTemplate(false)}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                    <div className={`space-y-${spacing === 'compact' ? '1' : spacing === 'comfortable' ? '3' : '2'}`}>
                      {templates.map(template => (
                        <div key={template.id} className={`bg-white ${spacing === 'compact' ? 'p-1.5' : spacing === 'comfortable' ? 'p-4' : 'p-3'} rounded-lg shadow border`}>
                          {editingTemplate?.id === template.id ? (
                            <form onSubmit={editTemplate} className="space-y-3">
                              <input
                                type="text"
                                value={editingTemplate.title}
                                onChange={(e) => setEditingTemplate({...editingTemplate, title: e.target.value})}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                              />
                              <textarea
                                value={editingTemplate.body}
                                onChange={(e) => setEditingTemplate({...editingTemplate, body: e.target.value})}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
                                required
                              />
                              <div className="p-2 bg-gray-50 rounded border-l-4 border-blue-200">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium text-gray-500">Preview:</span>
                                  <button 
                                    type="button"
                                    onClick={() => refreshPreview(`edit-${editingTemplate.id}`)}
                                    className="p-1 rounded hover:bg-gray-200 text-gray-500"
                                    title="Refresh preview"
                                  >
                                    <RefreshIcon className="h-3 w-3" />
                                  </button>
                                </div>
                                <p className={`text-gray-700 ${spacing === 'compact' ? 'text-xs' : 'text-sm'}`}>
                                  {templatePreviews[`edit-${editingTemplate.id}`] || renderTemplate(editingTemplate)}
                                </p>
                              </div>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editingTemplate.favorite}
                                  onChange={(e) => setEditingTemplate({...editingTemplate, favorite: e.target.checked})}
                                  className="mr-2"
                                />
                                Favorite
                              </label>
                              <div className="flex space-x-2">
                                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                                  Save
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setEditingTemplate(null)}
                                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className={`font-medium text-gray-900 ${spacing === 'compact' ? 'text-sm' : ''}`}>
                                  {template.title || template.name}
                                  {template.favorite && <span className="ml-2">⭐</span>}
                                </div>
                                <p className={`mt-1 text-gray-600 ${spacing === 'compact' ? 'text-xs' : 'text-sm'}`}>{template.body || template.content}</p>
                                <div className="mt-2 p-2 bg-gray-50 rounded border-l-4 border-blue-200">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-gray-500">Preview:</span>
                                    <button 
                                      onClick={() => refreshPreview(template.id)}
                                      className="p-1 rounded hover:bg-gray-200 text-gray-500"
                                      title="Refresh preview"
                                    >
                                      <RefreshIcon className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <p className={`text-gray-700 ${spacing === 'compact' ? 'text-xs' : 'text-sm'}`}>
                                    {templatePreviews[template.id] || renderTemplate(template)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-1 ml-4">
                                <button 
                                  onClick={() => setEditingTemplate(template)}
                                  className={`${spacing === 'compact' ? 'p-1' : 'p-2'} rounded-md hover:bg-blue-50 text-blue-600`}
                                  title="Edit"
                                >
                                  <PencilIcon className={spacing === 'compact' ? 'h-4 w-4' : 'h-5 w-5'} />
                                </button>
                                <button 
                                  onClick={() => deleteTemplate(template.id)}
                                  className={`${spacing === 'compact' ? 'p-1' : 'p-2'} rounded-md hover:bg-red-50 text-red-600`}
                                  title="Delete"
                                >
                                  <TrashIcon className={spacing === 'compact' ? 'h-4 w-4' : 'h-5 w-5'} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'usage' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-medium text-gray-900">Usage Report</h2>
                      <button 
                        onClick={loadUsageReport}
                        disabled={loadingUsage}
                        className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
                      >
                        <RefreshIcon className="h-4 w-4" />
                        <span>{loadingUsage ? 'Loading...' : 'Refresh'}</span>
                      </button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow border mb-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter:
                          </label>
                          <input
                            type="text"
                            placeholder="Search..."
                            value={usageFilter}
                            onChange={(e) => filterUsageData(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Group By:
                          </label>
                          <select 
                            value={usageGroupBy} 
                            onChange={(e) => setUsageGroupBy(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                          >
                            <option value="nickname">Nickname</option>
                            <option value="template">Template</option>
                            <option value="both">Both</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Time Range:
                          </label>
                          <select 
                            value={usageRange} 
                            onChange={(e) => setUsageRange(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
                          >
                            <option value="1">Last 1 day</option>
                            <option value="2">Last 2 days</option>
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow border">
                      {loadingUsage ? (
                        <div className="p-8 text-center text-gray-500">
                          Loading usage data...
                        </div>
                      ) : filteredUsageData.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          {usageFilter ? 'No results match your filter.' : 'No usage data found for the selected time range.'}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {usageGroupBy === 'nickname' && (
                                  <>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Handle
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Nickname
                                    </th>
                                  </>
                                )}
                                {usageGroupBy === 'template' && (
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Template
                                  </th>
                                )}
                                {usageGroupBy === 'both' && (
                                  <>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Handle
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Nickname
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Template
                                    </th>
                                  </>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Count
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredUsageData.map((item, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  {usageGroupBy === 'nickname' && (
                                    <>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        @{item.handle}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.name}
                                      </td>
                                    </>
                                  )}
                                  {usageGroupBy === 'template' && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {item.name}
                                    </td>
                                  )}
                                  {usageGroupBy === 'both' && (
                                    <>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        @{item.handle}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.nickname}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.template}
                                      </td>
                                    </>
                                  )}
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.count}
                                  </td>
                                </tr>
                              ))}}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">Chrome Extension</h2>
                      <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Key for Chrome Extension:
                          </label>
                          {apiKey ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={apiKey}
                                readOnly
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 font-mono text-sm"
                              />
                              <button
                                onClick={copyApiKey}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
                              >
                                Copy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={generateApiKey}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                            >
                              Generate API Key
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Use this API key in the Chrome extension to sync your handles and templates.
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">Display</h2>
                      <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Spacing:
                          </label>
                          <select 
                            value={spacing} 
                            onChange={(e) => setSpacing(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            <option value="compact">Compact</option>
                            <option value="normal">Normal</option>
                            <option value="comfortable">Comfortable</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">Data Management</h2>
                      <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="flex space-x-4">
                          <button
                            onClick={exportData}
                            disabled={exporting}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                          >
                            {exporting ? 'Exporting...' : 'Export Data'}
                          </button>
                          <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer">
                            {importing ? 'Importing...' : 'Import Data'}
                            <input
                              type="file"
                              accept=".json"
                              onChange={importData}
                              disabled={importing}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          Export your handles and templates as JSON, or import from a previous export.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;