// === DATA MODEL ===
let gridSize = 3; // Default 3x3
let gridData = [];
let activeCellIndex = null;
let currentSettings = { gap: 20, bgColor: '#ffffff' };

// Initialize grid data based on size
function initGridData() {
  const totalCells = gridSize * gridSize;
  gridData = Array(totalCells).fill(null).map((_, i) => ({
    id: i, url: null, scale: 1, x: 0, y: 0
  }));
}

// === DOM ELEMENTS ===
const gridEl = document.getElementById('grid');
const modal = document.getElementById('modal');
const editorPanel = document.getElementById('editorPanel');
const bgColorPicker = document.getElementById('bgColorPicker');
const gapSlider = document.getElementById('gapSlider');
const gapValue = document.getElementById('gapValue');
const gridSizeSelect = document.getElementById('gridSizeSelect');
const zoomControl = document.getElementById('zoomControl');
const panXControl = document.getElementById('panXControl');
const panYControl = document.getElementById('panYControl');
const btnReplace = document.getElementById('btnReplace');
const searchInput = document.getElementById('searchInput');
const btnSearch = document.getElementById('btnSearch');
const resultsGrid = document.getElementById('resultsGrid');
const searchInfo = document.getElementById('searchInfo');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const pasteZone = document.getElementById('pasteZone');
const pastePreview = document.getElementById('pastePreview');
const pasteError = document.getElementById('pasteError');

// === INITIALIZATION ===
function initGrid() {
  gridEl.innerHTML = '';
  gridData.forEach((data, index) => {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.index = index;
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-text';
    placeholder.textContent = `+ Pilih #${index + 1}`;
    cell.appendChild(placeholder);
    cell.addEventListener('click', () => onCellClick(index));
    gridEl.appendChild(cell);
  });
}

function onCellClick(index) {
  activeCellIndex = index;
  document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('active'));
  gridEl.children[index].classList.add('active');
  const data = gridData[index];
  if (!data.url) {
    openModal();
    editorPanel.classList.remove('show');
  } else {
    editorPanel.classList.add('show');
    zoomControl.value = data.scale;
    panXControl.value = data.x;
    panYControl.value = data.y;
  }
}

// === CUSTOMIZATION ===
bgColorPicker.addEventListener('input', (e) => {
  currentSettings.bgColor = e.target.value;
  document.documentElement.style.setProperty('--bg-color', e.target.value);
});
gapSlider.addEventListener('input', (e) => {
  const val = e.target.value;
  currentSettings.gap = parseInt(val);
  gapValue.textContent = val;
  document.documentElement.style.setProperty('--gap-size', val + 'px');
});

// === GRID SIZE CHANGE ===
gridSizeSelect.addEventListener('change', (e) => {
  const newSize = parseInt(e.target.value);
  updateGridSize(newSize);
});

function updateGridSize(newSize) {
  const oldSize = gridSize;
  const oldTotal = oldSize * oldSize;
  const newTotal = newSize * newSize;

  // Preserve existing data
  const oldData = [...gridData];

  gridSize = newSize;

  // Create new grid data array
  gridData = Array(newTotal).fill(null).map((_, i) => {
    // Keep existing data if available
    if (i < oldData.length) {
      return { ...oldData[i], id: i };
    }
    return { id: i, url: null, scale: 1, x: 0, y: 0 };
  });

  // Update CSS custom property for grid columns
  document.documentElement.style.setProperty('--grid-cols', newSize);

  // Calculate cell size for larger grids (auto-adjust)
  const baseCellSize = 150;
  const baseCellSizeMobile = 90;
  const maxWidth = window.innerWidth <= 600 ? 320 : 550;

  let cellSize = baseCellSize;
  let cellSizeMobile = baseCellSizeMobile;

  if (newSize > 3) {
    cellSize = Math.floor((maxWidth - (currentSettings.gap * (newSize - 1))) / newSize);
    cellSizeMobile = Math.floor((320 - (currentSettings.gap * (newSize - 1))) / newSize);
  }

  document.documentElement.style.setProperty('--cell-size', cellSize + 'px');
  document.documentElement.style.setProperty('--cell-size-mobile', cellSizeMobile + 'px');

  // Reset active cell if out of bounds
  if (activeCellIndex !== null && activeCellIndex >= newTotal) {
    activeCellIndex = null;
    editorPanel.classList.remove('show');
  }

  // Re-initialize grid
  initGrid();

  // Re-render cells with images
  gridData.forEach((data, index) => {
    if (data.url) {
      renderCell(index);
    }
  });
}

// === REAL-TIME EDITING ===
function updateActiveImageStyle() {
  if (activeCellIndex === null) return;
  const data = gridData[activeCellIndex];
  const img = gridEl.children[activeCellIndex].querySelector('img');
  if (img) {
    // Transformasi visual di layar
    img.style.transform = `translate(${data.x}px, ${data.y}px) scale(${data.scale})`;
  }
}
[zoomControl, panXControl, panYControl].forEach(input => {
  input.addEventListener('input', () => {
    if (activeCellIndex === null) return;
    const data = gridData[activeCellIndex];
    data.scale = parseFloat(zoomControl.value);
    data.x = parseFloat(panXControl.value);
    data.y = parseFloat(panYControl.value);
    updateActiveImageStyle();
  });
});
btnReplace.addEventListener('click', openModal);

// === MODAL LOGIC ===
function openModal() {
  modal.classList.add('show');
  if (activeCellIndex !== null && !gridData[activeCellIndex].url) searchInput.focus();
}
document.getElementById('btnCloseModal').addEventListener('click', () => modal.classList.remove('show'));
window.switchTab = function (tabName) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + tabName).classList.add('active');
  const btns = document.querySelectorAll('.tab-btn');
  if (tabName === 'search') btns[0].classList.add('active');
  else if (tabName === 'upload') btns[1].classList.add('active');
  else if (tabName === 'paste') btns[2].classList.add('active');

  // Reset paste preview when switching tabs
  if (tabName !== 'paste') {
    pastePreview.classList.remove('show');
    pastePreview.innerHTML = '';
    pasteError.style.display = 'none';
  }
}

async function searchPinterest(query) {
  if (!query) return;
  searchInfo.textContent = 'Loading...'; resultsGrid.innerHTML = '';
  try {
    const res = await fetch(`https://api.ryzumi.vip/api/search/pinterest?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) { searchInfo.textContent = 'Tidak ditemukan.'; return; }
    searchInfo.textContent = `Ada ${data.length} gambar.`;
    data.forEach(item => {
      const div = document.createElement('div'); div.className = 'result-item';
      const img = document.createElement('img'); img.src = item.directLink;
      div.appendChild(img); div.onclick = () => selectImage(item.directLink);
      resultsGrid.appendChild(div);
    });
  } catch (e) { searchInfo.textContent = 'Error koneksi API.'; }
}
btnSearch.addEventListener('click', () => searchPinterest(searchInput.value));
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchPinterest(searchInput.value) });
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (evt) => selectImage(evt.target.result);
    reader.readAsDataURL(file);
  }
  fileInput.value = ''; // reset
});

// === PASTE IMAGE LOGIC ===
function handlePasteImage(e) {
  e.preventDefault();

  const clipboardData = e.clipboardData || window.clipboardData;
  if (!clipboardData) {
    pasteError.textContent = 'Clipboard tidak dapat diakses.';
    pasteError.style.display = 'block';
    return;
  }

  const items = clipboardData.items;
  let imageFile = null;

  // Look for image in clipboard
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      imageFile = items[i].getAsFile();
      break;
    }
  }

  if (!imageFile) {
    pasteError.textContent = 'Tidak ada gambar di clipboard. Copy gambar terlebih dahulu.';
    pasteError.style.display = 'block';
    return;
  }

  if (activeCellIndex === null) {
    pasteError.textContent = 'Pilih sel grid terlebih dahulu.';
    pasteError.style.display = 'block';
    return;
  }

  // Hide error
  pasteError.style.display = 'none';

  // Read the image file
  const reader = new FileReader();
  reader.onload = (evt) => {
    const dataUrl = evt.target.result;

    // Show preview
    pastePreview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
    pastePreview.classList.add('show');

    // Apply to grid after short delay for visual feedback
    setTimeout(() => {
      selectImage(dataUrl);

      // Reset preview after applied
      setTimeout(() => {
        pastePreview.classList.remove('show');
        pastePreview.innerHTML = '';
      }, 300);
    }, 500);
  };
  reader.readAsDataURL(imageFile);
}

// Paste event on paste zone
pasteZone.addEventListener('paste', handlePasteImage);

// Click to focus paste zone
pasteZone.addEventListener('click', (e) => {
  // Don't focus if clicking the mobile button
  if (e.target.id !== 'btnPasteMobile') {
    pasteZone.focus();
  }
});

// Also listen for paste globally when paste tab is active
document.addEventListener('paste', (e) => {
  const activeTab = document.querySelector('.view-section.active');
  if (activeTab && activeTab.id === 'view-paste' && modal.classList.contains('show')) {
    handlePasteImage(e);
  }
});

// === MOBILE PASTE BUTTON ===
const btnPasteMobile = document.getElementById('btnPasteMobile');

async function handleMobilePaste() {
  if (activeCellIndex === null) {
    pasteError.textContent = 'Pilih sel grid terlebih dahulu.';
    pasteError.style.display = 'block';
    return;
  }

  try {
    // Check if Clipboard API is available
    if (!navigator.clipboard || !navigator.clipboard.read) {
      pasteError.textContent = 'Browser tidak mendukung paste gambar. Coba gunakan Upload Galeri.';
      pasteError.style.display = 'block';
      return;
    }

    // Request clipboard permission and read
    const clipboardItems = await navigator.clipboard.read();

    let imageBlob = null;

    for (const item of clipboardItems) {
      // Look for image types
      const imageType = item.types.find(type => type.startsWith('image/'));
      if (imageType) {
        imageBlob = await item.getType(imageType);
        break;
      }
    }

    if (!imageBlob) {
      pasteError.textContent = 'Tidak ada gambar di clipboard. Copy gambar terlebih dahulu.';
      pasteError.style.display = 'block';
      return;
    }

    // Hide error
    pasteError.style.display = 'none';

    // Read the blob as data URL
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;

      // Show preview
      pastePreview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
      pastePreview.classList.add('show');

      // Apply to grid after short delay for visual feedback
      setTimeout(() => {
        selectImage(dataUrl);

        // Reset preview after applied
        setTimeout(() => {
          pastePreview.classList.remove('show');
          pastePreview.innerHTML = '';
        }, 300);
      }, 500);
    };
    reader.readAsDataURL(imageBlob);

  } catch (err) {
    console.error('Clipboard read error:', err);

    // Different error messages based on error type
    if (err.name === 'NotAllowedError') {
      pasteError.textContent = 'Izin clipboard ditolak. Izinkan akses clipboard di browser.';
    } else {
      pasteError.textContent = 'Gagal membaca clipboard. Coba copy ulang gambar atau gunakan Upload Galeri.';
    }
    pasteError.style.display = 'block';
  }
}

btnPasteMobile.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent paste zone click
  handleMobilePaste();
});

function selectImage(url) {
  if (activeCellIndex === null) return;
  // Reset data saat gambar baru dipilih
  gridData[activeCellIndex] = { id: activeCellIndex, url: url, scale: 1, x: 0, y: 0 };
  renderCell(activeCellIndex);
  modal.classList.remove('show');
  onCellClick(activeCellIndex); // Buka editor
}

// === RENDER CELL ===
function renderCell(index) {
  const cell = gridEl.children[index];
  const placeholder = cell.querySelector('.placeholder-text');
  if (placeholder) placeholder.style.display = 'none';

  // Hapus gambar lama jika ada
  const oldImg = cell.querySelector('img');
  if (oldImg) cell.removeChild(oldImg);

  const data = gridData[index];
  if (data.url) {
    const img = document.createElement('img');
    img.src = data.url;
    // CSS .grid-cell img sekarang menangani agar gambar 'contain' secara default
    cell.appendChild(img);
    updateActiveImageStyle(); // Terapkan transform awal (scale 1, pos 0,0)
  }
}

// === SAVE LOGIC ===
document.getElementById('btnSave').addEventListener('click', async () => {
  const btn = document.getElementById('btnSave');
  btn.textContent = 'Merender...'; btn.disabled = true;

  const cellSize = 400; // Resolusi Canvas
  const gap = currentSettings.gap;
  const border = gap;
  const cols = gridSize; const rows = gridSize;
  const totalW = (cols * cellSize) + ((cols - 1) * gap) + (border * 2);
  const totalH = (rows * cellSize) + ((rows - 1) * gap) + (border * 2);

  const canvas = document.createElement('canvas');
  canvas.width = totalW; canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = currentSettings.bgColor; ctx.fillRect(0, 0, totalW, totalH);

  // Estimasi ukuran visual sel di layar (untuk perhitungan rasio geser)
  // Calculate based on current grid size
  const baseCellSize = 150;
  const baseCellSizeMobile = 90;
  const maxWidth = window.innerWidth <= 600 ? 320 : 550;
  let visualCellSize = window.innerWidth <= 600 ? baseCellSizeMobile : baseCellSize;
  if (gridSize > 3) {
    visualCellSize = Math.floor((maxWidth - (currentSettings.gap * (gridSize - 1))) / gridSize);
  }

  const promises = gridData.map((data, idx) => {
    if (!data.url) return Promise.resolve();
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      let src = data.url;
      // Proxy hanya untuk URL eksternal (bukan base64 upload lokal)
      if (src.startsWith('http')) {
        src = `https://wsrv.nl/?url=${encodeURIComponent(src)}&output=png`;
      }
      img.src = src;
      img.onload = () => {
        const cCol = idx % cols;
        const cRow = Math.floor(idx / cols);
        const boxX = border + (cCol * (cellSize + gap));
        const boxY = border + (cRow * (cellSize + gap));

        ctx.save();
        // 1. Clipping Mask (Area Kotak)
        ctx.beginPath(); ctx.rect(boxX, boxY, cellSize, cellSize); ctx.clip();

        // 2. Pindah Pivot ke Tengah Kotak
        const centerX = boxX + cellSize / 2;
        const centerY = boxY + cellSize / 2;
        ctx.translate(centerX, centerY);

        // === LOGIKA SKALA BARU ===
        // Hitung "Base Scale": Skala agar gambar muat utuh (contain) di dalam cellSize
        const scaleToFitW = cellSize / img.width;
        const scaleToFitH = cellSize / img.height;
        // Pilih yang lebih kecil agar gambar masuk sepenuhnya
        const baseScale = Math.min(scaleToFitW, scaleToFitH);

        // Hitung Rasio Geser (visual screen vs canvas resolution)
        const renderRatio = cellSize / visualCellSize;

        // Terapkan Transformasi User di atas Base Scale
        ctx.translate(data.x * renderRatio, data.y * renderRatio);
        // Skala Akhir = Base Scale (agar fit) * User Zoom Slider
        const finalScale = baseScale * data.scale;
        ctx.scale(finalScale, finalScale);

        // Gambar di titik 0,0 relatif (yang sudah di-translate ke tengah kotak)
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        ctx.restore();
        resolve();
      };
      img.onerror = () => { console.warn('Gagal load img index', idx); resolve(); };
    });
  });

  await Promise.all(promises);
  try {
    const link = document.createElement('a');
    link.download = `grid-studio-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0); // Kualitas max
    link.click();
  } catch (err) { alert('Gagal menyimpan. Browser mungkin memblokir.'); }
  finally { btn.textContent = 'Simpan Grid (PNG)'; btn.disabled = false; }
});

initGridData();
initGrid();
switchTab('search');