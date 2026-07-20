const conteudo = document.getElementById("conteudo"),
  campoPesquisa = document.getElementById("campoPesquisa"),
  btnToggle = document.getElementById("btnToggle"),
  menu = document.getElementById("menu"),
  historyBar = document.getElementById("history-bar");
let dadosAtuais = [],
  isCodesAtual = false,
  history = [];
let linkOriginalAtual = "";
let logsAtuais = [];

btnToggle.addEventListener("click", () => menu.classList.toggle("hidden"));

window.onscroll = () => {
  if (document.body.classList.contains("focus-mode-active")) return;
  document.getElementById("btnTop").style.display =
    window.scrollY > 300 ? "flex" : "none";

  const bateuNoFundo =
    window.innerHeight + window.scrollY >= document.body.scrollHeight - 50;
  document.getElementById("btnBottom").style.display = bateuNoFundo
    ? "none"
    : "flex";
};

function updateHistory(val) {
  if (!history.includes(val)) {
    history.unshift(val);
    if (history.length > 3) history.pop();
  }
  historyBar.innerHTML =
    "Recent: " +
    history
      .map(
        (h) =>
          `<span style="margin:0 5px; cursor:pointer; color:#ffff00" onclick="navigator.clipboard.writeText('${h}')">${h}</span>`,
      )
      .join("|");
}

function renderizarColorPicker(btn) {
  document.body.classList.remove("focus-mode-active");
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.remove("ativo"));
  btn.classList.add("ativo");

  conteudo.innerHTML = `
        <div style="text-align:center; padding:20px; display:flex; flex-direction:column; align-items:center;">
            <h2>Color Picker</h2>
            <div id="color-picker-container" style="display:flex; justify-content:center; margin-bottom:20px;"></div>
            
            <div style="display:flex; gap:10px; width:100%; max-width:400px; justify-content:center; margin-bottom:30px;">
                <input type="text" id="hex" readonly style="flex:1; padding:12px; background:#1a1a1a; color:#ffffff; border:1px solid #333; text-align:center; font-weight:bold; box-sizing:border-box;">
                <input type="text" id="rgb" readonly style="flex:1; padding:12px; background:#1a1a1a; color:#ffffff; border:1px solid #333; text-align:center; font-weight:bold; box-sizing:border-box;">
            </div>
        </div>`;

  const hex = document.getElementById("hex"),
    rgb = document.getElementById("rgb");

  const colorPicker = new iro.ColorPicker("#color-picker-container", {
    width: 180,
    color: "#ffffff",
  });

  colorPicker.on("color:change", function (color) {
    const hVal = color.hexString.toUpperCase();
    const rVal = color.rgbString;
    hex.value = hVal;
    rgb.value = rVal;

    hex.style.color = hVal;
    rgb.style.color = hVal;
  });

  [hex, rgb].forEach(
    (el) =>
      (el.onclick = () => {
        navigator.clipboard.writeText(el.value);
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
}

function carregarDados(url, btn) {
  document.body.classList.remove("focus-mode-active");
  linkOriginalAtual = url;
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  conteudo.innerHTML =
    '<div class="status-msg">Stuck? If this screen persists, I might be updating the site, your connection could be slow, or the page hasnt been added yet.</div>';
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      dadosAtuais = data;
      isCodesAtual = url.includes("codes.json");
      renderizarItens(dadosAtuais, isCodesAtual, "");
    });
}

function renderizarItens(data, isCodes, termo) {
  conteudo.innerHTML = "";
  data.forEach((cat) => {
    const itens = cat.items.filter((i) =>
      i.name.toLowerCase().includes(termo.toLowerCase()),
    );
    if (itens.length > 0) {
      const h2 = document.createElement("h2");
      h2.textContent = cat.category;
      conteudo.appendChild(h2);
      itens.forEach((i) => {
        const el = document.createElement("button");
        el.className = "code-btn";
        el.textContent = isCodes
          ? i.name.replace(/:$/, "")
          : `${i.name}: ${i.id}`;

        el.onclick = async () => {
          const val = isCodes ? i.code : i.id;
          await navigator.clipboard.writeText(val);
          updateHistory(val);
          el.classList.add("btnClicado");
          el.textContent = "Copied!";
          setTimeout(() => {
            el.classList.remove("btnClicado");
            el.textContent = isCodes
              ? i.name.replace(/:$/, "")
              : `${i.name}: ${i.id}`;
          }, 1000);
        };
        conteudo.appendChild(el);
      });
    }
  });
}

function carregarLogs(url, btn) {
  document.body.classList.remove("focus-mode-active");
  linkOriginalAtual = url;
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  conteudo.innerHTML = '<div class="status-msg">Loading logs...</div>';

  fetch(url)
    .then((res) => res.text())
    .then((text) => {
      logsAtuais = text
        .split(/\r?\n/)
        .map((linha) => linha.trim())
        .filter((linha) => linha.length > 0);
      renderizarLogs(logsAtuais, "");
    })
    .catch((err) => {
      console.error(err);
      conteudo.innerHTML =
        '<div class="status-msg" style="color:red; text-decoration: none;">Error loading log.txt. Make sure the file exists in the json folder.</div>';
    });
}

function formatarTextoLog(texto) {
  let resultado = texto;
  resultado = resultado.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  resultado = resultado.replace(
    /\~\~(.*?)\~\~/g,
    '<span class="log-small">$1</span>',
  );
  resultado = resultado.replace(
    /\*rgb,(\d{1,3}),(\d{1,3}),(\d{1,3})\s(.*?)\*/g,
    '<span style="color: rgb($1,$2,$3);">$4</span>',
  );
  resultado = resultado.replace(
    /\|\|(.*?)\|\|/g,
    '<span class="log-header">$1</span>',
  );
  resultado = resultado.replace(
    /\|(.*?)\|/g,
    '<span style="font-size: 24px; display: inline-block; margin: 5px 0;">$1</span>',
  );
  resultado = resultado.replace(
    /\$(.*?)\$/g,
    '<span style="text-decoration: underline;">$1</span>',
  );
  return resultado;
}

function renderizarLogs(logs, termo) {
  conteudo.innerHTML = "";

  const logHeaderWrapper = document.createElement("div");
  logHeaderWrapper.style.cssText =
    "display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-top: 30px;";

  const h2 = document.createElement("h2");
  h2.textContent = "System Logs";
  h2.style.cssText = "margin: 0; border: none; padding: 0;";

  const focusBtn = document.createElement("button");
  focusBtn.textContent = document.body.classList.contains("focus-mode-active")
    ? "Exit Focus Mode"
    : "Toggle Focus Mode";
  focusBtn.style.cssText =
    "background: #1e1e1e; color: #fff; border: 1px solid #333; padding: 8px 16px; font-weight: bold; cursor: pointer; border-radius: 2px; font-size: 12px;";
  focusBtn.onclick = () => {
    document.body.classList.toggle("focus-mode-active");
    focusBtn.textContent = document.body.classList.contains("focus-mode-active")
      ? "Exit Focus Mode"
      : "Toggle Focus Mode";
  };

  logHeaderWrapper.appendChild(h2);
  logHeaderWrapper.appendChild(focusBtn);
  conteudo.appendChild(logHeaderWrapper);

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display: flex; flex-direction: column; gap: 2px; padding: 10px 0; text-align: left;";

  logs.forEach((textoBruto) => {
    if (textoBruto.toLowerCase().includes(termo.toLowerCase())) {
      const p = document.createElement("p");
      p.style.cssText =
        "margin: 0; padding: 0; line-height: 1; font-size: 15px; word-break: break-word;";
      p.innerHTML = formatarTextoLog(textoBruto);
      wrapper.appendChild(p);
    }
  });
  conteudo.appendChild(wrapper);
}

function dispararPesquisaAtual(valor) {
  const abaAtivaElement = document.querySelector("nav button.ativo");
  const abaAtiva = abaAtivaElement ? abaAtivaElement.textContent : "";

  if (abaAtiva !== "Colors" && abaAtiva !== "Logs") {
    renderizarItens(dadosAtuais, isCodesAtual, valor);
  } else if (abaAtiva === "Logs") {
    renderizarLogs(logsAtuais, valor);
  }
}

campoPesquisa.addEventListener("input", (e) => {
  dispararPesquisaAtual(e.target.value);
});

document.getElementById("btnTema").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  document.getElementById("btnTema").textContent =
    document.body.classList.contains("light-mode") ? "🌙" : "☀️";
});

// Atalhos de Teclado (Power User)
window.addEventListener("keydown", (e) => {
  if (e.key === "/") {
    if (document.activeElement !== campoPesquisa) {
      e.preventDefault();
      campoPesquisa.focus();
    }
  } else if (e.key === "Escape") {
    campoPesquisa.value = "";
    menu.classList.add("hidden");
    dispararPesquisaAtual("");
    campoPesquisa.blur();
  }
});

window.onload = () =>
  carregarDados("json/dados.json", document.querySelector("nav button"));
// --- LÓGICA DE TRANSFORMAR EM APP (PWA) ---
let promptDeInstalacao;
const btnInstall = document.getElementById("btnInstall");

window.addEventListener("beforeinstallprompt", (e) => {
  // Evita que o navegador mostre o aviso padrão sozinho
  e.preventDefault();
  // Salva o evento para usarmos no botão
  promptDeInstalacao = e;
  // O navegador detectou que pode instalar, então mostramos o botão
  btnInstall.style.display = "block";
});

btnInstall.addEventListener("click", async () => {
  if (promptDeInstalacao) {
    // Mostra a janelinha do sistema perguntando "Deseja instalar?"
    promptDeInstalacao.prompt();
    const { outcome } = await promptDeInstalacao.userChoice;
    if (outcome === "accepted") {
      console.log("App JJS Heaven instalado!");
    }
    promptDeInstalacao = null;
    btnInstall.style.display = "none";
  }
});

// Registra o Service Worker necessário para o site virar App
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .catch((err) => console.log("SW falhou:", err));
  });
}

let deferredPrompt;
const installPopup = document.getElementById('installPopupOverlay');
const btnInstalarPopup = document.getElementById('btnInstalarPopup');
const btnFecharPopup = document.getElementById('btnFecharPopup');


window.addEventListener('beforeinstallprompt', (e) => {
  
  e.preventDefault();
  
  
  deferredPrompt = e;
  
  
  if (installPopup) {
    installPopup.style.display = 'flex';
  }
});


if (btnInstalarPopup) {
  btnInstalarPopup.addEventListener('click', async () => {
    installPopup.style.display = 'none';
    
    if (deferredPrompt) {
      
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      
      deferredPrompt = null;
    }
  });
}

if (btnFecharPopup) {
  btnFecharPopup.addEventListener('click', () => {
    installPopup.style.display = 'none';
  });
}
