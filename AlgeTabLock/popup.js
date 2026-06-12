// Elementos principais da tela inicial e dos controles de proteção.
const tabLockBtn = document.getElementById("tabLockBtn");
const groupLockBtn = document.getElementById("groupLockBtn");
const statusText = document.getElementById("status");
const statusDescription = document.getElementById("statusDescription");
const statusRow = document.getElementById("statusRow");
const statusIcon = document.getElementById("statusIcon");
const tabTitle = document.getElementById("tabTitle");
const tabUrl = document.getElementById("tabUrl");
const tabIcon = document.getElementById("tabIcon");
const tabFallbackIcon = document.getElementById("tabFallbackIcon");
const tabLockTitle = document.getElementById("tabLockTitle");
const tabLockDescription = document.getElementById("tabLockDescription");
const groupLockTitle = document.getElementById("groupLockTitle");
const groupLockDescription = document.getElementById("groupLockDescription");

let currentTab = null;

// Busca a aba atualmente ativa na janela em foco.
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tab;
}

// Lê o título do grupo para exibir textos mais amigáveis na interface.
async function getGroupTitle(groupId) {
  if (groupId === -1) return null;

  try {
    const group = await chrome.tabGroups.get(groupId);
    return group.title || "Grupo protegido";
  } catch {
    return "Grupo protegido";
  }
}

// Extrai o host apenas para montar textos e fallback visual.
function getHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// Atualiza o card da aba atual com título, URL e favicon.
function setCurrentTabUI(tab) {
  const host = getHost(tab.url);

  tabTitle.textContent = tab.title || host || "Guia atual";
  tabUrl.textContent = tab.url || "";

  if (tab.favIconUrl) {
    tabIcon.src = tab.favIconUrl;
    tabIcon.parentElement.classList.add("has-image");
    return;
  }

  tabIcon.removeAttribute("src");
  tabIcon.parentElement.classList.remove("has-image");
  tabFallbackIcon.textContent = host ? host.charAt(0).toUpperCase() : "\u25CE";
}

// Ajusta o botão de proteção da aba conforme o estado salvo.
function setTabLockedUI(locked) {
  tabLockBtn.classList.toggle("unlock", !!locked);
  tabLockBtn.setAttribute("aria-pressed", String(!!locked));

  if (locked) {
    tabLockTitle.textContent = "Guia travada";
    tabLockDescription.textContent = "Esta guia está protegida contra fechamento e alterações.";
    return;
  }

  tabLockTitle.textContent = "Travar esta guia";
  tabLockDescription.textContent = "Impede que a guia seja fechada ou tenha a URL alterada.";
}

// Ajusta o botão de proteção de grupo e trata o caso em que a aba não pertence a grupo.
function setGroupLockedUI(locked, hasGroup) {
  groupLockBtn.disabled = !hasGroup;
  groupLockBtn.classList.toggle("unlock", !!locked && hasGroup);
  groupLockBtn.setAttribute("aria-pressed", String(!!locked && hasGroup));

  if (!hasGroup) {
    groupLockTitle.textContent = "Guia sem grupo";
    groupLockDescription.textContent = "Coloque esta guia em um grupo para ativar esta proteção.";
    return;
  }

  if (locked) {
    groupLockTitle.textContent = "Grupo travado";
    groupLockDescription.textContent = "Este grupo está protegido contra fechamento.";
    return;
  }

  groupLockTitle.textContent = "Travar grupo desta guia";
  groupLockDescription.textContent = "Impede que o grupo seja fechado e suas guias sejam perdidas.";
}

// Atualiza o resumo visual do estado geral de proteção.
function setProtectionStatus(response) {
  const tabLocked = !!response?.tabLocked;
  const groupLocked = !!response?.groupLocked;
  const active = tabLocked || groupLocked;

  statusRow.classList.toggle("active", active);
  statusIcon.classList.toggle("active", active);

  if (response?.error) {
    statusText.textContent = "Falha ao verificar";
    statusDescription.textContent = response.message || "Não foi possível verificar a proteção.";
  } else if (tabLocked && groupLocked) {
    statusText.textContent = "Proteção ativa";
    statusDescription.textContent = "Esta guia e seu grupo estão protegidos.";
  } else if (tabLocked) {
    statusText.textContent = "Guia protegida";
    statusDescription.textContent = "Esta guia será restaurada se for fechada.";
  } else if (groupLocked) {
    statusText.textContent = "Grupo protegido";
    statusDescription.textContent = "Este grupo será restaurado se for fechado.";
  } else {
    statusText.textContent = "Nenhuma proteção ativa";
    statusDescription.textContent = "Suas guias e grupos estão desprotegidos.";
  }
}

// Aplica em um único passo o estado dos botões e o status geral.
function setStatus(response, hasGroup) {
  setTabLockedUI(response?.tabLocked);
  setGroupLockedUI(response?.groupLocked, hasGroup);
  setProtectionStatus(response);
}

// Destaca o botão de atualizar enquanto a verificação do estado está em andamento.
function setRefreshButtonLoading(loading) {
  if (!refreshStatusBtn) return;

  refreshStatusBtn.classList.toggle('is-loading', loading);
  refreshStatusBtn.disabled = loading;
}

// Sincroniza o popup com a aba atual e pergunta ao background qual é o estado salvo.
async function updateStatus() {
  currentTab = await getCurrentTab();
  setCurrentTabUI(currentTab);

  await new Promise(resolve => {
    chrome.runtime.sendMessage(
      {
        action: "checkStatus",
        tabId: currentTab.id,
        groupId: currentTab.groupId
      },
      response => {
        if (chrome.runtime.lastError) {
          setProtectionStatus({
            error: true,
            message: "Não foi possível conversar com o background."
          });
          resolve();
          return;
        }

        setStatus(response, currentTab.groupId !== -1);
        resolve();
      }
    );
  });
}

// Alterna a proteção individual da aba em foco.
tabLockBtn.addEventListener("click", async () => {
  currentTab = await getCurrentTab();

  chrome.runtime.sendMessage(
    {
      action: "toggleTabLock",
      tabId: currentTab.id,
      url: currentTab.url,
      title: currentTab.title,
      groupId: currentTab.groupId
    },
    () => updateStatus()
  );
});

// Alterna a proteção do grupo da aba em foco.
groupLockBtn.addEventListener("click", async () => {
  currentTab = await getCurrentTab();

  const groupTitle = await getGroupTitle(currentTab.groupId);

  chrome.runtime.sendMessage(
    {
      action: "toggleGroupLock",
      groupId: currentTab.groupId,
      groupTitle
    },
    () => updateStatus()
  );
});

// Carrega o estado assim que o popup é aberto.
updateStatus();

// Navegação entre as páginas internas do popup.
const navItems = Array.from(document.querySelectorAll('.nav-item'));
const pageIds = ['page-home', 'page-protections', 'page-history', 'page-settings', 'page-about', 'page-help'];
const pages = pageIds.map(id => document.getElementById(id));
const locksList = document.getElementById('locksList');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const refreshStatusBtn = document.getElementById('refreshStatusBtn');
const showProtectionsBtn = document.getElementById('showProtectionsBtn');
const backHomeBtn = document.getElementById('backHomeBtn');
const footerSettingsBtn = document.querySelector('.settings-btn');
const moreBtn = document.querySelector('.more-btn');
const moreMenu = document.querySelector('.more-menu');
const moreDropdown = document.getElementById('moreDropdown');
const moreDropdownItems = Array.from(document.querySelectorAll('.more-dropdown-item'));
const themeToggleBtn = document.getElementById('themeToggleBtn');

const THEME_STORAGE_KEY = 'popupTheme';

// Aplica o tema visual no popup e atualiza o estado do botão lateral.
function applyTheme(theme) {
  const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = resolvedTheme;

  if (!themeToggleBtn) return;

  const isDark = resolvedTheme === 'dark';
  themeToggleBtn.classList.toggle('active', isDark);
  themeToggleBtn.setAttribute('aria-pressed', String(isDark));
  themeToggleBtn.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
  themeToggleBtn.title = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';
}

// Carrega a preferência salva anteriormente para manter o mesmo tema entre aberturas.
async function loadThemePreference() {
  try {
    const data = await chrome.storage.local.get([THEME_STORAGE_KEY]);
    applyTheme(data?.[THEME_STORAGE_KEY]);
  } catch {
    applyTheme('light');
  }
}

// Alterna o tema atual e persiste a escolha no armazenamento local da extensão.
async function toggleTheme() {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);

  try {
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: nextTheme });
  } catch {
    // Se a persistência falhar, o tema visual atual continua aplicado nesta abertura.
  }
}

// Controla qual página interna fica visível e aciona renderizações sob demanda.
function showPage(id) {
  pages.forEach(p => p && p.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  toggleMoreMenu(false);

  navItems.forEach((btn, idx) => {
    btn.classList.toggle('active', pageIds[idx] === id);
  });

  if (id === 'page-protections') renderLocks();
  if (id === 'page-history') renderHistory();
}

function toggleMoreMenu(forceOpen) {
  if (!moreMenu || !moreBtn || !moreDropdown) return;

  const shouldOpen = typeof forceOpen === 'boolean'
    ? forceOpen
    : !moreMenu.classList.contains('open');

  moreMenu.classList.toggle('open', shouldOpen);
  moreBtn.setAttribute('aria-expanded', String(shouldOpen));
}

// Liga os botões laterais às páginas equivalentes do painel.
navItems.forEach((btn, idx) => {
  btn.addEventListener('click', () => showPage(pageIds[idx]));
});

// Recarrega o estado da aba atual manualmente.
if (refreshStatusBtn) {
  refreshStatusBtn.addEventListener('click', async () => {
    setRefreshButtonLoading(true);

    try {
      await updateStatus();
    } finally {
      setRefreshButtonLoading(false);
    }
  });
}

// Atalho de ajustes para a lista de proteções ativas.
if (showProtectionsBtn) {
  showProtectionsBtn.addEventListener('click', () => {
    showPage('page-protections');
  });
}

// Retorna para a página inicial e atualiza os dados mostrados.
if (backHomeBtn) {
  backHomeBtn.addEventListener('click', () => {
    showPage('page-home');
    updateStatus();
  });
}

// Limpa o histórico salvo no background e redesenha a lista.
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clearHistory' }, () => {
      renderHistory();
    });
  });
}

// Botão fixo do rodapé que leva para a página de ajustes.
if (footerSettingsBtn) {
  footerSettingsBtn.addEventListener('click', () => showPage('page-settings'));
}

// Botão de mais opções abre um pequeno menu com páginas institucionais.
if (moreBtn) {
  moreBtn.addEventListener('click', event => {
    event.stopPropagation();
    toggleMoreMenu();
  });
}

if (moreDropdown) {
  moreDropdown.addEventListener('click', event => {
    event.stopPropagation();
  });
}

moreDropdownItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetPage = item.dataset.pageTarget;
    if (targetPage) showPage(targetPage);
  });
});

document.addEventListener('click', event => {
  if (!moreMenu || moreMenu.contains(event.target)) return;
  toggleMoreMenu(false);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    toggleMoreMenu(false);
  }
});

// Alterna manualmente entre o tema claro padrão e o modo escuro do popup.
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    toggleTheme();
  });
}

// Monta a lista de abas e grupos atualmente protegidos.
function renderLocks() {
  if (!locksList) return;

  showEmpty(locksList, 'Carregando...');

  chrome.runtime.sendMessage({ action: 'getLocks' }, response => {
    if (chrome.runtime.lastError || response?.error) {
      showEmpty(locksList, 'Erro ao carregar proteções.');
      return;
    }

    const { lockedTabs = {}, lockedGroups = {} } = response;

    const items = [];

    // Abas protegidas individualmente.
    for (const key of Object.keys(lockedTabs)) {
      const item = lockedTabs[key];
      items.push({ type: 'tab', id: key, title: item.title || item.url || 'Guia protegida', url: item.url });
    }

    // Grupos protegidos com seu título salvo.
    for (const key of Object.keys(lockedGroups)) {
      const item = lockedGroups[key];
      items.push({ type: 'group', id: key, title: item.title || 'Grupo protegido' });
    }

    if (items.length === 0) {
      showEmpty(locksList, 'Nenhuma proteção ativa.');
      return;
    }

    locksList.textContent = '';

    // Cada linha inclui um botão para remover a proteção diretamente do painel.
    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'lock-item';

      const meta = document.createElement('div');
      meta.className = 'lock-meta';
      const strong = document.createElement('strong');
      strong.textContent = it.title;
      const small = document.createElement('span');
      small.textContent = it.type === 'tab' ? it.url || '' : 'Grupo protegido';
      meta.appendChild(strong);
      meta.appendChild(small);

      const actions = document.createElement('div');
      actions.className = 'lock-actions';
      const btn = document.createElement('button');
      btn.textContent = 'Destravar';
      btn.addEventListener('click', () => {
        if (it.type === 'tab') {
          chrome.runtime.sendMessage({ action: 'toggleTabLock', tabId: Number(it.id) }, () => {
            renderLocks();
            updateStatus();
          });
        } else {
          chrome.runtime.sendMessage({ action: 'toggleGroupLock', groupId: Number(it.id) }, () => {
            renderLocks();
            updateStatus();
          });
        }
      });

      actions.appendChild(btn);

      row.appendChild(meta);
      row.appendChild(actions);

      locksList.appendChild(row);
    }
  });
}

// Exibe mensagens vazias ou estados de carregamento nas listas do popup.
function showEmpty(container, text) {
  container.textContent = '';

  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.textContent = text;

  container.appendChild(empty);
}

// Formata a data do histórico no padrão local pt-BR.
function formatHistoryDate(value) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return '';
  }
}

// Monta a lista de eventos recentes de proteção, bloqueio e restauração.
function renderHistory() {
  if (!historyList) return;

  showEmpty(historyList, 'Carregando...');

  chrome.runtime.sendMessage({ action: 'getHistory' }, response => {
    if (chrome.runtime.lastError || response?.error) {
      showEmpty(historyList, 'Erro ao carregar histórico.');
      return;
    }

    const history = Array.isArray(response?.history) ? response.history : [];

    if (history.length === 0) {
      showEmpty(historyList, 'Nenhum item no histórico.');
      return;
    }

    historyList.textContent = '';

    // Cada item mostra tipo de evento, descrição e momento em que ocorreu.
    for (const item of history) {
      const row = document.createElement('div');
      row.className = 'history-item';

      const icon = document.createElement('span');
      icon.className = `history-icon ${item.type || 'event'}`;
      icon.textContent = item.type === 'restore' ? '\u21BB' : item.type === 'blocked' ? '!' : item.type === 'unlock' ? '\u25CB' : '\u2713';

      const meta = document.createElement('div');
      meta.className = 'history-meta';

      const strong = document.createElement('strong');
      strong.textContent = item.title || 'Evento';

      const small = document.createElement('span');
      const when = formatHistoryDate(item.date);
      small.textContent = [item.detail || '', when].filter(Boolean).join(' - ');

      meta.appendChild(strong);
      meta.appendChild(small);
      row.appendChild(icon);
      row.appendChild(meta);
      historyList.appendChild(row);
    }
  });
}

// Exibe a página inicial como primeira tela do popup.
showPage('page-home');
loadThemePreference();
