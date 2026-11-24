'use strict';

(() => {
  const STORAGE_KEY = 'ict-javascript-playground-workspace-v1';
  const CHANNEL = 'javascript-playground';
  const TASKS = []; // Materi dan tugas sengaja dikosongkan untuk tahap awal.
  const $ = (selector) => document.querySelector(selector);

  const editor = $('#codeEditor');
  const lineNumbers = $('#lineNumbers');
  const previewFrame = $('#previewFrame');
  const previewWrap = $('#previewWrap');
  const consoleOutput = $('#consoleOutput');
  const consoleState = $('#consoleState');
  const saveStatus = $('#saveStatus');
  const toast = $('#toast');

  const editors = {
    html: { value: '', label: 'HTML · index.html', placeholder: '<!-- Tulis struktur HTML di sini -->' },
    css: { value: '', label: 'CSS · style.css', placeholder: '/* Tulis CSS di sini */' },
    js: { value: '', label: 'JavaScript · script.js', placeholder: '// Tulis kode JavaScript di sini…' }
  };

  let activeTab = 'js';
  let runToken = '';
  let toastTimeout = null;
  let saveTimeout = null;
  let executionStartedAt = 0;
  let runHadError = false;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2300);
  }

  function setSaveState(message, state = 'saved') {
    saveStatus.innerHTML = '<span class="status-dot"></span> ' + message;
    const dot = saveStatus.querySelector('.status-dot');
    if (dot && state === 'saving') dot.style.background = '#f5c84c';
    if (dot && state === 'error') dot.style.background = '#ff7d83';
  }

  function saveWorkspace() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ editors, activeTab }));
      setSaveState('Tersimpan di browser');
    } catch (error) {
      setSaveState('Gagal menyimpan', 'error');
      console.warn('Workspace tidak dapat disimpan:', error);
    }
  }

  function scheduleSave() {
    setSaveState('Menyimpan…', 'saving');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveWorkspace, 350);
  }

  function restoreWorkspace() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      ['html', 'css', 'js'].forEach((key) => {
        const value = saved.editors && saved.editors[key] && saved.editors[key].value;
        if (typeof value === 'string') editors[key].value = value;
      });
      if (['html', 'css', 'js'].includes(saved.activeTab)) activeTab = saved.activeTab;
    } catch (error) {
      console.warn('Data workspace lokal tidak dapat dibaca:', error);
    }
  }

  function updateEditorStats() {
    const lines = Math.max(1, editor.value.split('\n').length);
    lineNumbers.textContent = Array.from({ length: lines }, (_, index) => index + 1).join('\n');
    $('#lineCount').textContent = String(lines);
    $('#charCount').textContent = String(editor.value.length);
    $('#editorHint').textContent = editors[activeTab].label;
  }

  function setActiveTab(tab) {
    if (!['html', 'css', 'js'].includes(tab) || tab === activeTab) return;
    editors[activeTab].value = editor.value;
    activeTab = tab;
    editor.value = editors[activeTab].value;
    editor.placeholder = editors[activeTab].placeholder;
    editor.setAttribute('aria-label', 'Editor ' + editors[activeTab].label);
    document.querySelectorAll('.editor-tab').forEach((button) => {
      const isActive = button.dataset.tab === activeTab;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
    updateEditorStats();
    scheduleSave();
    editor.focus();
  }

  function clearConsole() {
    consoleOutput.replaceChildren();
    const placeholder = document.createElement('div');
    placeholder.className = 'console-placeholder';
    placeholder.textContent = 'Console dibersihkan. Jalankan kode untuk melihat output baru.';
    consoleOutput.append(placeholder);
    consoleState.textContent = 'Console dibersihkan';
  }

  function formatConsoleValue(value) {
    if (typeof value === 'string') return value;
    if (typeof value === 'undefined') return 'undefined';
    if (typeof value === 'bigint') return value.toString() + 'n';
    if (value instanceof Error) return value.name + ': ' + value.message;
    try {
      const seen = new WeakSet();
      const json = JSON.stringify(value, (_key, item) => {
        if (typeof item === 'bigint') return item.toString() + 'n';
        if (item && typeof item === 'object') {
          if (seen.has(item)) return '[Circular]';
          seen.add(item);
        }
        return item;
      }, 2);
      return json === undefined ? String(value) : json;
    } catch (_error) {
      try { return String(value); } catch (_ignored) { return '[Tidak dapat ditampilkan]'; }
    }
  }

  function appendConsole(type, values, prefix) {
    const placeholder = consoleOutput.querySelector('.console-placeholder');
    if (placeholder) placeholder.remove();
    const row = document.createElement('div');
    row.className = 'console-entry ' + type;
    const label = document.createElement('span');
    label.className = 'console-prefix';
    label.textContent = prefix || type.toUpperCase();
    const content = document.createElement('span');
    content.textContent = (values || []).map(formatConsoleValue).join(' ');
    row.append(label, content);
    consoleOutput.append(row);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function encodeBase64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function buildPreviewDocument(token, html, css, js) {
    const encodedToken = JSON.stringify(token);
    const encodedCode = JSON.stringify(encodeBase64Utf8(js));
    const encodedCss = JSON.stringify(encodeBase64Utf8(css));
    const bootstrap = `
      (() => {
        const token = ${encodedToken};
        const send = (type, payload = {}) => {
          parent.postMessage({ channel: '${CHANNEL}', token, type, ...payload }, '*');
        };
        const serialize = (value) => {
          if (value instanceof Error) return value.name + ': ' + value.message;
          if (typeof value === 'bigint') return value.toString() + 'n';
          if (typeof value === 'undefined') return 'undefined';
          if (typeof value === 'function') return '[Function ' + (value.name || 'anonymous') + ']';
          if (value === null || typeof value !== 'object') return value;
          try {
            const seen = new WeakSet();
            return JSON.parse(JSON.stringify(value, (_key, item) => {
              if (typeof item === 'bigint') return item.toString() + 'n';
              if (item && typeof item === 'object') {
                if (seen.has(item)) return '[Circular]';
                seen.add(item);
              }
              if (item instanceof Element) return '<' + item.tagName.toLowerCase() + (item.id ? '#' + item.id : '') + '> ';
              return item;
            }));
          } catch (_error) { return String(value); }
        };
        ['log', 'info', 'warn', 'error', 'debug'].forEach((method) => {
          console[method] = (...args) => send('console', { level: method === 'debug' ? 'info' : method, values: args.map(serialize) });
        });
        console.clear = () => send('clear');
        console.table = (data) => send('console', { level: 'log', values: [serialize(data)] });
        window.addEventListener('error', (event) => {
          send('console', { level: 'error', values: [event.message + (event.lineno ? ' (baris ' + event.lineno + ')' : '')] });
        });
        window.addEventListener('unhandledrejection', (event) => {
          send('console', { level: 'error', values: ['Unhandled promise rejection:', serialize(event.reason)] });
        });
        window.addEventListener('message', (event) => {
          if (event.source !== parent || !event.data || event.data.channel !== '${CHANNEL}' || event.data.token !== token) return;
          if (event.data.type === 'ping') send('ready');
        });
        send('ready');
        const cssBinary = atob(${encodedCss});
        const cssBytes = Uint8Array.from(cssBinary, (char) => char.charCodeAt(0));
        const style = document.createElement('style');
        style.textContent = new TextDecoder().decode(cssBytes);
        document.head.appendChild(style);
        const encoded = ${encodedCode};
        const binary = atob(encoded);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const source = new TextDecoder().decode(bytes);
        const script = document.createElement('script');
        script.textContent = source;
        document.body.appendChild(script);
        send('finished');
      })();
    `;

    return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
</head>
<body>
${html}
<script>${bootstrap}</script>
</body>
</html>`;
  }

  function makeToken() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function runCode() {
    editors[activeTab].value = editor.value;
    saveWorkspace();
    clearConsole();
    consoleState.textContent = 'Sedang dijalankan…';
    executionStartedAt = performance.now();
    runToken = makeToken();
    runHadError = false;
    previewWrap.classList.add('has-content');
    previewFrame.srcdoc = buildPreviewDocument(runToken, editors.html.value, editors.css.value, editors.js.value);
    appendConsole('info', ['Menjalankan JavaScript…'], 'RUN');
  }

  function handlePreviewMessage(event) {
    if (event.source !== previewFrame.contentWindow) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.token !== runToken) return;

    if (data.type === 'ready') {
      if (consoleState.textContent === 'Sedang dijalankan…') consoleState.textContent = 'Berjalan';
      return;
    }
    if (data.type === 'console') {
      const level = ['log', 'info', 'warn', 'error'].includes(data.level) ? data.level : 'log';
      appendConsole(level, Array.isArray(data.values) ? data.values : [], level.toUpperCase());
      if (level === 'error') {
        runHadError = true;
        consoleState.textContent = 'Selesai dengan error';
      }
      return;
    }
    if (data.type === 'clear') {
      consoleOutput.replaceChildren();
      return;
    }
    if (data.type === 'finished') {
      const elapsed = Math.max(0, Math.round(performance.now() - executionStartedAt));
      consoleState.textContent = runHadError ? 'Selesai dengan error · ' + elapsed + ' ms' : 'Selesai · ' + elapsed + ' ms';
      appendConsole('result', ['Eksekusi selesai dalam ' + elapsed + ' ms'], 'DONE');
    }
  }

  function resetWorkspace() {
    const confirmed = window.confirm('Kosongkan HTML, CSS, dan JavaScript? Kode yang tersimpan di browser akan dihapus.');
    if (!confirmed) return;
    Object.keys(editors).forEach((key) => { editors[key].value = ''; });
    editor.value = '';
    setActiveTab('js');
    saveWorkspace();
    previewFrame.removeAttribute('srcdoc');
    previewWrap.classList.remove('has-content');
    previewEmpty.hidden = false;
    clearConsole();
    consoleState.textContent = 'Menunggu eksekusi';
    updateEditorStats();
    showToast('Semua editor berhasil dikosongkan.');
  }

  editor.addEventListener('input', () => {
    editors[activeTab].value = editor.value;
    updateEditorStats();
    scheduleSave();
  });
  editor.addEventListener('scroll', () => { lineNumbers.scrollTop = editor.scrollTop; });
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.setRangeText('  ', start, end, 'end');
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runCode();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      editors[activeTab].value = editor.value;
      saveWorkspace();
      showToast('Kode disimpan di browser.');
    }
  });

  document.querySelectorAll('.editor-tab').forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab));
  });
  $('#runBtn').addEventListener('click', runCode);
  $('#clearConsoleBtn').addEventListener('click', clearConsole);
  $('#resetBtn').addEventListener('click', resetWorkspace);
  window.addEventListener('message', handlePreviewMessage);

  restoreWorkspace();
  editor.value = editors[activeTab].value;
  editor.placeholder = editors[activeTab].placeholder;
  document.querySelectorAll('.editor-tab').forEach((button) => {
    const active = button.dataset.tab === activeTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  updateEditorStats();
  $('#taskCount').textContent = String(TASKS.length);
})();
