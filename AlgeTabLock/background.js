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

// Reverte a navegação de uma aba protegida para a URL original.
async function safeUpdateTab(tabId, url) {
  if (!isSafeUrl(url)) {
    await addHistory("blocked", "URL bloqueada", "A extensão impediu a navegação para uma URL insegura.");
    return;
  }

  await chrome.tabs.update(tabId, { url });
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
          url: message.url,
          title: message.title || "Guia protegida",
          groupId: typeof message.groupId !== 'undefined' ? message.groupId : -1
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
          tabs: safeTabs.map(tab => ({
            url: tab.url,
            title: tab.title || "Guia protegida"
          }))
        };

        for (const tab of safeTabs) {
          lockedTabs[String(tab.id)] = {
            url: tab.url,
            title: tab.title || "Guia protegida",
            groupId: message.groupId
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
chrome.tabs.onRemoved.addListener(async (tabId) => {
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

    const newTab = await safeCreateTab(saved.url, {
      active: true
    });

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
    lockedTabs[String(newTab.id)] = saved;

    await saveData(lockedTabs, lockedGroups);
    await addHistory("restore", "Guia restaurada", saved.title || saved.url || "");
  } catch (error) {
    console.error("Erro ao restaurar guia:", error);
  }
});

// Impede mudanças de URL em abas ou grupos protegidos.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    const { lockedTabs, lockedGroups } = await getData();
    const tabKey = String(tabId);

    // Abas travadas sempre voltam para a URL originalmente salva.
    if (lockedTabs[tabKey]) {
      const originalUrl = lockedTabs[tabKey].url;

      if (changeInfo.url && changeInfo.url !== originalUrl) {
        await safeUpdateTab(tabId, originalUrl);

        return;
      }
    }

    // Grupos travados aceitam apenas as URLs que fazem parte do snapshot salvo.
    if (tab.groupId !== -1 && lockedGroups[String(tab.groupId)]) {
      const group = lockedGroups[String(tab.groupId)];
      const allowedUrls = group.tabs.map(item => item.url);

      if (changeInfo.url && !allowedUrls.includes(changeInfo.url)) {
        await safeUpdateTab(tabId, allowedUrls[0]);
      }
    }
  } catch (error) {
    console.error("Erro ao verificar URL:", error);
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
        await chrome.tabGroups.update(newGroupId, {
          title: savedGroup.title,
          collapsed: false
        });

        lockedGroups[String(newGroupId)] = savedGroup;

        createdTabs.forEach((tabId, index) => {
          const item = savedGroup.tabs[index];
          lockedTabs[String(tabId)] = {
            url: item.url,
            title: item.title || "Guia protegida",
            groupId: newGroupId
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
