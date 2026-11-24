'use strict';

(() => {
  const STORAGE_KEY = 'ict-javascript-playground-workspace-v2';
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
  let commandCounter = 0;
  let commandHistory = [];
  let commandHistoryIndex = 0;
  let consoleSuggestions = [];
  let activeConsoleSuggestion = 0;
  let consoleSuggestionRange = null;
  let previewRuntimeReady = false;
  const pendingCommands = new Set();
  const queuedConsoleCommands = [];
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


  const CONSOLE_MEMBER_HINTS = {
    console: ['assert','clear','count','debug','dir','dirxml','error','group','groupCollapsed','groupEnd','info','log','table','time','timeEnd','timeLog','trace','warn'],
    Math: ['abs','acos','asin','atan','atan2','ceil','cos','floor','max','min','PI','pow','random','round','sign','sin','sqrt','tan','trunc'],
    JSON: ['parse','stringify'],
    Object: ['assign','create','defineProperty','entries','freeze','fromEntries','hasOwn','keys','values'],
    Array: ['from','isArray','of'],
    Promise: ['all','allSettled','any','race','reject','resolve'],
    Date: ['now','parse','UTC'],
    String: ['fromCharCode','fromCodePoint','raw'],
    Number: ['isFinite','isInteger','isNaN','parseFloat','parseInt'],
    document: ['activeElement','body','characterSet','cookie','createElement','createTextNode','documentElement','getElementById','getElementsByClassName','getElementsByTagName','head','querySelector','querySelectorAll','title','URL'],
    'document.body': ['append','appendChild','children','classList','clientHeight','clientWidth','firstElementChild','innerHTML','innerText','lastElementChild','remove','removeChild','replaceChildren','style','textContent'],
    'document.documentElement': ['clientHeight','clientWidth','innerHTML','lang','scrollHeight','scrollWidth','style'],
    'document.head': ['append','appendChild','children','querySelector','querySelectorAll'],
    window: ['addEventListener','alert','clearInterval','clearTimeout','confirm','document','fetch','history','innerHeight','innerWidth','localStorage','location','matchMedia','navigator','open','prompt','removeEventListener','requestAnimationFrame','scrollTo','sessionStorage','setInterval','setTimeout'],
    'window.location': ['assign','hash','host','hostname','href','origin','pathname','port','protocol','reload','replace','search'],
    navigator: ['clipboard','language','languages','onLine','platform','userAgent'],
    location: ['assign','hash','host','hostname','href','origin','pathname','port','protocol','reload','replace','search'],
    history: ['back','forward','go','length','pushState','replaceState'],
    localStorage: ['clear','getItem','key','length','removeItem','setItem'],
    sessionStorage: ['clear','getItem','key','length','removeItem','setItem'],
    performance: ['now','timeOrigin','toJSON'],
    PromisePrototype: ['catch','finally','then']
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
      '  window.addEventListener("message", (event) => {',
      '    if (event.source !== parent || !event.data || event.data.channel !== ' + JSON.stringify(CHANNEL) + ' || event.data.token !== token || event.data.type !== "command") return;',
      '    const requestId = event.data.requestId;',
      '    try {',
      '      const result = window.eval(String(event.data.command || ""));',
      '      const reportValue = (value) => send("command-result", { requestId: requestId, hasValue: typeof value !== "undefined", value: serialize(value) });',
      '      if (result && typeof result.then === "function") Promise.resolve(result).then(reportValue, (error) => send("command-error", { requestId: requestId, message: error && error.message ? error.message : String(error), stack: error && error.stack ? error.stack : "" }));',
      '      else reportValue(result);',
      '    } catch (error) {',
      '      send("command-error", { requestId: requestId, message: error && error.message ? error.message : String(error), stack: error && error.stack ? error.stack : "" });',
      '    }',
      '  });',
      '  send("ready");',
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
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' \'unsafe-eval\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">' +
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
    placeholder.textContent = 'Console kosong. Output dari console.log(), console.warn(), dan console.error() akan muncul di sini.';
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

  function appendConsole(type, values) {
    const placeholder = consoleOutput.querySelector('.console-placeholder');
    if (placeholder) placeholder.remove();

    const row = document.createElement('div');
    row.className = 'console-entry ' + type;
    const marker = document.createElement('span');
    marker.className = 'console-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = type === 'error' ? '×' : type === 'warn' ? '⚠' : type === 'info' ? 'ℹ' : type === 'command' ? '>' : '›';
    marker.title = type === 'error' ? 'Error' : type === 'warn' ? 'Warning' : type === 'info' ? 'Info' : 'Log';

    const content = document.createElement('div');
    content.className = 'console-content';
    (values || []).forEach((value, index) => {
      if (index > 0) content.append(document.createTextNode(' '));
      if (value && typeof value === 'object') {
        const details = document.createElement('details');
        details.className = 'console-object';
        const summary = document.createElement('summary');
        const isArray = Array.isArray(value);
        const keys = isArray ? value.length : Object.keys(value).length;
        summary.textContent = isArray ? 'Array(' + keys + ') {…}' : 'Object {…}';
        const pre = document.createElement('pre');
        pre.textContent = formatConsoleValue(value);
        details.append(summary, pre);
        content.append(details);
      } else {
        const item = document.createElement('span');
        item.className = 'console-value ' + (typeof value === 'string' ? 'string-value' : typeof value);
        item.textContent = formatConsoleValue(value);
        content.append(item);
      }
    });

    row.append(marker, content);
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
      previewRuntimeReady = true;
      if (consoleState.textContent === 'Sedang dijalankan…') consoleState.textContent = 'Berjalan';
      while (queuedConsoleCommands.length) {
        const queued = queuedConsoleCommands.shift();
        previewFrame.contentWindow.postMessage(queued, '*');
      }
      return;
    }
    if (data.type === 'console') {
      const level = ['log', 'info', 'warn', 'error'].includes(data.level) ? data.level : 'log';
      appendConsole(level, Array.isArray(data.values) ? data.values : []);
      if (level === 'error') {
        runHadError = true;
        consoleState.textContent = 'Selesai dengan error';
      }
      return;
    }
    if (data.type === 'command-result') {
      const requestId = String(data.requestId || '');
      if (!pendingCommands.has(requestId)) return;
      pendingCommands.delete(requestId);
      if (data.hasValue) appendConsole('result', [data.value]);
      return;
    }
    if (data.type === 'command-error') {
      const requestId = String(data.requestId || '');
      if (!pendingCommands.has(requestId)) return;
      pendingCommands.delete(requestId);
      const detail = data.message || 'Command error';
      appendConsole('error', [data.stack ? detail + '\n' + data.stack : detail]);
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
      previewRuntimeReady = false;
      queuedConsoleCommands.length = 0;
      pendingCommands.clear();
      runHadError = false;
      previewWrap.classList.add('has-content');
      previewEmpty.hidden = true;
      $('#previewState').textContent = 'Memuat preview…';
      previewFrame.srcdoc = buildPreviewDocument(runToken, editors.html.value, editors.css.value, editors.js.value);

    } catch (error) {
      showToast('Format atau eksekusi gagal: ' + (error.message || error));
    } finally {
      runButton.disabled = false;
      runButton.innerHTML = originalLabel;
    }
  }

  function runConsoleCommand(rawCommand) {
    const command = String(rawCommand || '').trim();
    if (!command) return;
    if (!runToken || !previewFrame.contentWindow || !previewWrap.classList.contains('has-content')) {
      appendConsole('warn', ['Jalankan kode di tab Preview terlebih dahulu sebelum menggunakan Console interaktif.']);
      return;
    }
    if (commandHistory[commandHistory.length - 1] !== command) {
      commandHistory.push(command);
      if (commandHistory.length > 100) commandHistory.shift();
    }
    commandHistoryIndex = commandHistory.length;
    appendConsole('command', [command]);
    const requestId = String(++commandCounter);
    pendingCommands.add(requestId);
    const message = {
      channel: CHANNEL,
      token: runToken,
      type: 'command',
      requestId: requestId,
      command: command
    };
    if (previewRuntimeReady) previewFrame.contentWindow.postMessage(message, '*');
    else queuedConsoleCommands.push(message);
    consoleState.textContent = 'Perintah dijalankan';
  }

  function getConsoleCompletionContext() {
    const input = $('#consoleCommandInput');
    const cursor = input.selectionStart;
    const before = input.value.slice(0, cursor);
    const memberMatch = before.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.([A-Za-z_$][\w$]*)?$/);

    if (memberMatch) {
      const objectPath = memberMatch[1];
      const query = memberMatch[2] || '';
      const options = CONSOLE_MEMBER_HINTS[objectPath] || [];
      if (!options.length) return null;
      return {
        query,
        from: cursor - query.length,
        to: cursor,
        candidates: options.map((label) => ({ label, kind: 'property' }))
      };
    }

    const wordMatch = before.match(/([A-Za-z_$][\w$]*)$/);
    if (!wordMatch) return null;
    const query = wordMatch[1];
    const runtimeVariables = [];
    const declarationPattern = /\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
    let declaration;
    while ((declaration = declarationPattern.exec(editors.js.value))) runtimeVariables.push(declaration[1]);

    const candidates = Array.from(new Set(GLOBALS.concat(JS_KEYWORDS, customWords, runtimeVariables)))
      .map((label) => ({ label, kind: JS_KEYWORDS.includes(label) ? 'keyword' : GLOBALS.includes(label) ? 'global' : 'identifier' }));
    return {
      query,
      from: cursor - query.length,
      to: cursor,
      candidates
    };
  }

  function hideConsoleSuggestions() {
    const menu = $('#consoleSuggestions');
    menu.hidden = true;
    menu.replaceChildren();
    consoleSuggestions = [];
    activeConsoleSuggestion = 0;
    consoleSuggestionRange = null;
    $('#consoleCommandInput').setAttribute('aria-expanded', 'false');
  }

  function setActiveConsoleSuggestion(index) {
    if (!consoleSuggestions.length) return;
    activeConsoleSuggestion = (index + consoleSuggestions.length) % consoleSuggestions.length;
    const menu = $('#consoleSuggestions');
    menu.querySelectorAll('.console-suggestion').forEach((item, itemIndex) => {
      item.classList.toggle('active', itemIndex === activeConsoleSuggestion);
      item.setAttribute('aria-selected', String(itemIndex === activeConsoleSuggestion));
    });
    const active = menu.querySelectorAll('.console-suggestion')[activeConsoleSuggestion];
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function applyConsoleSuggestion(index = activeConsoleSuggestion) {
    const suggestion = consoleSuggestions[index];
    if (!suggestion || !consoleSuggestionRange) return;
    const input = $('#consoleCommandInput');
    const { from, to } = consoleSuggestionRange;
    const before = input.value.slice(0, from);
    const after = input.value.slice(to);
    const insertion = suggestion.label;
    input.value = before + insertion + after;
    const cursor = before.length + insertion.length;
    input.focus();
    input.setSelectionRange(cursor, cursor);
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    hideConsoleSuggestions();
  }

  function updateConsoleSuggestions() {
    const menu = $('#consoleSuggestions');
    const input = $('#consoleCommandInput');
    const context = getConsoleCompletionContext();
    if (!context || (!context.query && !input.value.slice(0, input.selectionStart).trim().endsWith('.'))) {
      hideConsoleSuggestions();
      return;
    }

    const query = context.query.toLowerCase();
    const matches = context.candidates
      .filter((item) => item.label.toLowerCase().startsWith(query))
      .sort((a, b) => {
        const aExact = a.label.toLowerCase() === query ? 0 : 1;
        const bExact = b.label.toLowerCase() === query ? 0 : 1;
        return aExact - bExact || a.label.localeCompare(b.label);
      })
      .slice(0, 12);

    if (!matches.length) {
      hideConsoleSuggestions();
      return;
    }

    consoleSuggestions = matches;
    activeConsoleSuggestion = 0;
    consoleSuggestionRange = { from: context.from, to: context.to };
    menu.replaceChildren();

    matches.forEach((suggestion, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'console-suggestion' + (index === 0 ? ' active' : '');
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(index === 0));
      const label = document.createElement('span');
      label.className = 'suggestion-name';
      label.textContent = suggestion.label;
      const kind = document.createElement('span');
      kind.className = 'suggestion-kind';
      kind.textContent = suggestion.kind;
      item.append(label, kind);
      item.addEventListener('mousedown', (event) => event.preventDefault());
      item.addEventListener('click', () => applyConsoleSuggestion(index));
      menu.append(item);
    });

    menu.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function handleConsoleCommandKeydown(event) {
    const input = $('#consoleCommandInput');
    const suggestionsOpen = !$('#consoleSuggestions').hidden;

    if (event.key === 'Escape' && suggestionsOpen) {
      event.preventDefault();
      hideConsoleSuggestions();
      return;
    }
    if (event.key === 'Tab' && suggestionsOpen) {
      event.preventDefault();
      applyConsoleSuggestion();
      return;
    }
    if (event.key === 'ArrowDown' && suggestionsOpen) {
      event.preventDefault();
      setActiveConsoleSuggestion(activeConsoleSuggestion + 1);
      return;
    }
    if (event.key === 'ArrowUp' && suggestionsOpen) {
      event.preventDefault();
      setActiveConsoleSuggestion(activeConsoleSuggestion - 1);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      hideConsoleSuggestions();
      const command = input.value;
      input.value = '';
      input.style.height = 'auto';
      runConsoleCommand(command);
      return;
    }
    if (event.key === 'ArrowUp' && commandHistory.length) {
      const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
      if (atStart || !input.value) {
        event.preventDefault();
        commandHistoryIndex = Math.max(0, commandHistoryIndex - 1);
        input.value = commandHistory[commandHistoryIndex] || '';
        input.setSelectionRange(input.value.length, input.value.length);
        updateConsoleSuggestions();
      }
      return;
    }
    if (event.key === 'ArrowDown' && commandHistory.length) {
      const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
      if (atEnd || !input.value) {
        event.preventDefault();
        commandHistoryIndex = Math.min(commandHistory.length, commandHistoryIndex + 1);
        input.value = commandHistoryIndex === commandHistory.length ? '' : commandHistory[commandHistoryIndex];
        input.setSelectionRange(input.value.length, input.value.length);
        updateConsoleSuggestions();
      }
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
    previewRuntimeReady = false;
    queuedConsoleCommands.length = 0;
    pendingCommands.clear();
    previewWrap.classList.remove('has-content');
    previewEmpty.hidden = false;
    $('#previewState').textContent = 'Belum dijalankan';
    clearConsole();
    consoleState.textContent = 'Menunggu eksekusi';
    showToast('Semua editor berhasil dikosongkan.');
  }

  function selectCurrentLine(cm) {
    const cursor = cm.getCursor();
    const start = { line: cursor.line, ch: 0 };
    const end = { line: cursor.line, ch: cm.getLine(cursor.line).length };
    cm.setSelection(start, end);
  }

  function deleteCurrentLines(cm) {
    const selections = cm.listSelections();
    const fromLine = Math.min(...selections.map((selection) => Math.min(selection.anchor.line, selection.head.line)));
    const toLine = Math.max(...selections.map((selection) => Math.max(selection.anchor.line, selection.head.line)));
    const lastLine = cm.lineCount() - 1;
    const from = { line: fromLine, ch: 0 };
    let to;
    if (toLine < lastLine) to = { line: toLine + 1, ch: 0 };
    else if (fromLine > 0) {
      cm.replaceRange('', { line: fromLine - 1, ch: cm.getLine(fromLine - 1).length }, { line: toLine, ch: cm.getLine(toLine).length }, '+deleteLine');
      cm.setCursor({ line: fromLine - 1, ch: cm.getLine(fromLine - 1).length });
      return;
    } else {
      to = { line: toLine, ch: cm.getLine(toLine).length };
    }
    cm.replaceRange('', from, to, '+deleteLine');
    cm.setCursor({ line: Math.min(fromLine, cm.lineCount() - 1), ch: 0 });
  }

  function duplicateCurrentLines(cm, direction) {
    const selections = cm.listSelections();
    const fromLine = Math.min(...selections.map((selection) => Math.min(selection.anchor.line, selection.head.line)));
    const toLine = Math.max(...selections.map((selection) => Math.max(selection.anchor.line, selection.head.line)));
    const block = [];
    for (let line = fromLine; line <= toLine; line += 1) block.push(cm.getLine(line));
    if (direction < 0 && fromLine === 0) direction = 1;
    const anchorLine = direction < 0 ? fromLine : toLine + 1;
    if (direction < 0) {
      cm.replaceRange(block.join('\n') + '\n', { line: fromLine, ch: 0 }, { line: fromLine, ch: 0 }, '+duplicateLine');
      const duplicateEnd = fromLine + block.length - 1;
      cm.setSelection({ line: fromLine, ch: 0 }, { line: duplicateEnd, ch: cm.getLine(duplicateEnd).length });
    } else {
      const end = { line: toLine, ch: cm.getLine(toLine).length };
      cm.replaceRange('\n' + block.join('\n'), end, end, '+duplicateLine');
      cm.setSelection({ line: anchorLine, ch: 0 }, { line: anchorLine + block.length - 1, ch: block[block.length - 1].length });
    }
  }

  function moveCurrentLines(cm, direction) {
    const selections = cm.listSelections();
    const fromLine = Math.min(...selections.map((selection) => Math.min(selection.anchor.line, selection.head.line)));
    const toLine = Math.max(...selections.map((selection) => Math.max(selection.anchor.line, selection.head.line)));
    const targetLine = fromLine + direction;
    if (targetLine < 0 || targetLine >= cm.lineCount()) return;

    const oldAnchor = cm.getCursor('anchor');
    const oldHead = cm.getCursor('head');
    const lines = [];
    for (let line = 0; line < cm.lineCount(); line += 1) lines.push(cm.getLine(line));
    const block = lines.splice(fromLine, toLine - fromLine + 1);
    lines.splice(direction < 0 ? fromLine - 1 : fromLine + 1, 0, ...block);

    const docEnd = { line: cm.lastLine(), ch: cm.getLine(cm.lastLine()).length };
    cm.replaceRange(lines.join('\n'), { line: 0, ch: 0 }, docEnd, '+moveLine');

    const mapMovedLine = (line) => {
      if (line >= fromLine && line <= toLine) return line + direction;
      if (direction < 0 && line === fromLine - 1) return toLine;
      if (direction > 0 && line === toLine + 1) return fromLine;
      return line;
    };
    const mappedAnchor = mapMovedLine(oldAnchor.line);
    const mappedHead = mapMovedLine(oldHead.line);
    cm.setSelection(
      { line: mappedAnchor, ch: Math.min(oldAnchor.ch, cm.getLine(mappedAnchor).length) },
      { line: mappedHead, ch: Math.min(oldHead.ch, cm.getLine(mappedHead).length) }
    );
  }

  function selectNextOccurrence(cm) {
    let selected = cm.getRange(cm.getCursor('from'), cm.getCursor('to'));
    if (!selected) {
      const cursor = cm.getCursor();
      const token = cm.getTokenAt(cursor);
      selected = token.string.trim();
      if (!selected || !/^[A-Za-z_$][\w$]*$/.test(selected)) return;
      cm.setSelection(
        { line: cursor.line, ch: token.start },
        { line: cursor.line, ch: token.end }
      );
    }
    const current = cm.getCursor('head');
    const doc = cm.getValue();
    const absolute = cm.indexFromPos(current);
    const findAt = (start) => {
      const index = doc.indexOf(selected, start);
      if (index < 0) return null;
      const before = index > 0 ? doc[index - 1] : '';
      const after = doc[index + selected.length] || '';
      if (/\w/.test(selected[0]) && /[\w$]/.test(before)) return findAt(index + 1);
      if (/\w/.test(selected[selected.length - 1]) && /[\w$]/.test(after)) return findAt(index + 1);
      return index;
    };
    let found = findAt(absolute);
    if (found === null) found = findAt(0);
    if (found === null) return;
    const from = cm.posFromIndex(found);
    const to = cm.posFromIndex(found + selected.length);
    const ranges = cm.listSelections().map((item) => ({ anchor: item.anchor, head: item.head }));
    ranges.push({ anchor: from, head: to });
    cm.setSelections(ranges, ranges.length - 1);
  }

  function indentSelection(cm, direction) {
    if (cm.somethingSelected()) cm.execCommand(direction > 0 ? 'indentMore' : 'indentLess');
    else if (direction > 0) cm.replaceSelection('  ', 'end');
    else cm.execCommand('indentLess');
  }

  function toggleCurrentComment(cm) {
    if (CodeMirror.commands.toggleComment) {
      CodeMirror.commands.toggleComment(cm);
      return;
    }
    showToast('Fitur comment belum termuat. Periksa koneksi internet.');
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
        'Ctrl-S': (cm) => { saveWorkspace(); showToast('Kode disimpan di browser.'); },
        'Cmd-S': (cm) => { saveWorkspace(); showToast('Kode disimpan di browser.'); },
        'Shift-Alt-F': formatActiveEditor,
        'Cmd-Shift-F': formatActiveEditor,
        'Ctrl-/': toggleCurrentComment,
        'Cmd-/': toggleCurrentComment,
        'Ctrl-G': 'jumpToLine',
        'Ctrl-Y': 'redo',
        'Ctrl-Shift-Z': 'redo',
        'Cmd-Shift-Z': 'redo',
        'Ctrl-[': (cm) => cm.execCommand('indentLess'),
        'Ctrl-]': (cm) => cm.execCommand('indentMore'),
        'Ctrl-L': selectCurrentLine,
        'Ctrl-D': selectNextOccurrence,
        'Ctrl-Shift-K': deleteCurrentLines,
        'Alt-Up': (cm) => moveCurrentLines(cm, -1),
        'Alt-Down': (cm) => moveCurrentLines(cm, 1),
        'Shift-Alt-Up': (cm) => duplicateCurrentLines(cm, -1),
        'Shift-Alt-Down': (cm) => duplicateCurrentLines(cm, 1),
        'Tab': (cm) => indentSelection(cm, 1),
        'Shift-Tab': (cm) => indentSelection(cm, -1)
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
  $('#consoleCommandForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('#consoleCommandInput');
    const command = input.value;
    input.value = '';
    input.style.height = 'auto';
    runConsoleCommand(command);
  });
  $('#consoleCommandInput').addEventListener('keydown', handleConsoleCommandKeydown);
  $('#consoleCommandInput').addEventListener('input', (event) => {
    event.currentTarget.style.height = 'auto';
    event.currentTarget.style.height = Math.min(event.currentTarget.scrollHeight, 120) + 'px';
    updateConsoleSuggestions();
  });
  $('#consoleCommandInput').addEventListener('click', updateConsoleSuggestions);
  $('#consoleCommandInput').addEventListener('keyup', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) updateConsoleSuggestions();
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.console-command-form')) hideConsoleSuggestions();
  });
  $('#problemsToggle').addEventListener('click', () => toggleProblems());
  $('#closeProblemsBtn').addEventListener('click', () => toggleProblems(false));
  document.querySelectorAll('.editor-tab').forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab));
  });
  window.addEventListener('message', handlePreviewMessage);

  restoreWorkspace();
  initializeCodeMirror();
  updateEditorStats();
  renderProblems([]);
  setEnvironmentTab('preview');
  if (!linter) {
    $('#problemsToggle').title = 'ESLint belum termuat. Periksa koneksi internet.';
  }
})();