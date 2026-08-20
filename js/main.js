// ============================================================
//  Le Petit Goûter — logique du site
//  Lit les photos et la carte depuis Google Drive / Google Sheets
//  au chargement de la page. Rien à modifier ici : tout se règle
//  dans js/config.js.
// ============================================================

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

function isDriveConfigured() {
  return Boolean(CONFIG.drive.apiKey) && !CONFIG.drive.apiKey.startsWith("COLLE_");
}
function isSheetConfigured() {
  return Boolean(CONFIG.sheet.id) && !CONFIG.sheet.id.startsWith("COLLE_");
}

function slugify(str) {
  return (str || "")
    .toString()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/s\b/g, "") // Normalise les pluriels au singulier (ex: boissons -> boisson)
    .replace(/[^a-z0-9]+/g, "");
}

function prettify(filename) {
  const base = (filename || "").replace(/\.[^.]+$/, "");
  const spaced = base.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function parseSpecs(str) {
  return (str || "")
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function thumbUrl(fileId, width = 1600) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

async function driveListChildren(folderId) {
  const q = `'${folderId}' in parents and trashed=false`;
  const fields = "files(id,name,mimeType)";
  const url = `${DRIVE_API}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=200&key=${CONFIG.drive.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Drive API ${res.status} sur le dossier ${folderId}`);
  const data = await res.json();
  return data.files || [];
}

async function buildFolderMap(rootId) {
  const children = await driveListChildren(rootId);
  const map = new Map();
  for (const f of children) {
    if (f.mimeType === "application/vnd.google-apps.folder") {
      map.set(slugify(f.name), f.id);
    }
  }
  return map;
}

async function driveListImages(folderId) {
  const children = await driveListChildren(folderId);
  return children
    .filter((f) => f.mimeType && f.mimeType.startsWith("image/"))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchSheetRows() {
  const url = `${SHEETS_API}/${CONFIG.sheet.id}/values/${encodeURIComponent(CONFIG.sheet.range)}?key=${CONFIG.drive.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API ${res.status}`);
  const data = await res.json();
  const values = data.values || [];
  if (values.length < 2) return [];
  const header = values[0].map((h) => slugify(h));
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    header.forEach((h, idx) => { obj[h] = row[idx] || ""; });
    rows.push(obj);
  }
  return rows;
}

let rootFolderMapPromise = null;
function getRootFolderMap() {
  if (!rootFolderMapPromise) {
    rootFolderMapPromise = buildFolderMap(CONFIG.drive.rootFolderId);
  }
  return rootFolderMapPromise;
}

// ---------------------------------------------------------------
// Contenu statique (coordonnées, horaires, carte de localisation)
// ---------------------------------------------------------------
function renderStaticContent() {
  const b = CONFIG.business;
  document.getElementById("brandName").textContent = b.name;
  document.getElementById("footerName").textContent = b.name;
  document.getElementById("year").textContent = new Date().getFullYear();

  const phoneLink = document.getElementById("phoneLink");
  const phoneText = document.getElementById("phoneText");
  const phoneNum = b.phone || "";
  if (phoneText) {
    phoneText.textContent = phoneNum;
  } else {
    phoneLink.textContent = phoneNum;
  }
  phoneLink.href = `tel:${phoneNum.replace(/\s+/g, "")}`;

  const emailLink = document.getElementById("emailLink");
  const emailText = document.getElementById("emailText");
  if (emailText) {
    emailText.textContent = b.email;
  } else {
    emailLink.textContent = b.email;
  }
  emailLink.href = `mailto:${b.email}`;

  const instaLink = document.getElementById("instaLink");
  const instaText = document.getElementById("instaText");
  if (instaText) {
    instaText.textContent = b.instagram;
  } else {
    instaLink.textContent = b.instagram;
  }
  let instaUrl = b.instagramUrl || "https://instagram.com/";
  if ((instaUrl === "https://instagram.com/" || instaUrl === "https://www.instagram.com/") && b.instagram) {
    const handle = b.instagram.replace(/^@/, "");
    instaUrl = `https://instagram.com/${handle}`;
  }
  instaLink.href = instaUrl;

  document.getElementById("hoursText").innerHTML =
    `${b.hoursHtml}${b.hoursNote ? `<br><span style="font-size:13px;opacity:0.75;">${escapeHtml(b.hoursNote)}</span>` : ""}`;
  document.getElementById("addressLine").textContent = b.address;

  document.getElementById("mapFrame").src =
    `https://www.google.com/maps?q=${encodeURIComponent(CONFIG.maps.query || b.address)}&output=embed`;

  if (b.tagline) {
    document.getElementById("bookSubtitle").textContent = b.tagline;
  }
}

// ---------------------------------------------------------------
// Hero — carrousel de photos + logo
// ---------------------------------------------------------------
async function renderHero() {
  const track = document.getElementById("heroTrack");
  let images = [];

  if (isDriveConfigured()) {
    try {
      const folderMap = await getRootFolderMap();

      for (const name of CONFIG.drive.heroFolders) {
        const fid = folderMap.get(slugify(name));
        if (!fid) continue;
        const imgs = await driveListImages(fid);
        images.push(...imgs);
      }

      const logoFid = folderMap.get(slugify(CONFIG.drive.logoFolder));
      if (logoFid) {
        const logoImgs = await driveListImages(logoFid);
        if (logoImgs[0]) {
          const url = thumbUrl(logoImgs[0].id, 300);
          const logoEl = document.getElementById("logoImg");
          logoEl.src = url;
          logoEl.alt = CONFIG.business.name;
          logoEl.style.display = "block";

          const coverEl = document.getElementById("bookCoverImg");
          coverEl.src = url;
          coverEl.alt = CONFIG.business.name;
          coverEl.style.display = "block";
        }
      }
    } catch (err) {
      console.warn("Chargement des photos d'accueil / logo impossible :", err);
    }
  }

  if (images.length === 0) {
    track.innerHTML = `
      <div class="hero-slide placeholder">
        <div class="scrim"></div>
        <span class="label">Ajoute des photos dans le dossier Drive « photo_accueil »</span>
      </div>`;
    setupHeroCarousel(1);
    return;
  }

  track.innerHTML = images.map((img) => `
    <div class="hero-slide">
      <img src="${thumbUrl(img.id, 1800)}" alt="${escapeHtml(prettify(img.name))}" loading="lazy">
      <div class="scrim"></div>
      <span class="label">${escapeHtml(prettify(img.name))}</span>
    </div>`).join("");

  setupHeroCarousel(images.length);
}

function setupHeroCarousel(slideCount) {
  const track = document.getElementById("heroTrack");
  const dotsHost = document.getElementById("heroDots");
  const prevBtn = document.getElementById("heroPrev");
  const nextBtn = document.getElementById("heroNext");

  dotsHost.innerHTML = "";
  for (let i = 0; i < slideCount; i++) {
    const dot = document.createElement("button");
    if (i === 0) dot.classList.add("active");
    dot.setAttribute("aria-label", `Aller à la photo ${i + 1}`);
    dot.addEventListener("click", () => goToSlide(i));
    dotsHost.appendChild(dot);
  }

  const showControls = slideCount > 1;
  prevBtn.style.display = showControls ? "flex" : "none";
  nextBtn.style.display = showControls ? "flex" : "none";
  dotsHost.style.display = showControls ? "flex" : "none";

  function currentIndex() {
    return Math.round(track.scrollLeft / track.clientWidth) || 0;
  }
  function goToSlide(i) {
    const idx = ((i % slideCount) + slideCount) % slideCount;
    track.scrollTo({ left: idx * track.clientWidth, behavior: "smooth" });
  }
  function updateDots() {
    const idx = currentIndex();
    [...dotsHost.children].forEach((d, i) => d.classList.toggle("active", i === idx));
  }

  let scrollRAF;
  track.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollRAF);
    scrollRAF = requestAnimationFrame(updateDots);
  });
  prevBtn.addEventListener("click", () => goToSlide(currentIndex() - 1));
  nextBtn.addEventListener("click", () => goToSlide(currentIndex() + 1));

  // Glisser à la souris pour faire défiler manuellement
  let isDown = false, startX = 0, startScroll = 0;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    isDown = true;
    startX = e.clientX;
    startScroll = track.scrollLeft;
    track.classList.add("dragging");
    track.setPointerCapture(e.pointerId);
    pauseAutoplay();
  });
  track.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    track.scrollLeft = startScroll - (e.clientX - startX);
  });
  function endDrag() {
    if (!isDown) return;
    isDown = false;
    track.classList.remove("dragging");
    goToSlide(currentIndex());
    resumeAutoplay();
  }
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointerleave", endDrag);
  track.addEventListener("pointercancel", endDrag);

  // Défilement automatique, en pause au survol / interaction
  let autoplayTimer;
  function pauseAutoplay() { clearInterval(autoplayTimer); }
  function resumeAutoplay() {
    pauseAutoplay();
    if (slideCount <= 1) return;
    autoplayTimer = setInterval(() => goToSlide(currentIndex() + 1), 5000);
  }
  track.addEventListener("mouseenter", pauseAutoplay);
  track.addEventListener("mouseleave", resumeAutoplay);
  resumeAutoplay();
}

// ---------------------------------------------------------------
// La carte (livre) — catégories & plats depuis le Google Sheet,
// photos depuis les sous-dossiers Drive du même nom
// ---------------------------------------------------------------
async function renderMenu() {
  const sommaireList = document.getElementById("sommaireList");
  const catHost = document.getElementById("catPagesHost");
  const photoHost = document.getElementById("photoPagesHost");

  if (!isDriveConfigured() || !isSheetConfigured()) {
    sommaireList.innerHTML = `<li class="sommaire-empty">Connecte ta clé API et ton Google Sheet dans js/config.js pour afficher la carte.</li>`;
    return;
  }

  let menuFolderMap = new Map();
  try {
    const rootMap = await getRootFolderMap();
    const menuRootId = rootMap.get(slugify(CONFIG.drive.menuPhotosFolder));
    if (menuRootId) {
      menuFolderMap = await buildFolderMap(menuRootId);
    }
  } catch (err) {
    console.warn("Dossiers Drive introuvables :", err);
  }

  let rows = [];
  try {
    rows = await fetchSheetRows();
  } catch (err) {
    console.warn("Chargement de la carte impossible :", err);
    sommaireList.innerHTML = `<li class="sommaire-empty">Impossible de charger la carte pour le moment.</li>`;
    return;
  }

  const categories = new Map();
  for (const row of rows) {
    const label = (row.categorie || "").trim();
    if (!label) continue;
    const slug = slugify(label);
    
    // Si c'est la formule spéciale pour le bas du sommaire, on met à jour la note et on l'exclut du livre
    if (slug === "formule") {
      const noteEl = document.getElementById("sommaireNote");
      if (noteEl) {
        const name = (row.nom || "").trim();
        const price = (row.prix || "").trim();
        noteEl.textContent = `Formule : ${name} — ${price}`;
      }
      continue; // Exclure cette ligne des pages classiques du livre
    }

    if (!categories.has(slug)) {
      categories.set(slug, { label, items: [], isPhotoOnly: false });
    }
    categories.get(slug).items.push({
      name: (row.nom || "").trim(),
      desc: (row.description || "").trim(),
      price: (row.prix || "").trim(),
      specs: parseSpecs(row.specificite),
    });
  }

  // Ajout dynamique des catégories de photos seules (ex: porcelaine) présentes dans le Drive
  for (const [folderName, folderId] of menuFolderMap) {
    const slug = slugify(folderName);
    // Exclure les dossiers systèmes
    if (slug === "photosommaire" || slug === "sommaire" || slug === "logo" || slug === "photoaccueil" || slug === "exterieur" || slug === "interieur") {
      continue;
    }
    if (!categories.has(slug)) {
      categories.set(slug, {
        label: prettify(folderName),
        items: [],
        isPhotoOnly: true,
        folderId: folderId
      });
    } else {
      categories.get(slug).folderId = folderId;
    }
  }

  if (categories.size === 0) {
    sommaireList.innerHTML = `<li class="sommaire-empty">Ta carte est vide pour l'instant.</li>`;
    return;
  }

  let num = 1;
  const sommaireHtml = [];
  const catHtml = [];
  const photoHtml = [];

  // Rendu de la page de photos du sommaire (photo_sommaire) sur la page de droite
  const sommaireFolderId = menuFolderMap.get("photosommaire") || menuFolderMap.get("sommaire");
  if (sommaireFolderId) {
    try {
      const imgs = (await driveListImages(sommaireFolderId)).slice(0, 4);
      if (imgs.length) {
        photoHtml.push(`
          <div class="photo-page active grid-${imgs.length}" data-photos="sommaire">
            ${imgs.map((img, i) => `
              <div class="ph p${(i % 4) + 1}" style="background-image:url('${thumbUrl(img.id, 900)}')">
                <span>${escapeHtml(prettify(img.name))}</span>
              </div>`).join("")}
          </div>`);
        const idleArt = document.getElementById("idleArt");
        if (idleArt) idleArt.classList.add("hidden");
      }
    } catch (err) {
      console.warn("Photos du sommaire introuvables :", err);
    }
  }

  for (const [slug, cat] of categories) {
    sommaireHtml.push(`
      <li><button data-cat="${slug}"><span>${escapeHtml(cat.label)}</span><span class="num">${String(num).padStart(2, "0")}</span></button></li>`);

    if (cat.isPhotoOnly) {
      try {
        const folderId = cat.folderId;
        const allImgs = await driveListImages(folderId);
        const imgs = allImgs.slice(0, 8); // Max 8 photos réparties sur la double page
        
        let leftImgs = [];
        let rightImgs = [];
        if (imgs.length <= 4) {
          const splitIdx = Math.ceil(imgs.length / 2);
          leftImgs = imgs.slice(0, splitIdx);
          rightImgs = imgs.slice(splitIdx);
        } else {
          leftImgs = imgs.slice(0, 4);
          rightImgs = imgs.slice(4, 8);
        }

        // Page gauche (normalement le texte, ici une grille de photos)
        catHtml.push(`
          <div class="cat-page" data-cat="${slug}">
            <button class="back">← Sommaire</button>
            <h3>${escapeHtml(cat.label)}</h3>
            <div class="cat-items" style="height: calc(100% - 60px); overflow: hidden; padding-bottom: 5px;">
              ${leftImgs.length ? `
                <div class="photo-page active grid-${leftImgs.length}" style="display:grid; height:100%; gap:6px;">
                  ${leftImgs.map((img, i) => `
                    <div class="ph p${(i % 4) + 1}" style="background-image:url('${thumbUrl(img.id, 900)}')">
                      <span>${escapeHtml(prettify(img.name))}</span>
                    </div>`).join("")}
                </div>` : `<p style="font-style:italic;color:var(--brown-soft);margin-top:20px;">Découvrez notre sélection de ${escapeHtml(cat.label.toLowerCase())} directement au salon.</p>`}
            </div>
          </div>`);

        // Page droite (grille de photos)
        if (rightImgs.length) {
          photoHtml.push(`
            <div class="photo-page grid-${rightImgs.length}" data-photos="${slug}">
              ${rightImgs.map((img, i) => `
                <div class="ph p${(i % 4) + 1}" style="background-image:url('${thumbUrl(img.id, 900)}')">
                  <span>${escapeHtml(prettify(img.name))}</span>
                </div>`).join("")}
            </div>`);
        } else {
          photoHtml.push(`
            <div class="photo-page" data-photos="${slug}">
              <div class="idle-art">
                <p style="font-style:italic;">Collection ${escapeHtml(cat.label)}</p>
              </div>
            </div>`);
        }
      } catch (err) {
        console.warn(`Photos de la catégorie photo seule "${cat.label}" introuvables :`, err);
      }
    } else {
      // Page gauche classique (liste d'articles)
      catHtml.push(`
        <div class="cat-page" data-cat="${slug}">
          <button class="back">← Sommaire</button>
          <h3>${escapeHtml(cat.label)}</h3>
          <div class="cat-items">
            ${cat.items.map((it) => `
              <div class="cat-item">
                <div>
                  <div class="name">
                    ${escapeHtml(it.name)}
                    ${it.specs.map((s) => `<span class="badge">${escapeHtml(s)}</span>`).join("")}
                  </div>
                  ${it.desc ? `<span class="desc">${escapeHtml(it.desc)}</span>` : ""}
                </div>
                <div class="price">${escapeHtml(it.price)}</div>
              </div>`).join("")}
          </div>
        </div>`);

      // Page droite classique (grille de photos)
      const folderId = cat.folderId;
      if (folderId) {
        try {
          const imgs = (await driveListImages(folderId)).slice(0, 4);
          if (imgs.length) {
            photoHtml.push(`
              <div class="photo-page grid-${imgs.length}" data-photos="${slug}">
                ${imgs.map((img, i) => `
                  <div class="ph p${(i % 4) + 1}" style="background-image:url('${thumbUrl(img.id, 900)}')">
                    <span>${escapeHtml(prettify(img.name))}</span>
                  </div>`).join("")}
              </div>`);
          }
        } catch (err) {
          console.warn(`Photos de la catégorie "${cat.label}" introuvables :`, err);
        }
      }
    }
    num++;
  }

  sommaireList.innerHTML = sommaireHtml.join("");
  catHost.innerHTML = catHtml.join("");
  photoHost.innerHTML = photoHtml.join("");
}

// ---------------------------------------------------------------
// Interactions du livre (ouvrir / fermer / naviguer)
// ---------------------------------------------------------------
function wireBookInteractions() {
  const book = document.getElementById("bookEl");
  const bookCover = document.getElementById("bookCover");
  const closeBtn = document.getElementById("closeBtn");
  const sommaireView = document.getElementById("sommaireView");
  const idleArt = document.getElementById("idleArt");

  const bookPages = document.getElementById("bookPages");
  function triggerFlipShadow() {
    if (!bookPages) return;
    bookPages.classList.remove("flipping");
    void bookPages.offsetWidth; // force le redémarrage de l'animation CSS
    bookPages.classList.add("flipping");
  }

  function openBook() {
    book.classList.remove("cover");
  }
  function closeBook() {
    book.classList.add("cover");
    showSommaire();
  }

  if (bookCover) {
    bookCover.addEventListener("click", openBook);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeBook);
  }

  const closeCorner = document.getElementById("closeCorner");
  if (closeCorner) {
    closeCorner.addEventListener("click", (e) => {
      e.stopPropagation();
      closeBook();
    });
  }

  document.getElementById("sommaireList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (btn) showCategory(btn.dataset.cat);
  });
  document.getElementById("catPagesHost").addEventListener("click", (e) => {
    if (e.target.closest(".back")) showSommaire();
  });

  function showCategory(cat) {
    sommaireView.classList.add("hidden");
    document.querySelectorAll(".cat-page").forEach((p) => p.classList.toggle("active", p.dataset.cat === cat));
    
    const hasPhotos = document.querySelector(`.photo-page[data-photos="${cat}"]`);
    idleArt.classList.toggle("hidden", Boolean(hasPhotos));

    document.querySelectorAll(".photo-page").forEach((p) => {
      // Toggle active only on non-inline photo pages (which carry the data-photos attribute)
      if (p.dataset.photos) {
        p.classList.toggle("active", p.dataset.photos === cat);
      }
    });
  }

  function showSommaire() {
    sommaireView.classList.remove("hidden");
    document.querySelectorAll(".cat-page").forEach((p) => p.classList.remove("active"));
    
    const sommairePhotos = document.querySelector('.photo-page[data-photos="sommaire"]');
    idleArt.classList.toggle("hidden", Boolean(sommairePhotos));
    if (sommairePhotos) {
      sommairePhotos.classList.add("active");
    }

    document.querySelectorAll(".photo-page").forEach((p) => {
      if (p.dataset.photos && p !== sommairePhotos) {
        p.classList.remove("active");
      }
    });
  }
}

// ---------------------------------------------------------------
// Navigation mobile
// ---------------------------------------------------------------
function wireMobileNav() {
  const toggle = document.getElementById("navToggle");
  const list = document.querySelector("nav ul");
  toggle.addEventListener("click", () => list.classList.toggle("open"));
  list.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => list.classList.remove("open")));
}

// ---------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderStaticContent();
  wireBookInteractions();
  wireMobileNav();
  renderHero();
  renderMenu();
});
