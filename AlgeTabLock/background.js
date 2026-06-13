// Centraliza o estado persistido da extensão.
// lockedTabs: abas protegidas individualmente.
// lockedGroups: grupos protegidos com suas abas salvas.
// history: eventos recentes exibidos no popup.
async function getData() {
  const data = await chrome.storage.local.get(["lockedTabs", "lockedGroups", "history"]);

  return {
    lockedTabs: data.lockedTabs || {},
    lockedGroups: data.lockedGroups || {},
    history: Array.isArray(data.history) ? data.history : []
  };
}

// Salva o estado atual no armazenamento local.
// O histórico é opcional e fica limitado aos itens mais recentes.
async function saveData(lockedTabs, lockedGroups, history) {
  const payload = {
    lockedTabs,
    lockedGroups
  };

  if (Array.isArray(history)) {
    payload.history = history.slice(0, 40);
  }

  await chrome.storage.local.set(payload);
}

// Registra um evento no histórico mostrado no painel da extensão.
async function addHistory(type, title, detail) {
  const { lockedTabs, lockedGroups, history } = await getData();
  const item = {
    type,
    title: title || "Evento",
    detail: detail || "",
    date: new Date().toISOString()
  };

  await saveData(lockedTabs, lockedGroups, [item, ...history].slice(0, 40));
}

// Aceita apenas URLs navegáveis e seguras para evitar restaurações indevidas.
function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Cria uma nova aba somente quando a URL salva for considerada segura.
async function safeCreateTab(url, options = {}) {
  if (!isSafeUrl(url)) {
    await addHistory("blocked", "URL bloqueada", "A extensão impediu a restauração de uma URL insegura.");
    return null;
  }

  return chrome.tabs.create({
    ...options,
    url
  });
}

// Limpa apenas o histórico, preservando as proteções ativas.
async function clearHistory() {
  const { lockedTabs, lockedGroups } = await getData();

  await chrome.storage.local.set({
    lockedTabs,
    lockedGroups,
    history: []
  });
}

// Pequena espera usada para sincronizar eventos do navegador.
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Atualiza o snapshot do grupo quando uma guia protegida navega livremente.
function updateGroupTabSnapshot(lockedGroups, groupId, tabId, url, title, matchTabId = tabId, matchUrl = url, windowId, index) {
  const group = lockedGroups[String(groupId)];
  if (!group || !Array.isArray(group.tabs)) return;

  const item = group.tabs.find(tab => String(tab.tabId) === String(matchTabId)) ||
    group.tabs.find(tab => tab.url === matchUrl);
  if (!item) return;

  item.tabId = tabId;
  item.url = url;
  item.title = title || item.title || "Guia protegida";
  if (typeof windowId !== "undefined") item.windowId = windowId;
  if (typeof index !== "undefined") item.index = index;
}

// Confirma se um grupo ainda existe antes de tentar reutilizá-lo.
async function groupExists(groupId) {
  if (groupId === -1 || typeof groupId === "undefined") return false;

  try {
    await chrome.tabGroups.get(Number(groupId));
    return true;
  } catch {
    return false;
  }
}

// Garante a estrutura básica do armazenamento na instalação da extensão.
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(["lockedTabs", "lockedGroups", "history"]);

  await chrome.storage.local.set({
    lockedTabs: data.lockedTabs || {},
    lockedGroups: data.lockedGroups || {},
    history: Array.isArray(data.history) ? data.history : []
  });
});

// Ponte de comunicação entre o popup e o service worker.
// Cada action abaixo representa uma operação da interface.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const { lockedTabs, lockedGroups } = await getData();

      // Informa ao popup se a aba atual ou seu grupo já estão protegidos.
      if (message.action === "checkStatus") {
        const tabId = String(message.tabId);
        const groupId = String(message.groupId);

        sendResponse({
          tabLocked: !!lockedTabs[tabId],
          groupLocked: message.groupId !== -1 && !!lockedGroups[groupId]
        });

        return;
      }

      // Alterna a proteção da aba atual.
      if (message.action === "toggleTabLock") {
        const tabId = String(message.tabId);

        // Se já estiver protegida, apenas remove o registro salvo.
        if (lockedTabs[tabId]) {
          const saved = lockedTabs[tabId];
          delete lockedTabs[tabId];

          await saveData(lockedTabs, lockedGroups);
          await addHistory("unlock", "Guia destravada", saved.title || saved.url || "");

          sendResponse({ locked: false });
          return;
        }

        // Só permite travar abas com URL válida para restauração futura.
        if (!isSafeUrl(message.url)) {
          sendResponse({
            error: true,
            message: "URL insegura ou inválida."
          });
          return;
        }

        lockedTabs[tabId] = {
          tabId: message.tabId,
          url: message.url,
          title: message.title || "Guia protegida",
          groupId: typeof message.groupId !== 'undefined' ? message.groupId : -1,
          windowId: message.windowId,
          index: message.index
        };

        await saveData(lockedTabs, lockedGroups);
        await addHistory("lock", "Guia travada", lockedTabs[tabId].title);

        sendResponse({ locked: true });
        return;
      }

      // Alterna a proteção do grupo inteiro da aba atual.
      if (message.action === "toggleGroupLock") {
        if (message.groupId === -1) {
          sendResponse({
            error: true,
            message: "Esta guia não está em um grupo."
          });

          return;
        }

        const groupId = String(message.groupId);

        // Ao destravar o grupo, remove o registro do grupo e das abas vinculadas.
        if (lockedGroups[groupId]) {
          const savedGroup = lockedGroups[groupId];
          delete lockedGroups[groupId];

          for (const k of Object.keys(lockedTabs)) {
            const entry = lockedTabs[k];
            if (entry && String(entry.groupId) === String(message.groupId)) {
              delete lockedTabs[k];
            }
          }

          await saveData(lockedTabs, lockedGroups);
          await addHistory("unlock", "Grupo destravado", savedGroup.title || "Grupo protegido");

          sendResponse({ locked: false });
          return;
        }

        // Lê todas as abas do grupo para salvar um snapshot restaurável.
        const tabs = await chrome.tabs.query({
          groupId: message.groupId
        });

        // Mantém apenas abas com URLs que podem ser restauradas com segurança.
        const safeTabs = tabs.filter(tab => isSafeUrl(tab.url));

        if (safeTabs.length === 0) {
          sendResponse({
            error: true,
            message: "Nenhuma guia segura para proteger neste grupo."
          });
          return;
        }

        lockedGroups[groupId] = {
          title: message.groupTitle || "Grupo protegido",
          color: message.groupColor,
          tabs: safeTabs.map(tab => ({
            tabId: tab.id,
            url: tab.url,
            title: tab.title || "Guia protegida",
            windowId: tab.windowId,
            index: tab.index
          }))
        };

        for (const tab of safeTabs) {
          lockedTabs[String(tab.id)] = {
            tabId: tab.id,
            url: tab.url,
            title: tab.title || "Guia protegida",
            groupId: message.groupId,
            windowId: tab.windowId,
            index: tab.index
          };
        }

        await saveData(lockedTabs, lockedGroups);
        await addHistory("lock", "Grupo travado", lockedGroups[groupId].title);

        sendResponse({ locked: true });
        return;
      }

      // Retorna todas as proteções ativas para montar a tela de lista.
      if (message.action === "getLocks") {
        sendResponse({ lockedTabs, lockedGroups });
        return;
      }

      // Retorna o histórico de eventos mostrado no popup.
      if (message.action === "getHistory") {
        const data = await getData();
        sendResponse({ history: data.history });
        return;
      }

      // Limpa o histórico sob demanda.
      if (message.action === "clearHistory") {
        await clearHistory();
        sendResponse({ cleared: true });
        return;
      }

      sendResponse({
        error: true,
        message: "Ação desconhecida."
      });
    } catch (error) {
      console.error("Erro no background:", error);

      sendResponse({
        error: true,
        message: error.message
      });
    }
  })();

  return true;
});

// Quando uma aba protegida é fechada, a extensão tenta recriá-la automaticamente.
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    const { lockedTabs, lockedGroups } = await getData();
    const key = String(tabId);

    if (!lockedTabs[key]) return;

    const saved = lockedTabs[key];

    delete lockedTabs[key];

    // Se a aba pertencia a um grupo protegido, espera um pouco para entender
    // se o grupo inteiro foi removido ou se foi apenas uma aba isolada.
    if (
      typeof saved.groupId !== "undefined" &&
      saved.groupId !== -1 &&
      lockedGroups[String(saved.groupId)]
    ) {
      await wait(250);

      if (!await groupExists(saved.groupId)) {
        const latestData = await getData();
        delete latestData.lockedTabs[key];
        await saveData(latestData.lockedTabs, latestData.lockedGroups);
        return;
      }
    }

    const createOptions = {
      active: true,
      windowId: saved.windowId || removeInfo.windowId
    };

    if (typeof saved.index === "number") {
      createOptions.index = saved.index;
    }

    const newTab = await safeCreateTab(saved.url, createOptions);

    if (!newTab) {
      await saveData(lockedTabs, lockedGroups);
      return;
    }

    // Tenta recolocar a aba restaurada no grupo original, quando ele ainda existe.
    if (typeof saved.groupId !== 'undefined' && saved.groupId !== -1) {
      try {
        await chrome.tabs.group({ groupId: Number(saved.groupId), tabIds: newTab.id });
      } catch (err) {
        // A falha aqui é aceitável quando o grupo original já não existe mais.
      }
    }

    // Reassocia o registro salvo ao novo ID gerado para a aba restaurada.
    const previousTabId = saved.tabId || tabId;
    saved.tabId = newTab.id;
    saved.windowId = newTab.windowId;
    saved.index = newTab.index;
    lockedTabs[String(newTab.id)] = saved;
    updateGroupTabSnapshot(lockedGroups, saved.groupId, newTab.id, saved.url, saved.title, previousTabId, saved.url, saved.windowId, saved.index);

    await saveData(lockedTabs, lockedGroups);
    await addHistory("restore", "Guia restaurada", saved.title || saved.url || "");
  } catch (error) {
    console.error("Erro ao restaurar guia:", error);
  }
});

// A guia travada continua navegando livremente; salvamos a ultima URL segura visitada.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (!changeInfo.url && !changeInfo.title && !changeInfo.status) return;

    const { lockedTabs, lockedGroups } = await getData();
    const tabKey = String(tabId);
    const saved = lockedTabs[tabKey];

    if (!saved) return;

    let changed = false;
    const previousUrl = saved.url;
    const currentUrl = changeInfo.url || tab.url;

    if (currentUrl && isSafeUrl(currentUrl) && currentUrl !== saved.url) {
      saved.url = currentUrl;
      changed = true;
    }

    const nextTitle = tab.title || changeInfo.title;
    if (nextTitle && nextTitle !== saved.title) {
      saved.title = nextTitle;
      changed = true;
    }

    if (typeof tab.groupId !== "undefined" && tab.groupId !== saved.groupId) {
      saved.groupId = tab.groupId;
      changed = true;
    }

    if (typeof tab.windowId !== "undefined" && tab.windowId !== saved.windowId) {
      saved.windowId = tab.windowId;
      changed = true;
    }

    if (typeof tab.index !== "undefined" && tab.index !== saved.index) {
      saved.index = tab.index;
      changed = true;
    }

    if (!changed) return;

    saved.tabId = tabId;
    lockedTabs[tabKey] = saved;
    updateGroupTabSnapshot(lockedGroups, saved.groupId, tabId, saved.url, saved.title, tabId, previousUrl, saved.windowId, saved.index);

    await saveData(lockedTabs, lockedGroups);
  } catch (error) {
    console.error("Erro ao atualizar guia protegida:", error);
  }
});

// Se a guia travada for movida, restaura depois na nova posicao.
chrome.tabs.onMoved.addListener(async (tabId, moveInfo) => {
  try {
    const { lockedTabs, lockedGroups } = await getData();
    const tabKey = String(tabId);
    const saved = lockedTabs[tabKey];

    if (!saved) return;

    saved.windowId = moveInfo.windowId;
    saved.index = moveInfo.toIndex;
    lockedTabs[tabKey] = saved;
    updateGroupTabSnapshot(lockedGroups, saved.groupId, tabId, saved.url, saved.title, tabId, saved.url, saved.windowId, saved.index);

    await saveData(lockedTabs, lockedGroups);
  } catch (error) {
    console.error("Erro ao atualizar posicao da guia protegida:", error);
  }
});

// Quando um grupo protegido é removido, a extensão reconstrói o grupo e restaura as abas.
if (chrome.tabGroups && chrome.tabGroups.onRemoved) {
  chrome.tabGroups.onRemoved.addListener(async (group) => {
    try {
      const { lockedTabs, lockedGroups } = await getData();
      const groupKey = String(group.id);

      if (!lockedGroups[groupKey]) return;

      const savedGroup = lockedGroups[groupKey];
      const reusableTabs = [];

      for (const k of Object.keys(lockedTabs)) {
        const entry = lockedTabs[k];

        if (!entry || String(entry.groupId) !== groupKey) continue;

        try {
          const tab = await chrome.tabs.get(Number(k));

          if (tab && tab.id && tab.url === entry.url) {
            reusableTabs.push({
              id: tab.id,
              url: tab.url
            });
          }
        } catch {
          // A aba foi realmente fechada e precisará ser recriada depois.
        }
      }

      // Remove locks antigos do grupo para evitar restaurações duplicadas.
      const groupUrls = (savedGroup.tabs || []).map(t => t.url);
      for (const k of Object.keys(lockedTabs)) {
        const entry = lockedTabs[k];
        if (
          entry &&
          (
            String(entry.groupId) === groupKey ||
            groupUrls.includes(entry.url)
          )
        ) {
          delete lockedTabs[k];
        }
      }

      delete lockedGroups[groupKey];

      const createdTabs = [];

      // Reaproveita abas ainda abertas quando possível e recria as faltantes.
      for (const item of savedGroup.tabs) {
        const reusableIndex = reusableTabs.findIndex(tab => tab.url === item.url);

        if (reusableIndex !== -1) {
          const [tab] = reusableTabs.splice(reusableIndex, 1);
          createdTabs.push(tab.id);
          continue;
        }

        const tab = await safeCreateTab(item.url, {
          active: false
        });

        if (!tab) continue;

        createdTabs.push(tab.id);
      }

      if (createdTabs.length > 0) {
        const newGroupId = await chrome.tabs.group({
          tabIds: createdTabs
        });

        // Recria o grupo com título original e remapeia os IDs atuais das abas.
        const groupUpdate = {
          title: savedGroup.title,
          collapsed: false
        };

        if (savedGroup.color) {
          groupUpdate.color = savedGroup.color;
        }

        await chrome.tabGroups.update(newGroupId, groupUpdate);

        lockedGroups[String(newGroupId)] = savedGroup;

        createdTabs.forEach((tabId, index) => {
          const item = savedGroup.tabs[index];
          item.tabId = tabId;
          lockedTabs[String(tabId)] = {
            tabId,
            url: item.url,
            title: item.title || "Guia protegida",
            groupId: newGroupId,
            windowId: item.windowId,
            index: item.index
          };
        });
      }

      await saveData(lockedTabs, lockedGroups);
      await addHistory("restore", "Grupo restaurado", savedGroup.title || "Grupo protegido");
    } catch (error) {
      console.error("Erro ao restaurar grupo:", error);
    }
  });
}
