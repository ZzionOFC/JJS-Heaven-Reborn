let audioCtx = null;

// INICIO: tocarSomClique
function tocarSomClique() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'square';

    osc.frequency.setValueAtTime(350, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.03);

    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch (e) {}
}
// FIM: tocarSomClique
const conteudo = document.getElementById("conteudo"),
  campoPesquisa = document.getElementById("campoPesquisa"),
  btnToggle = document.getElementById("btnToggle"),
  menu = document.getElementById("menu"),
  historyBar = document.getElementById("history-bar"),
  tagsContainer = document.getElementById("tagsContainer");

let dadosAtuais = [],
  isCodesAtual = false,
  history = [];
let linkOriginalAtual = "";
let logsAtuais = [];
let presetsAtuais = [];

let modoAdminAtivo = false;
const SENHA_ADMIN = "admin123";

let tagsMap = {};
let listaTags = [];
let tagAtiva = "";

// INICIO: carregarTags
async function carregarTags() {
  try {
    const res = await fetch("json/tags.json");
    const data = await res.json();
    processarTags(data);
    renderizarPopupTags();
  } catch (e) {}
}
// FIM: carregarTags

// INICIO: processarTags
function processarTags(data) {
  tagsMap = {};
  listaTags = Object.keys(data);
  
  for (let tag in data) {
    let ranges = data[tag];
    ranges.forEach(range => {
      if (/^\d+-\d+$/.test(range)) {
        let [inicio, fim] = range.split("-").map(Number);
        for (let i = inicio; i <= fim; i++) {
          let idStr = String(i).padStart(4, '0');
          if (!tagsMap[idStr]) tagsMap[idStr] = [];
          tagsMap[idStr].push(tag);
        }
      } else {
        if (!tagsMap[range]) tagsMap[range] = [];
        tagsMap[range].push(tag);
      }
    });
  }
}
// FIM: processarTags

// INICIO: renderizarPopupTags
function renderizarPopupTags() {
  if (listaTags.length === 0) return;
  tagsContainer.classList.remove("hidden");
  tagsContainer.innerHTML = `<span style="color:#888; font-size:12px; margin-right:5px;">Tags:</span>`;
  
  let btnTodas = document.createElement("button");
  btnTodas.className = `tag-pill ${tagAtiva === "" ? "ativa" : ""}`;
  btnTodas.textContent = "Todas";
  btnTodas.onclick = () => { 
    tagAtiva = ""; 
    renderizarPopupTags(); 
    dispararPesquisaAtual(campoPesquisa.value); 
  };
  tagsContainer.appendChild(btnTodas);

  listaTags.forEach(tag => {
    let btn = document.createElement("button");
    btn.className = `tag-pill ${tagAtiva === tag ? "ativa" : ""}`;
    btn.textContent = tag;
    btn.onclick = () => { 
      tagAtiva = tag; 
      renderizarPopupTags(); 
      dispararPesquisaAtual(campoPesquisa.value); 
    };
    tagsContainer.appendChild(btn);
  });
}
// FIM: renderizarPopupTags

btnToggle.addEventListener("click", () => menu.classList.toggle("hidden"));

window.onscroll = () => {
  if (document.body.classList.contains("focus-mode-active")) return;
  document.getElementById("btnTop").style.display = window.scrollY > 300 ? "flex" : "none";
  const bateuNoFundo = window.innerHeight + window.scrollY >= document.body.scrollHeight - 50;
  document.getElementById("btnBottom").style.display = bateuNoFundo ? "none" : "flex";
};

// INICIO: renderizarHistorico
function renderizarHistorico() {
  if (history.length === 0) {
    historyBar.innerHTML = "Recent: None";
  } else {
    historyBar.innerHTML = "Recent: " + history.map((h) => `<span style="margin:0 5px; cursor:pointer; color:#ffff00" onclick="navigator.clipboard.writeText('${h}'); tocarSomClique();">${h}</span>`).join("|");
  }
}
// FIM: renderizarHistorico

// INICIO: updateHistory
function updateHistory(val) {
  if (!history.includes(val)) {
    history.unshift(val);
    if (history.length > 3) history.pop();
  }
  renderizarHistorico();
}
// FIM: updateHistory

// INICIO: renderizarColorPicker
function renderizarColorPicker(btn) {
  document.body.classList.remove("focus-mode-active");
  document.querySelectorAll("nav button").forEach((b) => b.classList.remove("ativo"));
  btn.classList.add("ativo");

  let savedColors = JSON.parse(localStorage.getItem('jjs_saved_colors') || '[]');

  conteudo.innerHTML = `
        <div style="text-align:center; padding:20px; display:flex; flex-direction:column; align-items:center;">
            <h2>Color Picker</h2>
            <div id="color-picker-container" style="display:flex; justify-content:center; margin-bottom:20px;"></div>
            
            <div style="display:flex; gap:10px; width:100%; max-width:400px; justify-content:center; margin-bottom:15px;">
                <input type="text" id="hex" style="flex:1; padding:12px; background:#1a1a1a; color:#ffffff; border:1px solid #333; text-align:center; font-weight:bold; box-sizing:border-box;">
                <input type="text" id="rgb" style="flex:1; padding:12px; background:#1a1a1a; color:#ffffff; border:1px solid #333; text-align:center; font-weight:bold; box-sizing:border-box;">
            </div>

            <button id="btnSaveColor" class="action-btn" style="width:100%; max-width:400px; margin-bottom:30px;">
                Salvar Cor Atual
            </button>

            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-top: 10px;">
                <h2 style="border: none; margin: 0; padding: 0;">Saved Colors</h2>
                <button id="btnClearColors" style="background: transparent; border: 1px solid #555; color: #aaa; cursor: pointer; padding: 5px 10px; font-size: 12px; border-radius: 2px;">Limpar Tudo</button>
            </div>
            
            <div id="saved-colors-grid" class="presets-grid" style="width: 100%;"></div>
        </div>`;

  const hex = document.getElementById("hex"),
    rgb = document.getElementById("rgb"),
    btnSaveColor = document.getElementById("btnSaveColor"),
    btnClearColors = document.getElementById("btnClearColors"),
    savedColorsGrid = document.getElementById("saved-colors-grid");

  const colorPicker = new iro.ColorPicker("#color-picker-container", {
    width: 180,
    color: "#ffffff",
  });

  const updateInputs = (color) => {
    const hVal = color.hexString.toUpperCase();
    const rVal = `${color.rgb.r},${color.rgb.g},${color.rgb.b}`;
    
    if (document.activeElement !== hex) {
      hex.value = hVal;
    }
    if (document.activeElement !== rgb) {
      rgb.value = rVal;
    }
    
    hex.style.color = hVal;
    rgb.style.color = hVal;
  };

  updateInputs(colorPicker.color);
  colorPicker.on("color:change", updateInputs);

  hex.addEventListener("input", (e) => {
    let val = e.target.value.trim();
    if (val && !val.startsWith("#")) val = "#" + val;
    if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
      colorPicker.color.set(val);
    }
  });

  rgb.addEventListener("input", (e) => {
    let val = e.target.value.trim();
    let parts = val.split(",").map(n => parseInt(n.trim()));
    if (parts.length === 3 && parts.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
      colorPicker.color.set({r: parts[0], g: parts[1], b: parts[2]});
    }
  });

  [hex, rgb].forEach(
    (el) =>
      (el.ondblclick = () => {
        el.select();
        navigator.clipboard.writeText(el.value);
        tocarSomClique();
        updateHistory(el.value);
        const bgOriginal = el.style.background;
        const corOriginal = el.style.color;
        el.style.background = "#2e7d32";
        el.style.color = "#ffffff";
        setTimeout(() => {
          el.style.background = bgOriginal;
          el.style.color = corOriginal;
        }, 500);
      }),
  );

  function renderizarFavoritos() {
    savedColorsGrid.innerHTML = "";
    if (savedColors.length === 0) {
        savedColorsGrid.innerHTML = "<p style='color:#888; grid-column: 1 / -1; font-size:14px; text-align:left;'>Nenhuma cor salva ainda.</p>";
        return;
    }

    savedColors.forEach((cor, index) => {
        const card = document.createElement("div");
        card.className = "preset-card";
        card.style.backgroundColor = cor.includes(',') ? `rgb(${cor})` : cor;
        card.textContent = cor;

        card.onclick = async () => {
            await navigator.clipboard.writeText(cor);
            tocarSomClique();
            updateHistory(cor);
            const originalText = card.textContent;
            card.textContent = "Copied!";
            setTimeout(() => {
                card.textContent = originalText;
            }, 1000);
        };

        card.oncontextmenu = (e) => {
            e.preventDefault(); 
            savedColors.splice(index, 1);
            localStorage.setItem('jjs_saved_colors', JSON.stringify(savedColors));
            renderizarFavoritos();
        };

        savedColorsGrid.appendChild(card);
    });
  }

  renderizarFavoritos();

  btnSaveColor.onclick = () => {
      const currentColor = rgb.value;
      if (!savedColors.includes(currentColor)) {
          savedColors.push(currentColor);
          localStorage.setItem('jjs_saved_colors', JSON.stringify(savedColors));
          renderizarFavoritos();
          
          const textoOriginal = btnSaveColor.textContent;
          btnSaveColor.textContent = "Cor Salva!";
          setTimeout(() => { btnSaveColor.textContent = textoOriginal; }, 1000);
      }
  };

  btnClearColors.onclick = () => {
      if (confirm("Tem certeza que deseja apagar todas as cores salvas?")) {
          savedColors = [];
          localStorage.removeItem('jjs_saved_colors');
          renderizarFavoritos();
      }
  };
}
// FIM: renderizarColorPicker

// INICIO: carregarPresets
function carregarPresets(url, btn) {
  document.body.classList.remove("focus-mode-active");
  linkOriginalAtual = url;
  document.querySelectorAll("nav button").forEach((b) => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  conteudo.innerHTML = '<div class="status-msg">Loading presets...</div>';

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      presetsAtuais = data;
      renderizarPresets(presetsAtuais, "");
    })
    .catch((err) => {
      conteudo.innerHTML = '<div class="status-msg" style="color:red;">Error loading presets.</div>';
    });
}
// FIM: carregarPresets

// INICIO: renderizarPresets
function renderizarPresets(data, termo) {
  conteudo.innerHTML = "";
  const h2 = document.createElement("h2");
  h2.textContent = "JJS Buildings Colors";
  conteudo.appendChild(h2);

  const grid = document.createElement("div");
  grid.className = "presets-grid";

  data.forEach((item) => {
    const rgbVal = item.rgb || item.color || item;
    const nameVal = item.name || rgbVal;

    if (nameVal.toLowerCase().includes(termo.toLowerCase()) || rgbVal.toLowerCase().includes(termo.toLowerCase())) {
      const card = document.createElement("div");
      card.className = "preset-card";
      card.style.backgroundColor = rgbVal.includes(',') && !rgbVal.startsWith('rgb') ? `rgb(${rgbVal})` : rgbVal;
      card.textContent = nameVal;

      card.onclick = async () => {
        await navigator.clipboard.writeText(rgbVal);
        tocarSomClique();
        updateHistory(rgbVal);
        const originalText = card.textContent;
        card.textContent = "Copied!";
        setTimeout(() => {
          card.textContent = originalText;
        }, 1000);
      };
      grid.appendChild(card);
    }
  });
  conteudo.appendChild(grid);
}
// FIM: renderizarPresets

// INICIO: carregarDados
function carregarDados(url, btn) {
  document.body.classList.remove("focus-mode-active");
  linkOriginalAtual = url;
  document.querySelectorAll("nav button").forEach((b) => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  conteudo.innerHTML = '<div class="status-msg">Carregando dados...</div>';
  
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      let contadorGlobal = 1;
      let contadorCategoria = 1;
      let categoriaAnterior = null;
      let dadosProcessados = []; 
      
      data.forEach((cat) => {
        cat.catId = "C" + String(contadorCategoria).padStart(4, '0');
        contadorCategoria++;

        let itensMapeados = []; 

        cat.items.forEach((item) => {
          item.autoId = String(contadorGlobal).padStart(4, '0');
          contadorGlobal++;

          if (!item.name || item.name.trim() === "") {
            let novoNome = cat.category || "";
            if (!novoNome.endsWith(':')) {
              novoNome += ':';
            }
            item.name = novoNome;

            if (categoriaAnterior) {
              categoriaAnterior.items.push(item);
            } else {
              itensMapeados.push(item);
            }
          } else {
            itensMapeados.push(item);
          }
        });

        cat.items = itensMapeados;
        
        if (cat.items.length > 0) {
          dadosProcessados.push(cat);
          categoriaAnterior = cat;
        }
      });

      dadosAtuais = dadosProcessados;
      isCodesAtual = url.includes("codes.json");
      renderizarItens(dadosAtuais, isCodesAtual, campoPesquisa.value);
    });
}
// FIM: carregarDados

// INICIO: renderizarItens
function renderizarItens(data, isCodes, termo) {
  conteudo.innerHTML = "";
  const termoBusca = termo.toLowerCase(); 

  data.forEach((cat) => {
    const categoriaBate = cat.category ? cat.category.toLowerCase().includes(termoBusca) : false;
    const catIdBate = modoAdminAtivo && cat.catId ? cat.catId.toLowerCase().includes(termoBusca) : false;

    const itens = cat.items.filter((i) => {
      if (tagAtiva !== "") {
        let tagsDesteItem = tagsMap[i.autoId] || [];
        let tagsDestaCategoria = tagsMap[cat.catId] || []; 
        if (!tagsDesteItem.includes(tagAtiva) && !tagsDestaCategoria.includes(tagAtiva)) return false; 
      }

      if (categoriaBate || catIdBate) return true;
      const nomeMatch = i.name ? i.name.toLowerCase().includes(termoBusca) : false;
      const idMatch = i.id ? i.id.toString().toLowerCase().includes(termoBusca) : false;
      const codeMatch = i.code ? i.code.toString().toLowerCase().includes(termoBusca) : false;
      const autoIdMatch = modoAdminAtivo && i.autoId ? i.autoId.toString().includes(termoBusca) : false;

      return nomeMatch || idMatch || codeMatch || autoIdMatch;
    });

    if (itens.length > 0 || modoAdminAtivo) {
      const h2 = document.createElement("h2");
      if (modoAdminAtivo) {
        h2.innerHTML = `${cat.category} 
          <span style="color:#ff9800; font-size:14px; font-weight:normal; float:right; display:flex; align-items:center;">
            [Admin Cat: ${cat.catId}]
            <button class="admin-btn-small" onclick="abrirModalEdicao(null, '${cat.catId}')">➕ Add Item</button>
          </span>`;
      } else {
        h2.textContent = cat.category;
      }
      conteudo.appendChild(h2);
      
      itens.forEach((i) => {
        const el = document.createElement("button");
        el.className = "code-btn";
        
        const nomeParaExibir = i.name ? i.name.replace(/:$/, "") : "Sem Nome";
        
        if (modoAdminAtivo) {
          el.innerHTML = `${nomeParaExibir} 
            <span style="color:#ff9800; float:right; display:flex; align-items:center;">
              [Admin ID: ${i.autoId}]
              <button class="admin-btn-small edit-btn" data-autoid="${i.autoId}" data-catid="${cat.catId}">✏️ Edit</button>
            </span>`;
          el.style.borderLeftColor = "#ff9800";
        } else {
          el.textContent = isCodes ? nomeParaExibir : `${nomeParaExibir}: ${i.id || "Sem ID"}`;
          el.style.borderLeftColor = "#555";
        }

        el.onclick = async (e) => {
          if (e.target.classList.contains('edit-btn')) {
            e.stopPropagation();
            abrirModalEdicao(e.target.dataset.autoid, e.target.dataset.catid);
            return;
          }

          const val = modoAdminAtivo ? i.autoId : (isCodes ? i.code : i.id);
          
          if (val) {
            await navigator.clipboard.writeText(val);
            tocarSomClique();
            updateHistory(val);
            el.classList.add("btnClicado");
            el.textContent = "Copied!";
            
            setTimeout(() => {
              el.classList.remove("btnClicado");
              if (modoAdminAtivo) {
                 el.innerHTML = `${nomeParaExibir} 
                   <span style="color:#ff9800; float:right; display:flex; align-items:center;">
                     [Admin ID: ${i.autoId}]
                     <button class="admin-btn-small edit-btn" data-autoid="${i.autoId}" data-catid="${cat.catId}">✏️ Edit</button>
                   </span>`;
              } else {
                 el.textContent = isCodes ? nomeParaExibir : `${nomeParaExibir}: ${i.id || "Sem ID"}`;
              }
            }, 1000);
          }
        };
        conteudo.appendChild(el);
      });
    }
  });
}
// FIM: renderizarItens

// INICIO: carregarLogs
function carregarLogs(url, btn) {
  document.body.classList.remove("focus-mode-active");
  linkOriginalAtual = url;
  document.querySelectorAll("nav button").forEach((b) => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  conteudo.innerHTML = '<div class="status-msg">Loading logs...</div>';

  fetch(url)
    .then((res) => res.text())
    .then((text) => {
      logsAtuais = text.split(/\r?\n/).map((linha) => linha.trim()).filter((linha) => linha.length > 0);
      renderizarLogs(logsAtuais, "");
    })
    .catch((err) => {
      conteudo.innerHTML = '<div class="status-msg" style="color:red;">Error loading log.txt.</div>';
    });
}
// FIM: carregarLogs

// INICIO: formatarTextoLog
function formatarTextoLog(texto) {
  let resultado = texto;
  resultado = resultado.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  resultado = resultado.replace(/\~\~(.*?)\~\~/g, '<span class="log-small">$1</span>');
  resultado = resultado.replace(/\*rgb,(\d{1,3}),(\d{1,3}),(\d{1,3})\s(.*?)\*/g, '<span style="color: rgb($1,$2,$3);">$4</span>');
  resultado = resultado.replace(/\|\|(.*?)\|\|/g, '<span class="log-header">$1</span>');
  resultado = resultado.replace(/\|(.*?)\|/g, '<span style="font-size: 24px; display: inline-block; margin: 5px 0;">$1</span>');
  resultado = resultado.replace(/\$(.*?)\$/g, '<span style="text-decoration: underline;">$1</span>');
  return resultado;
}
// FIM: formatarTextoLog

// INICIO: renderizarLogs
function renderizarLogs(logs, termo) {
  conteudo.innerHTML = "";
  const logHeaderWrapper = document.createElement("div");
  logHeaderWrapper.style.cssText = "display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-top: 30px;";

  const h2 = document.createElement("h2");
  h2.textContent = "System Logs";
  h2.style.cssText = "margin: 0; border: none; padding: 0;";

  const focusBtn = document.createElement("button");
  focusBtn.textContent = document.body.classList.contains("focus-mode-active") ? "Exit Focus Mode" : "Toggle Focus Mode";
  focusBtn.style.cssText = "background: #1e1e1e; color: #fff; border: 1px solid #333; padding: 8px 16px; font-weight: bold; cursor: pointer; border-radius: 2px; font-size: 12px;";
  focusBtn.onclick = () => {
    document.body.classList.toggle("focus-mode-active");
    focusBtn.textContent = document.body.classList.contains("focus-mode-active") ? "Exit Focus Mode" : "Toggle Focus Mode";
  };

  logHeaderWrapper.appendChild(h2);
  logHeaderWrapper.appendChild(focusBtn);
  conteudo.appendChild(logHeaderWrapper);

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display: flex; flex-direction: column; gap: 2px; padding: 10px 0; text-align: left;";

  logs.forEach((textoBruto) => {
    if (textoBruto.toLowerCase().includes(termo.toLowerCase())) {
      const p = document.createElement("p");
      p.style.cssText = "margin: 0; padding: 0; line-height: 1; font-size: 15px; word-break: break-word;";
      p.innerHTML = formatarTextoLog(textoBruto);
      wrapper.appendChild(p);
    }
  });
  conteudo.appendChild(wrapper);
}
// FIM: renderizarLogs

// INICIO: dispararPesquisaAtual
function dispararPesquisaAtual(valor) {
  const abaAtivaElement = document.querySelector("nav button.ativo");
  const abaAtiva = abaAtivaElement ? abaAtivaElement.textContent : "";

  if (abaAtiva !== "Colors" && abaAtiva !== "Logs" && abaAtiva !== "Presets") {
    renderizarItens(dadosAtuais, isCodesAtual, valor);
  } else if (abaAtiva === "Logs") {
    renderizarLogs(logsAtuais, valor);
  } else if (abaAtiva === "Presets") {
    renderizarPresets(presetsAtuais, valor);
  }
}
// FIM: dispararPesquisaAtual

campoPesquisa.addEventListener("input", (e) => {
  const val = e.target.value.trim();

  if (val === SENHA_ADMIN) {
    modoAdminAtivo = !modoAdminAtivo;
    campoPesquisa.value = "";
    
    document.getElementById("btnExportJSON").style.display = modoAdminAtivo ? "block" : "none";
    
    historyBar.innerHTML = `<span style="color: #ff9800; font-weight: bold;">[!] MODO ADMIN/EDITOR ${modoAdminAtivo ? 'ATIVADO' : 'DESATIVADO'}</span>`;
    
    setTimeout(() => {
      renderizarHistorico();
    }, 2500);
    
    dispararPesquisaAtual(""); 
    return;
  }

  dispararPesquisaAtual(val);
});

document.getElementById("btnTema").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  document.getElementById("btnTema").textContent = document.body.classList.contains("light-mode") ? "🌙" : "☀️";
});

window.addEventListener("keydown", (e) => {
  if (e.key === "/") {
    if (document.activeElement !== campoPesquisa) {
      e.preventDefault();
      campoPesquisa.focus();
    }
  } else if (e.key === "Escape") {
    campoPesquisa.value = "";
    menu.classList.add("hidden");
    tagAtiva = ""; 
    renderizarPopupTags();
    dispararPesquisaAtual("");
    campoPesquisa.blur();
  }
});

window.onload = () => {
  carregarTags();
  carregarDados("json/dados.json", document.querySelector("nav button"));
};

let promptDeInstalação;
const btnInstall = document.getElementById("btnInstall");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  promptDeInstalação = e;
  btnInstall.style.display = "block";
});

btnInstall.addEventListener("click", async () => {
  if (promptDeInstalação) {
    promptDeInstalação.prompt();
    const { outcome } = await promptDeInstalação.userChoice;
    promptDeInstalação = null;
    btnInstall.style.display = "none";
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.log(err));
  });
}

let catEditandoId = null;
let itemEditandoId = null;

// INICIO: abrirModalEdicao
function abrirModalEdicao(autoId, catId) {
  catEditandoId = catId;
  itemEditandoId = autoId;
  
  const modal = document.getElementById("editorModal");
  const inpName = document.getElementById("editName");
  const inpId = document.getElementById("editId");
  const inpCode = document.getElementById("editCode");
  const modalTitle = document.getElementById("modalTitle");

  if (autoId) {
    const cat = dadosAtuais.find(c => c.catId === catId);
    const item = cat.items.find(i => i.autoId === autoId);
    inpName.value = item.name ? item.name.replace(/:$/, "") : "";
    inpId.value = item.id || "";
    inpCode.value = item.code || "";
    modalTitle.textContent = "✏️ Editar Item";
  } else {
    inpName.value = "";
    inpId.value = "";
    inpCode.value = "";
    modalTitle.textContent = "➕ Novo Item";
  }
  
  modal.classList.remove("hidden");
}
// FIM: abrirModalEdicao

// INICIO: fecharModalEdicao
function fecharModalEdicao() {
  document.getElementById("editorModal").classList.add("hidden");
}
// FIM: fecharModalEdicao

// INICIO: salvarItemEdicao
function salvarItemEdicao() {
  const inpName = document.getElementById("editName").value.trim();
  const inpId = document.getElementById("editId").value.trim();
  const inpCode = document.getElementById("editCode").value.trim();
  
  if (!inpName) {
    alert("O nome do item é obrigatório!");
    return;
  }

  const cat = dadosAtuais.find(c => c.catId === catEditandoId);
  
  if (itemEditandoId) {
    const item = cat.items.find(i => i.autoId === itemEditandoId);
    item.name = inpName;
    if (inpId) item.id = inpId; else delete item.id;
    if (inpCode) item.code = inpCode; else delete item.code;
  } else {
    const newItem = {
      name: inpName,
      autoId: "NEW-" + Date.now()
    };
    if (inpId) newItem.id = inpId;
    if (inpCode) newItem.code = inpCode;
    cat.items.push(newItem);
  }
  
  fecharModalEdicao();
  renderizarItens(dadosAtuais, isCodesAtual, campoPesquisa.value);
  historyBar.innerHTML = `<span style="color: #4caf50; font-weight: bold;">[!] Alteração salva em memória. Lembre-se de Exportar!</span>`;
}
// FIM: salvarItemEdicao

document.getElementById("btnExportJSON").addEventListener("click", () => {
  const exportData = dadosAtuais.map(cat => {
    const cleanCat = { ...cat };
    delete cleanCat.catId; 
    
    cleanCat.items = cat.items.map(i => {
      const cleanItem = { ...i };
      delete cleanItem.autoId; 
      return cleanItem;
    });
    
    return cleanCat;
  });

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  
  const fileName = linkOriginalAtual.split('/').pop() || "dados_atualizados.json";
  downloadAnchorNode.setAttribute("download", fileName);
  
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  
  historyBar.innerHTML = `<span style="color: #4caf50; font-weight: bold;">[!] Arquivo ${fileName} exportado com sucesso!</span>`;
});

const btnFullscreen = document.getElementById("btnFullscreen");

btnFullscreen.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.log(`Erro ao tentar entrar em tela cheia: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
});

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) {
    btnFullscreen.textContent = "🗗";
    btnFullscreen.title = "Sair da Tela Cheia";
  } else {
    btnFullscreen.textContent = "⛶";
    btnFullscreen.title = "Tela Cheia";
  }
});
