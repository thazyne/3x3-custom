// === DATA MODEL ===
let gridData = Array(9).fill(null).map((_, i) => ({
  id: i, url: null, scale: 1, x: 0, y: 0
}));
let activeCellIndex = null;
let currentSettings = { gap: 20, bgColor: '#ffffff' };

// === DOM ELEMENTS ===
const gridEl = document.getElementById('grid');
const modal = document.getElementById('modal');
const editorPanel = document.getElementById('editorPanel');
const bgColorPicker = document.getElementById('bgColorPicker');
const gapSlider = document.getElementById('gapSlider');
const gapValue = document.getElementById('gapValue');
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
  if (tabName === 'search') btns[0].classList.add('active'); else btns[1].classList.add('active');
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
  const cols = 3; const rows = 3;
  const totalW = (cols * cellSize) + ((cols - 1) * gap) + (border * 2);
  const totalH = (rows * cellSize) + ((rows - 1) * gap) + (border * 2);

  const canvas = document.createElement('canvas');
  canvas.width = totalW; canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = currentSettings.bgColor; ctx.fillRect(0, 0, totalW, totalH);

  // Estimasi ukuran visual sel di layar (untuk perhitungan rasio geser)
  const visualCellSize = window.innerWidth <= 600 ? 90 : 150;

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

initGrid();
switchTab('search');