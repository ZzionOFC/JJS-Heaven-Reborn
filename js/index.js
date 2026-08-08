let audioCtx = null;

// INICIO: tocarSomClique
function tocarSomClique() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = "square";

    osc.frequency.setValueAtTime(350, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.03);

    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + 0.03,
    );

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch (e) {}
}
// FIM: tocarSomClique

// INICIO: visibilityOptimization
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (audioCtx && audioCtx.state === "running") {
      audioCtx.suspend();
    }
  }
});
// FIM: visibilityOptimization

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
    if (!res.ok) return;
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
    ranges.forEach((range) => {
      if (/^\d+-\d+$/.test(range)) {
        let [inicio, fim] = range.split("-").map(Number);
        for (let i = inicio; i <= fim; i++) {
          let idStr = String(i).padStart(4, "0");
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
  btnTodas.textContent = "All";
  btnTodas.onclick = () => {
    tagAtiva = "";
    renderizarPopupTags();
    dispararPesquisaAtual(campoPesquisa.value);
  };
  tagsContainer.appendChild(btnTodas);

  listaTags.forEach((tag) => {
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

// INICIO: eventosIniciais
btnToggle.addEventListener("click", () => menu.classList.toggle("hidden"));

window.onscroll = () => {
  if (document.body.classList.contains("focus-mode-active")) return;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;
  const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  const btnTop = document.getElementById("btnTop");
  const isLightMode = document.body.classList.contains("light-mode");
  const corFundoBarra = isLightMode
    ? "rgba(204,204,204,0.9)"
    : "rgba(51,51,51,0.85)";

  if (scrollTop > 300) {
    btnTop.style.display = "flex";
    btnTop.style.background = `conic-gradient(#4caf50 ${scrollPercent}%, ${corFundoBarra} ${scrollPercent}%)`;
  } else {
    btnTop.style.display = "none";
  }

  const bateuNoFundo =
    window.innerHeight + window.scrollY >= document.body.scrollHeight - 50;
  document.getElementById("btnBottom").style.display = bateuNoFundo
    ? "none"
    : "flex";
};
// FIM: eventosIniciais

// INICIO: renderizarHistorico
function renderizarHistorico() {
  if (history.length === 0) {
    historyBar.innerHTML = "Recent: None";
  } else {
    historyBar.innerHTML =
      "Recent: " +
      history
        .map(
          (h) =>
            `<span style="margin:0 5px; cursor:pointer; color:#ffff00" onclick="navigator.clipboard.writeText('${h}'); tocarSomClique();">${h}</span>`,
        )
        .join("|");
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
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.remove("ativo"));
  btn.classList.add("ativo");

  let savedColors = JSON.parse(
    localStorage.getItem("jjs_saved_colors") || "[]",
  );

  conteudo.innerHTML = `
<div style="text-align:center; padding:15px; display:flex; flex-direction:column; align-items:center; max-width: 480px; margin: 0 auto;">
    <h2 style="margin-bottom: 20px; font-size: 20px; letter-spacing: 1px;">Color Studio & Picker</h2>
    
    <div id="color-picker-container" style="display:flex; justify-content:center; margin-bottom:20px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);"></div>
    
    <div style="display:flex; gap:10px; width:100%; justify-content:center; margin-bottom:15px;">
<input type="text" id="hex" placeholder="HEX" style="flex:1; padding:10px; background:#141414; color:#ffffff; border:1px solid #333; text-align:center; font-weight:bold; border-radius: 4px; box-sizing:border-box;">
<input type="text" id="rgb" placeholder="RGB" style="flex:1; padding:10px; background:#141414; color:#ffffff; border:1px solid #333; text-align:center; font-weight:bold; border-radius: 4px; box-sizing:border-box;">
    </div>

    <div style="display:flex; gap:10px; width:100%; margin-bottom:15px;">
<input type="text" id="colorNameInput" placeholder="Custom color name (optional)..." style="flex:1; padding:10px; background:#141414; color:#ffffff; border:1px solid #333; text-align:center; font-weight:bold; border-radius: 4px; box-sizing:border-box;">
<button id="btnSaveColor" class="action-btn" style="padding: 0 20px; border-radius: 4px; font-weight: bold; cursor: pointer;">Save Color</button>
    </div>
    
    <div style="width:100%; padding:15px; border:1px dashed rgba(255,255,255,0.15); background:#161616; border-radius:6px; margin-bottom:15px; box-sizing:border-box;">
<h3 style="margin-top:0; font-size:13px; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin-bottom: 6px; border:none;">📷 Extract from Image</h3>
<p style="font-size:11px; color:#888; margin-bottom:12px;">Paste an image anywhere (Ctrl+V) or upload below:</p>
<input type="file" id="imageInput" accept="image/*" style="width:100%; font-size:11px; margin-bottom:10px; color:#aaa; padding: 6px; background: #111; border: 1px solid #333; border-radius: 4px;">
<div id="imgCanvasWrapper" style="position:relative; width:100%; display:none; touch-action:none; overflow:hidden; border:1px solid #333; border-radius:4px; box-shadow: 0 4px 10px rgba(0,0,0,0.4);">
    <canvas id="imgCanvas" style="width:100%; height:auto; display:block; cursor:crosshair;"></canvas>
    <div id="pickerDot" style="position:absolute; width:14px; height:14px; border:2px solid #fff; border-radius:50%; box-shadow:0 0 6px #000; pointer-events:none; transform:translate(-50%, -50%); display:none;"></div>
</div>
<div id="extractedColorDisplay" style="margin-top:10px; padding:8px; font-size:11px; font-weight:bold; border-radius:4px; display:none; text-align:center; text-shadow:0 1px 2px rgba(0,0,0,0.8);"></div>
    </div>

    <!-- SUBSTITUIDO: Sugestões de cores por Previews de Textura -->
    <div style="width:100%; padding:12px; border:1px solid rgba(255,255,255,0.08); background:#161616; border-radius:6px; margin-bottom:25px; box-sizing:border-box; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
<h3 style="margin-top:0; font-size:12px; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin-bottom: 10px; border:none; text-align: left;">✨ Texture Previews</h3>
<div id="texturePreviews" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-top:0;">
    <div style="position:relative; width:100%; aspect-ratio:1; border-radius:4px; overflow:hidden; border:1px solid rgba(255,255,255,0.15); background:#fff;">
        <img src="grass.png" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; filter: grayscale(100%);">
        <div id="preview-grass" style="width:100%; height:100%; position:absolute; top:0; left:0; mix-blend-mode: multiply;"></div>
        <span style="position:absolute; bottom:5px; left:5px; font-size:10px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; z-index:2;">Grass</span>
    </div>
    <div style="position:relative; width:100%; aspect-ratio:1; border-radius:4px; overflow:hidden; border:1px solid rgba(255,255,255,0.15); background:#fff;">
        <img src="wood.png" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; filter: grayscale(100%);">
        <div id="preview-wood" style="width:100%; height:100%; position:absolute; top:0; left:0; mix-blend-mode: multiply;"></div>
        <span style="position:absolute; bottom:5px; left:5px; font-size:10px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; z-index:2;">Wood</span>
    </div>
    <div style="position:relative; width:100%; aspect-ratio:1; border-radius:4px; overflow:hidden; border:1px solid rgba(255,255,255,0.15); background:#fff;">
        <img src="woodb.png" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; filter: grayscale(100%);">
        <div id="preview-woodb" style="width:100%; height:100%; position:absolute; top:0; left:0; mix-blend-mode: multiply;"></div>
        <span style="position:absolute; bottom:5px; left:5px; font-size:10px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; z-index:2;">Wood B</span>
    </div>
</div>
    </div>

    <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 15px;">
<h2 style="border: none; margin: 0; padding: 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; color: #ccc;">Saved Colors</h2>
<button id="btnClearColors" style="background: transparent; border: 1px solid #444; color: #aaa; cursor: pointer; padding: 4px 10px; font-size: 11px; border-radius: 4px; transition: all 0.2s;">Clear All</button>
    </div>
    
    <div id="saved-colors-grid" class="presets-grid" style="width: 100%;"></div>
</div>`;

  const hex = document.getElementById("hex"),
    rgb = document.getElementById("rgb"),
    colorNameInput = document.getElementById("colorNameInput"),
    btnSaveColor = document.getElementById("btnSaveColor"),
    btnClearColors = document.getElementById("btnClearColors"),
    savedColorsGrid = document.getElementById("saved-colors-grid");

  const colorPicker = new iro.ColorPicker("#color-picker-container", {
    width: 190,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#333",
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
    gerarSugestoesDeCores(color.rgb);

    // Atualiza os backgrounds interativos com a cor selecionada (mix-blend-mode)
    const g = document.getElementById("preview-grass");
    const w = document.getElementById("preview-wood");
    const wb = document.getElementById("preview-woodb");
    if (g) g.style.backgroundColor = `rgb(${rVal})`;
    if (w) w.style.backgroundColor = `rgb(${rVal})`;
    if (wb) wb.style.backgroundColor = `rgb(${rVal})`;
  };

  updateInputs(colorPicker.color);
  colorPicker.on("color:change", updateInputs);

  // INICIO: rgbToHsl (mantido para não remover nada)
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    let max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }
  // FIM: rgbToHsl

  // INICIO: hslToRgb (mantido para não remover nada)
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      let hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      let p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return `${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`;
  }
  // FIM: hslToRgb

  // INICIO: gerarSugestoesDeCores (mantida a logica interna para nao remover nada do codigo base original, embora o HTML dela tenha sido substituido)
  function gerarSugestoesDeCores(curRgb) {
    const grid = document.getElementById("suggestionsGrid");
    if (!grid) return; // Se não achar o suggestionsGrid antigo, simplesmente ignora sem erro
    grid.innerHTML = "";

    let [h, s, l] = rgbToHsl(curRgb.r, curRgb.g, curRgb.b);

    const sugestoes = [
      { nome: "Neon", rgb: hslToRgb(h, 100, 50) },
      {
        nome: "Vibrant",
        rgb: hslToRgb(h, Math.min(100, s + 35), Math.max(30, Math.min(70, l))),
      },
      {
        nome: "Pastel",
        rgb: hslToRgb(
          h,
          Math.max(20, s - 10),
          Math.min(90, Math.max(75, l + 15)),
        ),
      },
      { nome: "Grayish", rgb: hslToRgb(h, Math.max(0, s - 50), l) },
      { nome: "Darker", rgb: hslToRgb(h, s, Math.max(10, l - 25)) },
      { nome: "Lighter", rgb: hslToRgb(h, s, Math.min(95, l + 25)) },
      { nome: "Complement", rgb: hslToRgb((h + 180) % 360, s, l) },
      { nome: "Analogous", rgb: hslToRgb((h + 30) % 360, s, l) },
    ];

    sugestoes.forEach((item) => {
      const card = document.createElement("div");
      card.style.aspectRatio = "2.2";
      card.style.borderRadius = "4px";
      card.style.border = "1px solid rgba(255,255,255,0.15)";
      card.style.cursor = "pointer";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "center";
      card.style.alignItems = "center";
      card.style.padding = "4px";
      card.style.color = "#fff";
      card.style.textShadow = "0 1px 2px rgba(0,0,0,0.9)";
      card.style.backgroundColor = `rgb(${item.rgb})`;
      card.innerHTML = `<span style="font-size:10px; font-weight:bold; opacity:0.95;">${item.nome}</span>
<span style="font-size:8px; font-family:monospace; margin-top:2px; opacity:0.8;">${item.rgb}</span>`;

      card.onclick = async () => {
        await navigator.clipboard.writeText(item.rgb);
        tocarSomClique();
        updateHistory(item.rgb);
        colorPicker.color.set(`rgb(${item.rgb})`);
        card.style.borderColor = "#4caf50";
        setTimeout(() => {
          card.style.borderColor = "rgba(255,255,255,0.15)";
        }, 600);
      };
      grid.appendChild(card);
    });
  }
  // FIM: gerarSugestoesDeCores

  hex.addEventListener("input", (e) => {
    let val = e.target.value.trim();
    if (val && !val.startsWith("#")) val = "#" + val;
    if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
      colorPicker.color.set(val);
    }
  });

  rgb.addEventListener("input", (e) => {
    let val = e.target.value.trim();
    let parts = val.split(",").map((n) => parseInt(n.trim()));
    if (
      parts.length === 3 &&
      parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)
    ) {
      colorPicker.color.set({ r: parts[0], g: parts[1], b: parts[2] });
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

  // INICIO: renderizarFavoritos
  function renderizarFavoritos() {
    savedColorsGrid.innerHTML = "";
    if (savedColors.length === 0) {
      savedColorsGrid.innerHTML =
        "<p style='color:#888; grid-column: 1 / -1; font-size:13px; text-align:left;'>No colors saved yet.</p>";
      return;
    }

    savedColors.forEach((cor, index) => {
      const corValue = typeof cor === "string" ? cor : cor.value;
      const corName = typeof cor === "string" ? cor : cor.name;

      const card = document.createElement("div");
      card.className = "preset-card";
      card.style.backgroundColor =
        corValue.includes(",") &&
        !corValue.startsWith("rgb") &&
        !corValue.startsWith("#")
          ? `rgb(${corValue})`
          : corValue;
      card.style.borderRadius = "4px";

      card.textContent = corName;

      card.onclick = async () => {
        await navigator.clipboard.writeText(corValue);
        tocarSomClique();
        updateHistory(corValue);
        const originalText = card.textContent;
        card.textContent = "Copied!";
        setTimeout(() => {
          card.textContent = originalText;
        }, 1000);
      };

      card.oncontextmenu = (e) => {
        e.preventDefault();
        savedColors.splice(index, 1);
        localStorage.setItem("jjs_saved_colors", JSON.stringify(savedColors));
        renderizarFavoritos();
      };

      savedColorsGrid.appendChild(card);
    });
  }
  // FIM: renderizarFavoritos

  renderizarFavoritos();

  btnSaveColor.onclick = () => {
    const currentColor = rgb.value;
    const customName = colorNameInput.value.trim() || currentColor;

    const isDuplicate = savedColors.some((c) => {
      const cVal = typeof c === "string" ? c : c.value;
      const cName = typeof c === "string" ? c : c.name;
      return cVal === currentColor && cName === customName;
    });

    if (!isDuplicate) {
      savedColors.push({ value: currentColor, name: customName });
      localStorage.setItem("jjs_saved_colors", JSON.stringify(savedColors));
      renderizarFavoritos();

      colorNameInput.value = "";

      const textoOriginal = btnSaveColor.textContent;
      btnSaveColor.textContent = "Saved!";
      setTimeout(() => {
        btnSaveColor.textContent = textoOriginal;
      }, 1000);
    } else {
      const textoOriginal = btnSaveColor.textContent;
      btnSaveColor.textContent = "Exists!";
      setTimeout(() => {
        btnSaveColor.textContent = textoOriginal;
      }, 1000);
    }
  };

  btnClearColors.onclick = () => {
    if (confirm("Are you sure you want to delete all saved colors?")) {
      savedColors = [];
      localStorage.removeItem("jjs_saved_colors");
      renderizarFavoritos();
    }
  };

  const imageInput = document.getElementById("imageInput");
  const imgCanvasWrapper = document.getElementById("imgCanvasWrapper");
  const imgCanvas = document.getElementById("imgCanvas");
  const pickerDot = document.getElementById("pickerDot");
  const extractedColorDisplay = document.getElementById(
    "extractedColorDisplay",
  );
  const ctx = imgCanvas.getContext("2d");
  let canvasImage = new Image();

  const lidarComCola = (e) => {
    if (!document.getElementById("imgCanvas")) {
      window.removeEventListener("paste", lidarComCola);
      return;
    }
    const itens = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in itens) {
      let item = itens[index];
      if (item.kind === "file" && item.type.includes("image")) {
        let blob = item.getAsFile();
        carregarImagemNaCanvas(blob);
        break;
      }
    }
  };
  window.addEventListener("paste", lidarComCola);

  imageInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      carregarImagemNaCanvas(e.target.files[0]);
    }
  });

  // INICIO: carregarImagemNaCanvas
  function carregarImagemNaCanvas(file) {
    const url = URL.createObjectURL(file);
    canvasImage.onload = () => {
      imgCanvasWrapper.style.display = "block";
      extractedColorDisplay.style.display = "block";
      imgCanvas.width = canvasImage.width;
      imgCanvas.height = canvasImage.height;
      ctx.drawImage(canvasImage, 0, 0);
      URL.revokeObjectURL(url);
    };
    canvasImage.src = url;
  }
  // FIM: carregarImagemNaCanvas

  let isDraggingCanvas = false;

  // INICIO: extrairCorDaCanvas
  const extrairCorDaCanvas = (e) => {
    const rect = imgCanvas.getBoundingClientRect();
    let xVisivel = e.clientX - rect.left;
    let yVisivel = e.clientY - rect.top;

    xVisivel = Math.max(0, Math.min(xVisivel, rect.width - 1));
    yVisivel = Math.max(0, Math.min(yVisivel, rect.height - 1));

    pickerDot.style.display = "block";
    pickerDot.style.left = xVisivel + "px";
    pickerDot.style.top = yVisivel + "px";

    const scaleX = imgCanvas.width / rect.width;
    const scaleY = imgCanvas.height / rect.height;
    const xInterno = Math.floor(xVisivel * scaleX);
    const yInterno = Math.floor(yVisivel * scaleY);

    const pixel = ctx.getImageData(xInterno, yInterno, 1, 1).data;
    colorPicker.color.set({ r: pixel[0], g: pixel[1], b: pixel[2] });

    const rgbStr = `${pixel[0]},${pixel[1]},${pixel[2]}`;
    extractedColorDisplay.style.backgroundColor = `rgb(${rgbStr})`;
    extractedColorDisplay.textContent = `Selected: ${rgbStr}`;
  };
  // FIM: extrairCorDaCanvas

  imgCanvas.addEventListener("pointerdown", (e) => {
    isDraggingCanvas = true;
    imgCanvas.setPointerCapture(e.pointerId);
    extrairCorDaCanvas(e);
  });
  imgCanvas.addEventListener("pointermove", (e) => {
    if (isDraggingCanvas) extrairCorDaCanvas(e);
  });
  imgCanvas.addEventListener("pointerup", (e) => {
    isDraggingCanvas = false;
    imgCanvas.releasePointerCapture(e.pointerId);
  });
}
// FIM: renderizarColorPicker

// INICIO: carregarPresets
function carregarPresets(url, btn) {
  document.body.classList.remove("focus-mode-active");
  linkOriginalAtual = url;
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  conteudo.innerHTML = '<div class="status-msg">Loading presets...</div>';

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("404");
      return res.json();
    })
    .then((data) => {
      presetsAtuais = data;
      renderizarPresets(presetsAtuais, "");
    })
    .catch((err) => {
      conteudo.innerHTML =
        '<div class="status-msg" style="color:red;">Error loading presets.</div>';
    });
}
// FIM: carregarPresets

// INICIO: extrairNumerosRGB
function extrairNumerosRGB(val) {
  if (!val) return "";
  let str = Array.isArray(val) ? val[0] : val;
  if (typeof str !== "string") str = String(str);
  return str.replace(/rgba?\((.*?)\)/gi, "$1").trim();
}
// FIM: extrairNumerosRGB

// INICIO: renderizarPresets
function renderizarPresets(data, termo) {
  conteudo.innerHTML = "";

  let grupos = [];
  let grupoAtual = { cat: "JJS Buildings Colors", color: null, items: [] };
  let primeiraCategoriaEncontrada = false;
  let mcatAtual = "_default_";
  let mcatColors = {};

  data.forEach((item) => {
    if (item.cat) {
      if (!primeiraCategoriaEncontrada && grupoAtual.items.length === 0) {
        grupoAtual.cat = item.cat;
        grupoAtual.color = item.color || item.rgb || null;
      } else {
        grupos.push(grupoAtual);
        grupoAtual = {
          cat: item.cat,
          color: item.color || item.rgb || null,
          items: [],
        };
      }
      primeiraCategoriaEncontrada = true;
      mcatAtual = "_default_";
    } else {
      if (item.mcat !== undefined) {
        mcatAtual = item.mcat || "_default_";
        if (item.color || item.rgb) {
          mcatColors[mcatAtual] = item.color || item.rgb;
        }
        if (!item.name && !item.rgb && !item.colors) {
          return;
        }
      }

      let newItem = { ...item, _appliedMcat: mcatAtual };
      grupoAtual.items.push(newItem);
    }
  });
  grupos.push(grupoAtual);

  const termoBusca = termo.toLowerCase();

  grupos.forEach((grupo) => {
    const itensFiltrados = grupo.items.filter((item) => {
      const rawRgb = item.rgb || item.color || item;
      const nameVal =
        item.name || (typeof rawRgb === "string" ? rawRgb : "Unnamed");
      const mcatVal = item._appliedMcat || "";

      let arrayColors = [];
      if (Array.isArray(item.colors)) {
        arrayColors = item.colors.map((c) => extrairNumerosRGB(c));
      } else if (item.rgb1) {
        arrayColors.push(extrairNumerosRGB(item.rgb1));
        if (item.rgb2) arrayColors.push(extrairNumerosRGB(item.rgb2));
      } else {
        arrayColors.push(extrairNumerosRGB(rawRgb));
      }

      let copyText = arrayColors.join(" ALT ");

      return (
        nameVal.toLowerCase().includes(termoBusca) ||
        copyText.toLowerCase().includes(termoBusca) ||
        mcatVal.toLowerCase().includes(termoBusca)
      );
    });

    if (itensFiltrados.length > 0) {
      const h2 = document.createElement("h2");
      h2.textContent = grupo.cat;

      let catColor = "";
      if (grupo.color) {
        catColor = extrairNumerosRGB(grupo.color);
      }
      if (catColor) {
        h2.style.color = `rgb(${catColor})`;
        h2.style.borderBottomColor = `rgb(${catColor})`;
      }

      conteudo.appendChild(h2);

      let mcats = { _default_: [] };
      itensFiltrados.forEach((item) => {
        let m = item._appliedMcat || "_default_";
        if (!mcats[m]) mcats[m] = [];
        mcats[m].push(item);
      });

      let mcatKeys = Object.keys(mcats).filter((k) => k !== "_default_");
      let orderedKeys = ["_default_", ...mcatKeys];

      orderedKeys.forEach((mcatName) => {
        let itemsInMcat = mcats[mcatName];
        if (itemsInMcat.length === 0) return;

        if (mcatName !== "_default_") {
          const h3 = document.createElement("h3");
          h3.className = "mcat-title";
          h3.textContent = mcatName;

          let currentMcatColor = mcatColors[mcatName]
            ? extrairNumerosRGB(mcatColors[mcatName])
            : catColor;
          if (currentMcatColor) {
            h3.style.color = `rgb(${currentMcatColor})`;
            h3.style.borderBottomColor = `rgb(${currentMcatColor})`;
          }
          conteudo.appendChild(h3);
        }

        const grid = document.createElement("div");
        grid.className = "presets-grid";

        itemsInMcat.forEach((item) => {
          const rawRgb = item.rgb || item.color || item;
          const nameVal =
            item.name || (typeof rawRgb === "string" ? rawRgb : "Unnamed");

          let arrayColors = [];
          if (Array.isArray(item.colors)) {
            arrayColors = item.colors.map((c) => extrairNumerosRGB(c));
          } else if (item.rgb1) {
            arrayColors.push(extrairNumerosRGB(item.rgb1));
            if (item.rgb2) arrayColors.push(extrairNumerosRGB(item.rgb2));
          } else {
            arrayColors.push(extrairNumerosRGB(rawRgb));
          }

          let copyText = arrayColors.join(" ALT ");

          const card = document.createElement("div");
          card.className = "preset-card";

          if (arrayColors.length > 1) {
            const gradientColors = arrayColors
              .map((c) => `rgb(${c})`)
              .join(", ");
            card.style.background = `linear-gradient(90deg, ${gradientColors})`;
          } else if (arrayColors.length === 1) {
            card.style.backgroundColor = `rgb(${arrayColors[0]})`;
          }

          card.textContent = nameVal;

          card.onclick = async () => {
            await navigator.clipboard.writeText(copyText);
            tocarSomClique();
            updateHistory(copyText);
            const originalText = card.textContent;
            card.textContent = "Copied!";
            setTimeout(() => {
              card.textContent = originalText;
            }, 1000);
          };
          grid.appendChild(card);
        });

        conteudo.appendChild(grid);
      });
    }
  });
}
// FIM: renderizarPresets

// INICIO: carregarDados
function carregarDados(url, btn) {
  document.body.classList.remove("focus-mode-active");
  linkOriginalAtual = url;
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  conteudo.innerHTML = '<div class="status-msg">Loading data...</div>';

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("404");
      return res.json();
    })
    .then((data) => {
      let contadorGlobal = 1;
      let contadorCategoria = 1;
      let categoriaAnterior = null;
      let dadosProcessados = [];

      data.forEach((cat) => {
        cat.catId = "C" + String(contadorCategoria).padStart(4, "0");
        contadorCategoria++;

        let itensMapeados = [];

        cat.items.forEach((item) => {
          item.autoId = String(contadorGlobal).padStart(4, "0");
          contadorGlobal++;

          if (!item.name || item.name.trim() === "") {
            let novoNome = cat.category || "";
            if (!novoNome.endsWith(":")) {
              novoNome += ":";
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
    })
    .catch((err) => {
      conteudo.innerHTML = `<div class="status-msg" style="color:red;">Error loading ${url}.</div>`;
    });
}
// FIM: carregarDados

// INICIO: renderizarItens
function renderizarItens(data, isCodes, termo) {
  conteudo.innerHTML = "";
  const termoBusca = termo.toLowerCase();

  data.forEach((cat) => {
    const categoriaBate = cat.category
      ? cat.category.toLowerCase().includes(termoBusca)
      : false;
    const catIdBate =
      modoAdminAtivo && cat.catId
        ? cat.catId.toLowerCase().includes(termoBusca)
        : false;

    const itens = cat.items.filter((i) => {
      if (tagAtiva !== "") {
        let tagsDesteItem = tagsMap[i.autoId] || [];
        let tagsDestaCategoria = tagsMap[cat.catId] || [];
        if (
          !tagsDesteItem.includes(tagAtiva) &&
          !tagsDestaCategoria.includes(tagAtiva)
        )
          return false;
      }

      if (categoriaBate || catIdBate) return true;
      const nomeMatch = i.name
        ? i.name.toLowerCase().includes(termoBusca)
        : false;
      const idMatch = i.id
        ? i.id.toString().toLowerCase().includes(termoBusca)
        : false;
      const codeMatch = i.code
        ? i.code.toString().toLowerCase().includes(termoBusca)
        : false;
      const autoIdMatch =
        modoAdminAtivo && i.autoId
          ? i.autoId.toString().includes(termoBusca)
          : false;

      const infMatch = i.inf
        ? i.inf.toString().toLowerCase().includes(termoBusca)
        : false;
      const confMatch = i.conf
        ? i.conf.toString().toLowerCase().includes(termoBusca)
        : false;

      return (
        nomeMatch ||
        idMatch ||
        codeMatch ||
        autoIdMatch ||
        infMatch ||
        confMatch
      );
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

        const nomeParaExibir = i.name ? i.name.replace(/:$/, "") : "Unnamed";

        let extraHtml = "";
        if (i.inf)
          extraHtml += `<div style="font-size: 11px; opacity: 0.75; margin-top: 5px; font-weight: normal;">ℹ️ ${i.inf}</div>`;
        if (i.conf)
          extraHtml += `<div style="font-size: 11px; color: #4caf50; margin-top: 2px; font-weight: normal;">⚙️ ${i.conf}</div>`;

        if (modoAdminAtivo) {
          el.innerHTML = `<div style="font-weight:bold;">${nomeParaExibir}</div>
            ${extraHtml}
            <span style="color:#ff9800; float:right; display:flex; align-items:center; margin-top: ${extraHtml ? "-25px" : "-18px"};">
              [Admin ID: ${i.autoId}]
              <button class="admin-btn-small edit-btn" data-autoid="${i.autoId}" data-catid="${cat.catId}">✏️ Edit</button>
            </span>`;
          el.style.borderLeftColor = "#ff9800";
        } else {
          el.innerHTML = `<div style="font-weight:bold;">${isCodes ? nomeParaExibir : `${nomeParaExibir}: ${i.id || "No ID"}`}</div>${extraHtml}`;
          el.style.borderLeftColor = "#555";
        }

        el.onclick = async (e) => {
          if (e.target.classList.contains("edit-btn")) {
            e.stopPropagation();
            abrirModalEdicao(e.target.dataset.autoid, e.target.dataset.catid);
            return;
          }

          const val = modoAdminAtivo ? i.autoId : isCodes ? i.code : i.id;

          if (val) {
            await navigator.clipboard.writeText(val);
            tocarSomClique();
            updateHistory(val);
            el.classList.add("btnClicado");

            const originalHTML = el.innerHTML;
            el.innerHTML = "Copied!";

            setTimeout(() => {
              el.classList.remove("btnClicado");
              el.innerHTML = originalHTML;
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
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
  conteudo.innerHTML = '<div class="status-msg">Loading logs...</div>';

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("404");
      return res.text();
    })
    .then((text) => {
      logsAtuais = text
        .split(/\r?\n/)
        .map((linha) => linha.trim())
        .filter((linha) => linha.length > 0);
      renderizarLogs(logsAtuais, "");
    })
    .catch((err) => {
      conteudo.innerHTML =
        '<div class="status-msg" style="color:red;">Error loading log.txt.</div>';
    });
}
// FIM: carregarLogs

// INICIO: formatarTextoLog
function formatarTextoLog(texto) {
  let resultado = texto;

  // Substituições de redes sociais para gerarem links automaticos visualmente chamativos!
  resultado = resultado.replace(
    /dis @([a-zA-Z0-9_.-]+)/gi,
    '<a href="https://discord.com/users/$1" target="_blank" class="social-link dis">Discord: @$1</a>',
  );
  resultado = resultado.replace(
    /ins @([a-zA-Z0-9_.-]+)/gi,
    '<a href="https://instagram.com/$1" target="_blank" class="social-link ins">Instagram: @$1</a>',
  );
  resultado = resultado.replace(
    /ttk @([a-zA-Z0-9_.-]+)/gi,
    '<a href="https://tiktok.com/@$1" target="_blank" class="social-link ttk">TikTok: @$1</a>',
  );

  // Markdown padrao
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
// FIM: formatarTextoLog

// INICIO: renderizarLogs
function renderizarLogs(logs, termo) {
  conteudo.innerHTML = "";
  const logHeaderWrapper = document.createElement("div");
  logHeaderWrapper.style.cssText =
    "display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-top: 30px;";

  const h2 = document.createElement("h2");
  h2.textContent = "ABOUT ME:";
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

// INICIO: eventListenersGlobais
campoPesquisa.addEventListener("input", (e) => {
  const val = e.target.value.trim();

  // Agora compara de forma ignorando a primeira letra maiuscula se der bobeira e independente do teclado
  if (val.toLowerCase() === SENHA_ADMIN.toLowerCase()) {
    modoAdminAtivo = !modoAdminAtivo;
    campoPesquisa.value = "";

    document.getElementById("btnExportJSON").style.display = modoAdminAtivo
      ? "block"
      : "none";

    historyBar.innerHTML = `<span style="color: #ff9800; font-weight: bold;">[!] ADMIN/EDITOR MODE ${modoAdminAtivo ? "ENABLED" : "DISABLED"}</span>`;

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
  document.getElementById("btnTema").textContent =
    document.body.classList.contains("light-mode") ? "🌙" : "☀️";
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    campoPesquisa.value = "";
    menu.classList.add("hidden");
    tagAtiva = "";
    renderizarPopupTags();
    dispararPesquisaAtual("");
    campoPesquisa.blur();

    if (typeof fecharModalEdicao === "function") fecharModalEdicao();
    if (typeof fecharNotepad === "function") fecharNotepad();
    const cheatSheet = document.getElementById("cheatSheetModal");
    if (cheatSheet) cheatSheet.classList.add("hidden");
    return;
  }

  const isInputFocused =
    document.activeElement.tagName === "INPUT" ||
    document.activeElement.tagName === "TEXTAREA";

  if (e.key === "/") {
    if (!isInputFocused) {
      e.preventDefault();
      campoPesquisa.focus();
    }
    return;
  }

  if (isInputFocused) return;

  const keyLower = e.key.toLowerCase();

  if (keyLower === "[") {
    const cheatSheet = document.getElementById("cheatSheetModal");
    if (cheatSheet) cheatSheet.classList.toggle("hidden");
  } else if (keyLower === "-" || keyLower === "_") {
    const navButtons = Array.from(document.querySelectorAll("nav button"));
    const currentIndex = navButtons.findIndex((btn) =>
      btn.classList.contains("ativo"),
    );
    if (currentIndex > 0) navButtons[currentIndex - 1].click();
  } else if (keyLower === "=" || keyLower === "+") {
    const navButtons = Array.from(document.querySelectorAll("nav button"));
    const currentIndex = navButtons.findIndex((btn) =>
      btn.classList.contains("ativo"),
    );
    if (currentIndex < navButtons.length - 1 && currentIndex !== -1) {
      navButtons[currentIndex + 1].click();
    }
  } else if (keyLower === "t") {
    document.getElementById("btnTema").click();
  } else if (keyLower === "m") {
    document.getElementById("btnToggle").click();
  } else if (keyLower === "f") {
    document.getElementById("btnFullscreen").click();
  } else if (keyLower === "j") {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  } else if (keyLower === "k") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (keyLower === "n") {
    e.preventDefault();
    abrirNotepad();
  }
});

window.onload = () => {
  carregarTags();
  carregarDados("json/dados.json", document.querySelector("nav button"));

  const noteContent = localStorage.getItem("jjs_notepad_data");
  if (noteContent) document.getElementById("notepadText").value = noteContent;
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
// FIM: eventListenersGlobais

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
  const inpInf = document.getElementById("editInf");
  const inpConf = document.getElementById("editConf");
  const modalTitle = document.getElementById("modalTitle");

  if (autoId) {
    const cat = dadosAtuais.find((c) => c.catId === catId);
    const item = cat.items.find((i) => i.autoId === autoId);
    inpName.value = item.name ? item.name.replace(/:$/, "") : "";
    inpId.value = item.id || "";
    inpCode.value = item.code || "";
    if (inpInf) inpInf.value = item.inf || "";
    if (inpConf) inpConf.value = item.conf || "";
    modalTitle.textContent = "✏️ Edit Item";
  } else {
    inpName.value = "";
    inpId.value = "";
    inpCode.value = "";
    if (inpInf) inpInf.value = "";
    if (inpConf) inpConf.value = "";
    modalTitle.textContent = "➕ New Item";
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
  const inpInf = document.getElementById("editInf")
    ? document.getElementById("editInf").value.trim()
    : "";
  const inpConf = document.getElementById("editConf")
    ? document.getElementById("editConf").value.trim()
    : "";

  if (!inpName) {
    alert("Item name is required!");
    return;
  }

  const cat = dadosAtuais.find((c) => c.catId === catEditandoId);

  if (itemEditandoId) {
    const item = cat.items.find((i) => i.autoId === itemEditandoId);
    item.name = inpName;
    if (inpId) item.id = inpId;
    else delete item.id;
    if (inpCode) item.code = inpCode;
    else delete item.code;
    if (inpInf) item.inf = inpInf;
    else delete item.inf;
    if (inpConf) item.conf = inpConf;
    else delete item.conf;
  } else {
    const newItem = {
      name: inpName,
      autoId: "NEW-" + Date.now(),
    };
    if (inpId) newItem.id = inpId;
    if (inpCode) newItem.code = inpCode;
    if (inpInf) newItem.inf = inpInf;
    if (inpConf) newItem.conf = inpConf;
    cat.items.push(newItem);
  }

  fecharModalEdicao();
  renderizarItens(dadosAtuais, isCodesAtual, campoPesquisa.value);
  historyBar.innerHTML = `<span style="color: #4caf50; font-weight: bold;">[!] Changes saved in memory. Remember to Export!</span>`;
}
// FIM: salvarItemEdicao

// INICIO: abrirNotepad
function abrirNotepad() {
  document.getElementById("notepadModal").classList.remove("hidden");
  document.getElementById("notepadText").focus();
}
// FIM: abrirNotepad

// INICIO: fecharNotepad
function fecharNotepad() {
  salvarNotepadSilencioso();
  document.getElementById("notepadModal").classList.add("hidden");
}
// FIM: fecharNotepad

// INICIO: salvarNotepad
function salvarNotepad() {
  salvarNotepadSilencioso();
  fecharNotepad();
  historyBar.innerHTML = `<span style="color: #4caf50; font-weight: bold;">[!] Note saved successfully!</span>`;
  setTimeout(() => renderizarHistorico(), 2000);
}
// FIM: salvarNotepad

// INICIO: salvarNotepadSilencioso
function salvarNotepadSilencioso() {
  const val = document.getElementById("notepadText").value;
  localStorage.setItem("jjs_notepad_data", val);
}
document
  .getElementById("notepadText")
  .addEventListener("input", salvarNotepadSilencioso);
// FIM: salvarNotepadSilencioso

// INICIO: exportJSON
document.getElementById("btnExportJSON").addEventListener("click", () => {
  const exportData = dadosAtuais.map((cat) => {
    const cleanCat = { ...cat };
    delete cleanCat.catId;

    cleanCat.items = cat.items.map((i) => {
      const cleanItem = { ...i };
      delete cleanItem.autoId;
      return cleanItem;
    });

    return cleanCat;
  });

  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);

  const fileName = linkOriginalAtual.split("/").pop() || "updated_data.json";
  downloadAnchorNode.setAttribute("download", fileName);

  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();

  historyBar.innerHTML = `<span style="color: #4caf50; font-weight: bold;">[!] File ${fileName} exported successfully!</span>`;
});
// FIM: exportJSON

// INICIO: toggleFullscreen
const btnFullscreen = document.getElementById("btnFullscreen");

btnFullscreen.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.log(`Error attempting to enter full screen: ${err.message}`);
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
    btnFullscreen.title = "Exit Full Screen";
  } else {
    btnFullscreen.textContent = "⛶";
    btnFullscreen.title = "Full Screen";
  }
});
// FIM: toggleFullscreen
