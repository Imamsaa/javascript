'use strict';

(() => {
  const STORAGE_KEY = 'ict-javascript-playground-workspace-v2';
  const CHANNEL = 'javascript-playground';
  const TASKS = []; // Materi dan tugas sengaja dikosongkan untuk tahap awal.
  const $ = (selector) => document.querySelector(selector);
  const textarea = $('#codeEditor');
  const previewFrame = $('#previewFrame');
  const previewWrap = $('#previewWrap');
  const previewEmpty = $('#previewEmpty');
  const consoleOutput = $('#consoleOutput');
  const consoleState = $('#consoleState');
  const saveStatus = $('#saveStatus');
  const toast = $('#toast');
  const problemsPanel = $('#problemsPanel');

  const editors = {
    html: { value: '', label: 'HTML', file: 'index.html', placeholder: '<!-- Tulis struktur HTML di sini -->', parser: 'html', mode: 'htmlmixed' },
    css: { value: '', label: 'CSS', file: 'style.css', placeholder: '/* Tulis CSS di sini */', parser: 'css', mode: 'css' },
    js: { value: '', label: 'JavaScript', file: 'script.js', placeholder: '// Tulis kode JavaScript di sini…', parser: 'babel', mode: 'javascript' }
  };

  const MODE_LABELS = { html: 'HTML', css: 'CSS', js: 'JavaScript' };
  const GLOBALS = [
    'window','document','console','alert','confirm','prompt','navigator','location','history','localStorage','sessionStorage',
    'fetch','setTimeout','setInterval','clearTimeout','clearInterval','requestAnimationFrame','cancelAnimationFrame',
    'URL','URLSearchParams','HTMLElement','Element','Node','Event','CustomEvent','FormData','File','Blob',
    'Math','JSON','Array','Object','String','Number','Boolean','Date','RegExp','Promise','Error','Map','Set',
    'WeakMap','WeakSet','Symbol','BigInt','Intl','Reflect','Proxy','parseInt','parseFloat','isNaN','isFinite',
    'undefined','NaN','Infinity','globalThis','performance'
  ];
  const JS_KEYWORDS = [
    'const','let','var','function','return','if','else','switch','case','break','continue','for','while','do',
    'try','catch','finally','throw','new','this','class','extends','super','static','get','set','async','await',
    'import','export','default','from','of','in','instanceof','typeof','void','delete','yield','debugger',
    'true','false','null','undefined'
  ];
  const MEMBER_HINTS = {
    console: ['log','info','warn','error','table','clear','time','timeEnd','group','groupEnd','dir'],
    Math: ['abs','ceil','floor','round','max','min','random','pow','sqrt','PI','E','trunc','sign'],
    document: ['querySelector','querySelectorAll','getElementById','getElementsByClassName','createElement','createTextNode','body','head','title','addEventListener'],
    window: ['alert','confirm','prompt','location','history','setTimeout','setInterval','localStorage','innerWidth','innerHeight','addEventListener'],
    Array: ['isArray','from','of'],
    JSON: ['parse','stringify'],
    Object: ['keys','values','entries','assign','freeze','create'],
    Promise: ['resolve','reject','all','race','allSettled'],
    localStorage: ['getItem','setItem','removeItem','clear','key','length'],
    sessionStorage: ['getItem','setItem','removeItem','clear','key','length']
  };

  let activeTab = 'js';
  let codeEditor = null;
  let saveTimer = null;
  let toastTimer = null;
  let lintTimer = null;
  let runToken = '';
  let runStartedAt = 0;
  let runHadError = false;
  let problemsOpen = false;
  let consoleEntryCount = 0;
  let lintCacheText = null;
  let lintCacheMessages = [];
  let linter = null;

  if (window.eslint && typeof window.eslint.Linter === 'function') {
    try { linter = new window.eslint.Linter(); } catch (error) { console.warn('ESLint tidak dapat dibuat:', error); }
  }

  const eslintConfig = {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: Object.fromEntries(GLOBALS.map((name) => [name, 'readonly']))
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-var': 'warn',
      'prefer-const': 'warn',
      'eqeqeq': ['warn', 'always'],
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-debugger': 'warn',
      'no-extra-boolean-cast': 'warn'
    }
  };

  const customWords = Array.from(new Set(GLOBALS.concat(JS_KEYWORDS, [
    'length','push','pop','shift','unshift','map','filter','reduce','forEach','find','findIndex','includes',
    'slice','splice','join','split','replace','toUpperCase','toLowerCase','trim','startsWith','endsWith',
    'addEventListener','removeEventListener','appendChild','remove','classList','textContent','innerHTML',
    'value','style','dataset','preventDefault','stopPropagation','then','catch','finally','toString'
  ]))).sort();

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function getEditorValue() {
    return codeEditor ? codeEditor.getValue() : textarea.value;
  }

  function setEditorValue(value) {
    if (codeEditor) codeEditor.setValue(value);
    else textarea.value = value;
    updateEditorStats();
  }

  function setSaveState(message, state) {
    saveStatus.innerHTML = '<span class="status-dot"></span> ' + message;
    const dot = saveStatus.querySelector('.status-dot');
    if (dot) dot.style.background = state === 'saving' ? '#f5c84c' : (state === 'error' ? '#ff7d83' : '#55d6a4');
  }

  function currentWorkspace() {
    if (activeTab) editors[activeTab].value = getEditorValue();
    return { editors: editors, activeTab: activeTab, version: 2 };
  }

  function saveWorkspace() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentWorkspace()));
      setSaveState('Tersimpan di browser', 'saved');
    } catch (error) {
      setSaveState('Gagal menyimpan', 'error');
      console.warn('Workspace tidak dapat disimpan:', error);
    }
  }

  function scheduleSave() {
    setSaveState('Menyimpan…', 'saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWorkspace, 350);
  }

  function restoreWorkspace() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      ['html', 'css', 'js'].forEach((key) => {
        const value = saved.editors && saved.editors[key] && saved.editors[key].value;
        if (typeof value === 'string') editors[key].value = value;
      });
      if (Object.prototype.hasOwnProperty.call(editors, saved.activeTab)) activeTab = saved.activeTab;
    } catch (error) {
      console.warn('Data workspace lokal tidak dapat dibaca:', error);
    }
  }

  function updateEditorStats() {
    const value = getEditorValue();
    $('#lineCount').textContent = String(Math.max(1, value.split('\n').length));
    $('#charCount').textContent = String(value.length);
    $('#editorLanguage').textContent = MODE_LABELS[activeTab];
    document.querySelectorAll('.editor-tab').forEach((button) => {
      const selected = button.dataset.tab === activeTab;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
  }

  function getHintFunction(tab) {
    if (tab === 'js') return javascriptHint;
    if (tab === 'css') return window.CodeMirror && CodeMirror.hint && CodeMirror.hint.css;
    return window.CodeMirror && CodeMirror.hint && CodeMirror.hint.html;
  }

  function javascriptHint(cm) {
    const cursor = cm.getCursor();
    const token = cm.getTokenAt(cursor);
    const lineBefore = cm.getLine(cursor.line).slice(0, cursor.ch);
    const memberMatch = lineBefore.match(/([A-Za-z_$][\w$]*)\.([\w$]*)$/);
    const typed = token.string.replace(/^.*\./, '');
    const source = memberMatch && MEMBER_HINTS[memberMatch[1]] ? MEMBER_HINTS[memberMatch[1]] : customWords;
    const fromColumn = memberMatch ? cursor.ch - memberMatch[2].length : Math.max(token.start, cursor.ch - typed.length);
    const matches = source.filter((word) => word.toLowerCase().startsWith(typed.toLowerCase()));
    return {
      list: matches.map((word) => ({ text: word, displayText: word })),
      from: CodeMirror.Pos(cursor.line, fromColumn),
      to: CodeMirror.Pos(cursor.line, cursor.ch)
    };
  }

  function getLintMessages(source) {
    if (source === lintCacheText) return lintCacheMessages;
    lintCacheText = source;
    lintCacheMessages = [];
    if (!source.trim() || !linter) return lintCacheMessages;
    try {
      lintCacheMessages = linter.verify(source, eslintConfig, { filename: 'script.js' });
    } catch (error) {
      console.warn('ESLint gagal memeriksa kode:', error);
      lintCacheMessages = [{
        ruleId: 'eslint-loader',
        severity: 2,
        line: 1,
        column: 1,
        message: 'ESLint belum siap. Muat ulang halaman atau periksa koneksi internet.'
      }];
    }
    return lintCacheMessages;
  }

  function getLintAnnotations(source) {
    if (!window.CodeMirror) return [];
    return getLintMessages(source).map((issue) => {
      const line = Math.max(0, (issue.line || 1) - 1);
      const column = Math.max(0, (issue.column || 1) - 1);
      const endLine = Math.max(line, (issue.endLine || issue.line || 1) - 1);
      const endColumn = Math.max(column + 1, (issue.endColumn || (issue.column || 1) + 1) - 1);
      return {
        from: CodeMirror.Pos(line, column),
        to: CodeMirror.Pos(endLine, endColumn),
        message: issue.message + (issue.ruleId ? ' (' + issue.ruleId + ')' : ''),
        severity: issue.severity === 2 ? 'error' : 'warning'
      };
    });
  }

  function renderProblems(messages) {
    const errors = messages.filter((message) => message.severity === 2);
    const warnings = messages.filter((message) => message.severity !== 2);
    const count = messages.length;
    $('#problemCount').textContent = String(count);
    $('#problemHeadingCount').textContent = String(count);
    $('#errorCount').textContent = errors.length + (errors.length === 1 ? ' error' : ' errors');
    $('#warningCount').textContent = warnings.length + ' warnings';
    const toggle = $('#problemsToggle');
    toggle.classList.toggle('has-errors', errors.length > 0);
    toggle.classList.toggle('has-warnings', errors.length === 0 && warnings.length > 0);

    const list = $('#problemsList');
    list.replaceChildren();
    if (!count) {
      const empty = document.createElement('p');
      empty.className = 'problems-empty';
      empty.textContent = linter ? 'Tidak ada masalah yang ditemukan.' : 'ESLint belum termuat. Periksa koneksi internet.';
      list.append(empty);
      if (problemsOpen && activeTab === 'js' && !linter) problemsPanel.hidden = false;
      else if (!problemsOpen) problemsPanel.hidden = true;
      return;
    }

    messages.forEach((issue) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'problem-item ' + (issue.severity === 2 ? 'error' : 'warning');
      const severity = document.createElement('span');
      severity.className = 'problem-severity';
      severity.textContent = issue.severity === 2 ? '●' : '▲';
      const content = document.createElement('span');
      content.className = 'problem-message';
      content.append(document.createTextNode(issue.message));
      const meta = document.createElement('span');
      meta.className = 'problem-meta';
      meta.textContent = (issue.ruleId || 'syntax') + ' · Line ' + (issue.line || 1) + ':' + (issue.column || 1);
      content.append(meta);
      item.append(severity, content);
      item.addEventListener('click', () => {
        if (codeEditor) {
          codeEditor.focus();
          codeEditor.setCursor(Math.max(0, (issue.line || 1) - 1), Math.max(0, (issue.column || 1) - 1));
        }
      });
      list.append(item);
    });
    problemsPanel.hidden = !problemsOpen;
  }

  function refreshLint() {
    if (activeTab !== 'js') {
      lintCacheText = null;
      renderProblems([]);
      $('#problemsToggle').title = 'ESLint memeriksa file JavaScript';
      return;
    }
    $('#problemsToggle').title = 'Buka detail hasil pemeriksaan ESLint';
    const messages = getLintMessages(getEditorValue());
    renderProblems(messages);
    if (codeEditor && typeof codeEditor.performLint === 'function') codeEditor.performLint();
  }

  function queueLint() {
    clearTimeout(lintTimer);
    lintTimer = setTimeout(refreshLint, 300);
  }

  function setLintForActiveTab() {
    if (!codeEditor) return;
    if (activeTab === 'js' && linter) {
      codeEditor.setOption('lint', {
        getAnnotations: getLintAnnotations,
        async: false
      });
      codeEditor.performLint();
      queueLint();
    } else {
      codeEditor.setOption('lint', false);
      lintCacheText = null;
      renderProblems([]);
    }
  }

  function showAutocomplete(cm, tab) {
    if (!window.CodeMirror || typeof CodeMirror.showHint !== 'function') return;
    const helper = getHintFunction(tab);
    if (typeof helper !== 'function') return;
    CodeMirror.showHint(cm, helper, { completeSingle: false, alignWithWord: true, closeOnUnfocus: true });
  }

  function setActiveTab(tab) {
    if (!Object.prototype.hasOwnProperty.call(editors, tab) || tab === activeTab) return;
    editors[activeTab].value = getEditorValue();
    activeTab = tab;
    setEditorValue(editors[activeTab].value);
    textarea.placeholder = editors[activeTab].placeholder;
    if (codeEditor) {
      codeEditor.setOption('mode', editors[activeTab].mode);
      codeEditor.setOption('lint', false);
      codeEditor.setCursor({ line: 0, ch: 0 });
      codeEditor.refresh();
    }
    updateEditorStats();
    setLintForActiveTab();
    scheduleSave();
    if (codeEditor) codeEditor.focus();
  }

  function encodeBase64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function buildPreviewDocument(token, html, css, js) {
    const script = [
      '(function () {',
      '  const token = ' + JSON.stringify(token) + ';',
      '  const send = (type, payload) => parent.postMessage(Object.assign({ channel: ' + JSON.stringify(CHANNEL) + ', token: token, type: type }, payload || {}), "*");',
      '  const serialize = (value) => {',
      '    if (value instanceof Error) return value.name + ": " + value.message;',
      '    if (typeof value === "undefined") return "undefined";',
      '    if (typeof value === "bigint") return value.toString() + "n";',
      '    if (typeof value === "function") return "[Function " + (value.name || "anonymous") + "]";',
      '    if (value && typeof value === "object") {',
      '      if (value instanceof Element) return "<" + value.tagName.toLowerCase() + (value.id ? "#" + value.id : "") + ">";',
      '      try { const seen = new WeakSet(); return JSON.parse(JSON.stringify(value, (_key, item) => { if (item && typeof item === "object") { if (seen.has(item)) return "[Circular]"; seen.add(item); } return item; })); } catch (_error) { return String(value); }',
      '    }',
      '    return value;',
      '  };',
      '  ["log", "info", "warn", "error", "debug"].forEach((method) => {',
      '    console[method] = (...args) => send("console", { level: method === "debug" ? "info" : method, values: args.map(serialize) });',
      '  });',
      '  console.clear = () => send("clear");',
      '  console.table = (data) => send("console", { level: "log", values: [serialize(data)] });',
      '  window.addEventListener("error", (event) => { send("console", { level: "error", values: [event.message + (event.lineno ? " (baris " + event.lineno + ")" : "")] }); });',
      '  window.addEventListener("unhandledrejection", (event) => { send("console", { level: "error", values: ["Unhandled promise rejection:", serialize(event.reason)] }); });',
      '  const cssBinary = atob(' + JSON.stringify(encodeBase64Utf8(css)) + ');',
      '  const cssBytes = Uint8Array.from(cssBinary, (char) => char.charCodeAt(0));',
      '  const style = document.createElement("style");',
      '  style.textContent = new TextDecoder().decode(cssBytes);',
      '  document.head.appendChild(style);',
      '  const jsBinary = atob(' + JSON.stringify(encodeBase64Utf8(js)) + ');',
      '  const jsBytes = Uint8Array.from(jsBinary, (char) => char.charCodeAt(0));',
      '  const source = new TextDecoder().decode(jsBytes);',
      '  const script = document.createElement("script");',
      '  script.textContent = source;',
      '  document.body.appendChild(script);',
      '  send("finished");',
      '})();'
    ].join('\n');

    return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">' +
      '</head><body>' + html + '<script>' + script + '<' + '/script></body></html>';
  }

  function makeToken() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function clearConsole() {
    consoleEntryCount = 0;
    $('#consoleBadge').textContent = '0';
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
    if (value instanceof Error) return value.name + ': ' + value.message;
    if (typeof value === 'bigint') return value.toString() + 'n';
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
    consoleEntryCount += 1;
    $('#consoleBadge').textContent = String(consoleEntryCount);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function handlePreviewMessage(event) {
    if (event.source !== previewFrame.contentWindow || event.origin !== 'null') return;
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
      consoleEntryCount = 0;
      $('#consoleBadge').textContent = '0';
      return;
    }
    if (data.type === 'finished') {
      const elapsed = Math.max(0, Math.round(performance.now() - runStartedAt));
      consoleState.textContent = runHadError ? 'Selesai dengan error · ' + elapsed + ' ms' : 'Selesai · ' + elapsed + ' ms';
      appendConsole('result', ['Eksekusi selesai dalam ' + elapsed + ' ms'], 'DONE');
      $('#previewState').textContent = 'Dijalankan · ' + elapsed + ' ms';
    }
  }

  function parserPlugins() {
    return Array.isArray(window.prettierPlugins) ? window.prettierPlugins : [];
  }

  async function formatValue(tab, value) {
    if (!value.trim()) return value;
    if (!window.prettier || !parserPlugins().length) throw new Error('Prettier belum termuat. Periksa koneksi internet.');
    return window.prettier.format(value, {
      parser: editors[tab].parser,
      plugins: parserPlugins(),
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 90,
      htmlWhitespaceSensitivity: 'css'
    });
  }

  async function formatActiveEditor() {
    const before = getEditorValue();
    editors[activeTab].value = before;
    try {
      const formatted = await formatValue(activeTab, before);
      setEditorValue(formatted);
      editors[activeTab].value = formatted;
      saveWorkspace();
      refreshLint();
      showToast(editors[activeTab].file + ' berhasil diformat dengan Prettier.');
    } catch (error) {
      showToast('Format gagal: ' + (error && error.message ? error.message : 'periksa sintaks kode.'));
    }
  }

  async function formatWorkspace() {
    editors[activeTab].value = getEditorValue();
    const formattedValues = {};
    const failures = [];
    for (const tab of ['html', 'css', 'js']) {
      try {
        formattedValues[tab] = await formatValue(tab, editors[tab].value);
      } catch (error) {
        formattedValues[tab] = editors[tab].value;
        if (editors[tab].value.trim()) failures.push(editors[tab].file);
      }
    }
    Object.keys(formattedValues).forEach((tab) => { editors[tab].value = formattedValues[tab]; });
    setEditorValue(editors[activeTab].value);
    if (failures.length) showToast('Prettier melewati file yang belum valid: ' + failures.join(', '));
    saveWorkspace();
    refreshLint();
  }

  async function runCode() {
    const runButton = $('#runBtn');
    if (runButton.disabled) return;
    runButton.disabled = true;
    const originalLabel = runButton.innerHTML;

    try {
      // Keep Run responsive: formatting is optional and only touches the active file.
      editors[activeTab].value = getEditorValue();
      if ($('#formatOnRun').checked && getEditorValue().trim()) {
        const formatted = await formatValue(activeTab, getEditorValue());
        setEditorValue(formatted);
        editors[activeTab].value = formatted;
        refreshLint();
      }

      saveWorkspace();
      clearConsole();
      consoleState.textContent = 'Sedang dijalankan…';
      runStartedAt = performance.now();
      runToken = makeToken();
      runHadError = false;
      previewWrap.classList.add('has-content');
      previewEmpty.hidden = true;
      $('#previewState').textContent = 'Memuat preview…';
      previewFrame.srcdoc = buildPreviewDocument(runToken, editors.html.value, editors.css.value, editors.js.value);
      appendConsole('info', ['Menjalankan JavaScript…'], 'RUN');

    } catch (error) {
      showToast('Format atau eksekusi gagal: ' + (error.message || error));
    } finally {
      runButton.disabled = false;
      runButton.innerHTML = originalLabel;
    }
  }

  function setEnvironmentTab(tab) {
    const showConsole = tab === 'console';
    $('#previewPane').hidden = showConsole;
    $('#consolePane').hidden = !showConsole;
    $('#previewTab').classList.toggle('active', !showConsole);
    $('#consoleTab').classList.toggle('active', showConsole);
    $('#previewTab').setAttribute('aria-selected', String(!showConsole));
    $('#consoleTab').setAttribute('aria-selected', String(showConsole));
    $('#environmentTitle').textContent = showConsole ? 'Console' : 'Preview';
  }

  function toggleProblems(forceOpen) {
    problemsOpen = typeof forceOpen === 'boolean' ? forceOpen : !problemsOpen;
    problemsPanel.hidden = !problemsOpen;
    $('#problemsToggle').setAttribute('aria-expanded', String(problemsOpen));
  }

  function openContentDialog(type) {
    const isTask = type === 'tasks';
    $('#dialogKicker').textContent = isTask ? 'LATIHAN PRAKTIK' : 'PEMBELAJARAN';
    $('#dialogTitle').textContent = isTask ? 'Tugas' : 'Materi';
    $('#dialogEmptyTitle').textContent = isTask ? 'Belum ada tugas' : 'Belum ada materi';
    $('#dialogDescription').textContent = isTask
      ? 'Daftar tugas praktik JavaScript akan ditampilkan di sini setelah disusun.'
      : 'Materi pembelajaran JavaScript akan ditambahkan setelah struktur kurikulum disiapkan.';
    const dialog = $('#contentDialog');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function resetWorkspace() {
    const confirmed = window.confirm('Kosongkan HTML, CSS, dan JavaScript? Kode yang tersimpan di browser akan dihapus.');
    if (!confirmed) return;
    Object.keys(editors).forEach((key) => { editors[key].value = ''; });
    setEditorValue('');
    activeTab = 'js';
    if (codeEditor) {
      codeEditor.setOption('mode', 'javascript');
      codeEditor.setCursor({ line: 0, ch: 0 });
      codeEditor.refresh();
    }
    updateEditorStats();
    setLintForActiveTab();
    saveWorkspace();
    previewFrame.removeAttribute('srcdoc');
    previewWrap.classList.remove('has-content');
    previewEmpty.hidden = false;
    $('#previewState').textContent = 'Belum dijalankan';
    clearConsole();
    consoleState.textContent = 'Menunggu eksekusi';
    showToast('Semua editor berhasil dikosongkan.');
  }

  function initializeCodeMirror() {
    if (!window.CodeMirror) {
      textarea.style.display = 'block';
      $('#editorFallback').hidden = false;
      return;
    }
    codeEditor = CodeMirror.fromTextArea(textarea, {
      mode: editors[activeTab].mode,
      theme: 'jquest',
      lineNumbers: true,
      styleActiveLine: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      lineWrapping: false,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-lint-markers'],
      extraKeys: {
        'Ctrl-Space': (cm) => showAutocomplete(cm, activeTab),
        'Cmd-Space': (cm) => showAutocomplete(cm, activeTab),
        'Ctrl-Enter': runCode,
        'Cmd-Enter': runCode,
        'Shift-Alt-F': formatActiveEditor,
        'Cmd-Shift-F': formatActiveEditor,
        'Tab': (cm) => cm.replaceSelection('  ', 'end')
      }
    });
    codeEditor.setValue(editors[activeTab].value);
    codeEditor.on('change', (_cm, change) => {
      editors[activeTab].value = getEditorValue();
      updateEditorStats();
      scheduleSave();
      if (activeTab === 'js') queueLint();
      if (change && change.origin === '+input') {
        const cursor = codeEditor.getCursor();
        const token = codeEditor.getTokenAt(cursor);
        const before = codeEditor.getLine(cursor.line).slice(0, cursor.ch);
        if (token.type && /string|comment/.test(token.type)) return;
        if (before.endsWith('.') || /[A-Za-z_$][\w$]{1,}$/.test(before)) {
          window.setTimeout(() => {
            if (document.activeElement === codeEditor.getInputField()) showAutocomplete(codeEditor, activeTab);
          }, 30);
        }
      }
    });
    codeEditor.on('inputRead', (_cm, change) => {
      if (!change.text || !change.text.length) return;
      const last = change.text[change.text.length - 1];
      if (last === '.') showAutocomplete(codeEditor, activeTab);
    });
    codeEditor.refresh();
    setLintForActiveTab();
  }

  $('#runBtn').addEventListener('click', runCode);
  $('#formatBtn').addEventListener('click', formatActiveEditor);
  $('#resetBtn').addEventListener('click', resetWorkspace);
  $('#previewTab').addEventListener('click', () => setEnvironmentTab('preview'));
  $('#consoleTab').addEventListener('click', () => setEnvironmentTab('console'));
  $('#clearConsoleBtn').addEventListener('click', clearConsole);
  $('#problemsToggle').addEventListener('click', () => toggleProblems());
  $('#closeProblemsBtn').addEventListener('click', () => toggleProblems(false));
  $('#materialsBtn').addEventListener('click', () => openContentDialog('materials'));
  $('#tasksBtn').addEventListener('click', () => openContentDialog('tasks'));
  $('#closeDialogBtn').addEventListener('click', () => $('#contentDialog').close());
  $('#contentDialog').addEventListener('click', (event) => {
    if (event.target === $('#contentDialog')) $('#contentDialog').close();
  });
  document.querySelectorAll('.editor-tab').forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab));
  });
  window.addEventListener('message', handlePreviewMessage);

  restoreWorkspace();
  initializeCodeMirror();
  updateEditorStats();
  renderProblems([]);
  setEnvironmentTab('preview');
  $('#materialsBtn .nav-count').textContent = '0';
  $('#tasksBtn .nav-count').textContent = String(TASKS.length);
  if (!linter) {
    $('#problemsToggle').title = 'ESLint belum termuat. Periksa koneksi internet.';
  }
})();