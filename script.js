// ── Item list ─────────────────────────────────────────────────────────────────
// To load from CSV instead, set USE_CSV = true and place items.csv alongside this file on a web server. CSV format (no header): name,price,maxQty
// Leave maxQty blank for no limit, e.g.: name,price,

const USE_CSV = true;
const CSV_FILE = 'items.csv';

const FALLBACK_ITEMS = [
  { name: 'Coin', price: 1,},,
];
// ─────────────────────────────────────────────────────────────────────────────

let catalogItems = [];
let lines = [];

function parseCSV(text) {
  return text.trim().split(/\r?\n/).filter(r => r.trim()).map(row => {
    const parts = row.split(',');
    const name = parts[0].trim().replace(/^"|"$/g, '');
    const price = parseFloat(parts[1]) || 0;
    const maxQty = parts[2] && parts[2].trim() !== '' ? parseInt(parts[2]) : null;
    return { name, price, maxQty };
  }).filter(item => item.name);
}

function showError(msg) {
  const el = document.getElementById('load-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function init(items) {
  catalogItems = items;
  document.getElementById('load-error').style.display = 'none';
  document.getElementById('calculator-ui').style.display = '';
}

async function loadItems() {
  if (!USE_CSV) {
    init(FALLBACK_ITEMS);
    return;
  }
  try {
    const res = await fetch(CSV_FILE);
    if (!res.ok) throw new Error(`Could not load ${CSV_FILE} (${res.status})`);
    const text = await res.text();
    const items = parseCSV(text);
    if (!items.length) throw new Error(`No valid items found in ${CSV_FILE}`);
    init(items);
  } catch (err) {
    showError(err.message);
  }
}

function freshLine() { return { itemIndex: 0, qty: 1 }; }

function fmt(n) {
  return Math.ceil(n).toLocaleString('en-AU');
}

function resetAll() {
  lines = [];
  renderLines();
}

function addLine() {
  lines.push(freshLine());
  renderLines();
}

function removeLine(i) {
  lines.splice(i, 1);
  renderLines();
}

function buildOptions(selected) {
  return catalogItems.map((item, i) =>
    `<option value="${i}"${i === selected ? ' selected' : ''}>${item.name}</option>`
  ).join('');
}

function updateQty(i, el) {
  const it = catalogItems[lines[i].itemIndex];
  const m = (it && it.maxQty != null) ? it.maxQty : null;
  let v = parseInt(el.value) || 0;
  if (m !== null && v > m) { v = m; el.value = v; }
  lines[i].qty = v;
  updateTotals();
}

function updateSelect(i, el) {
  lines[i].itemIndex = parseInt(el.value);
  const it = catalogItems[lines[i].itemIndex];
  const m = (it && it.maxQty != null) ? it.maxQty : null;
  if (m !== null && lines[i].qty > m) lines[i].qty = m;
  const disp = document.getElementById('display-' + i);
  if (disp) disp.textContent = it ? it.name : '';
  renderLines();
}

function renderLines() {
  const list = document.getElementById('lines-list');
  list.innerHTML = lines.map((line, i) => {
    const item = catalogItems[line.itemIndex];
    const qty = parseInt(line.qty) || 0;
    const total = item ? fmt(item.price * qty) : '0';
    const itemMax = item && item.maxQty != null ? item.maxQty : null;
    return `<div class="line-row" role="listitem">
      <div class="cell">
        <div class="custom-select">
          <div class="custom-select-display" id="display-${i}">${item ? item.name : ''}</div>
          <select aria-label="Item ${i + 1}" onchange="updateSelect(${i}, this)">${buildOptions(line.itemIndex)}</select>
        </div>
        <span class="hint"></span>
      </div>
      <div class="cell cell-qty">
        <input type="number" min="0" step="1" value="${qty}"
          aria-label="Quantity for line ${i + 1}"
          oninput="updateQty(${i}, this)" />
        <span class="hint qty-limit${itemMax !== null ? (qty > itemMax ? ' over' : '') : ''}">${itemMax !== null ? 'max ' + itemMax : ''}</span>
      </div>
      <div class="cell cell-total" style="align-items:flex-end">
        <span class="row-total" aria-label="Line total">${total}</span>
        <span class="hint"></span>
      </div>
      <div class="cell cell-del" style="align-items:center">
        <button class="del-btn" onclick="removeLine(${i})" aria-label="Remove line ${i + 1}">
          <i class="ti ti-x" aria-hidden="true" style="font-size:15px"></i>
        </button>
        <span class="hint"></span>
      </div>
    </div>`;
  }).join('');

  updateTotals();
}

function updateTotals() {
  let grand = 0;
  const resultLines = [];

  lines.forEach((line, i) => {
    const item = catalogItems[line.itemIndex];
    const qty = parseInt(line.qty) || 0;
    const lineTotal = item ? item.price * qty : 0;
    grand += lineTotal;
    const span = document.querySelectorAll('.row-total')[i];
    if (span) span.textContent = fmt(lineTotal) + ' 🟡';
    const limitEl = document.querySelectorAll('.qty-limit')[i];
    if (limitEl && item && item.maxQty != null) {
      limitEl.classList.toggle('over', qty > item.maxQty);
    }
    if (item && qty > 0) {
      resultLines.push(`${item.name} x${qty} = ${fmt(lineTotal)}`);
    }
  });

  document.getElementById('grand-total').textContent = fmt(grand) + ' 🟡';

  const outputBox = document.getElementById('output-box');
  if (resultLines.length) {
     outputBox.value = '## Total: ' +  fmt(grand) + '\n-# ' + resultLines.join(', ');
  } else {
    outputBox.value = '';
  }
}

function copyResult() {
  const box = document.getElementById('output-box');
  if (!box.value) return;
  navigator.clipboard.writeText(box.value).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.classList.add('copied');
    btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Copied';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i> Copy';
    }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadItems();
});
