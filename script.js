/* Inventory System — one shared script for every page.
   The <body data-page="..."> value decides which page function runs (see the bottom of this file). */

const KEYS = { products: 'inv_products', categories: 'inv_categories', suppliers: 'inv_suppliers', stockIn: 'inv_stock_in', stockOut: 'inv_stock_out', settings: 'inv_settings' };
const NAV = [['index', 'Dashboard', '📊'], ['products', 'Products', '📦'], ['categories', 'Categories', '🏷️'], ['stock-in', 'Stock In', '📥'], ['stock-out', 'Stock Out', '📤'], ['suppliers', 'Suppliers', '🚚'], ['reports', 'Reports', '📑'], ['settings', 'Settings', '⚙️']];
const LABELS = { in: 'In Stock', low: 'Low Stock', out: 'Out of Stock' };

/* ---------- Storage and small helpers ---------- */
const load = (name, fallback = []) => { try { return JSON.parse(localStorage.getItem(KEYS[name])) ?? fallback; } catch { return fallback; } };
const save = (name, data) => localStorage.setItem(KEYS[name], JSON.stringify(data));
const settings = () => ({ store: 'My Store', address: '', currency: '₱', threshold: 5, ...load('settings', {}) });
const $ = (sel) => document.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const isoDate = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); // local YYYY-MM-DD
const today = () => isoDate(new Date());
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => settings().currency + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const status = (p) => (p.qty <= 0 ? 'out' : p.qty <= p.min ? 'low' : 'in');
const badge = (p) => `<span class="badge ${status(p)}">${LABELS[status(p)]}</span>`;

/* ---------- Demo data (created on first visit, or from Settings → Reset) ---------- */
function seedDemoData() {
  const daysAgo = (n) => isoDate(new Date(Date.now() - n * 864e5));
  save('categories', ['Electronics', 'Food & Beverage', 'Clothing', 'Office Supplies'].map((name, i) => ({ id: 'cat' + i, name })));
  save('suppliers', [
    { id: 'sup0', name: 'TechSource Trading', phone: '0917 123 4567', email: 'sales@techsource.example', address: '12 Rizal Ave, Manila', notes: 'Net 30 terms' },
    { id: 'sup1', name: 'FreshWay Foods', phone: '0928 555 0101', email: 'orders@freshway.example', address: '45 Market Rd, Pampanga', notes: 'Delivers on Tuesdays' },
    { id: 'sup2', name: 'PaperPlus Supply', phone: '0935 777 2020', email: 'hello@paperplus.example', address: '8 Mabini St, Bulacan', notes: '' },
  ]);
  const item = (sku, name, category, supplier, cost, price, qty, min) => ({ id: uid(), sku, name, category, supplier, description: '', cost, price, qty, min, date: daysAgo(120) });
  const products = [
    item('ELEC-001', 'Wireless Mouse', 'Electronics', 'TechSource Trading', 350, 599, 42, 10),
    item('ELEC-002', 'USB-C Cable 1m', 'Electronics', 'TechSource Trading', 90, 199, 8, 15),
    item('ELEC-003', 'Bluetooth Speaker', 'Electronics', 'TechSource Trading', 900, 1499, 0, 5),
    item('FOOD-001', 'Instant Coffee 200g', 'Food & Beverage', 'FreshWay Foods', 120, 185, 60, 20),
    item('FOOD-002', 'Mineral Water 500ml', 'Food & Beverage', 'FreshWay Foods', 12, 20, 150, 48),
    item('CLTH-001', 'Cotton T-Shirt', 'Clothing', '', 180, 350, 25, 10),
    item('OFFC-001', 'A4 Bond Paper (ream)', 'Office Supplies', 'PaperPlus Supply', 210, 290, 4, 10),
    item('OFFC-002', 'Ballpoint Pens (box of 12)', 'Office Supplies', 'PaperPlus Supply', 45, 80, 70, 20),
  ];
  save('products', products);
  save('stockIn', products.map((p, i) => ({ id: uid(), productId: p.id, product: p.name, qty: 20 + i * 5, date: daysAgo(i * 22 + 5), supplier: p.supplier, cost: p.cost, notes: 'Restock' })));
  save('stockOut', products.slice(0, 6).map((p, i) => ({ id: uid(), productId: p.id, product: p.name, qty: 3 + i, date: daysAgo(i * 18 + 2), reason: 'Sale', notes: '' })));
  save('settings', { store: 'My Store', address: '', currency: '₱', threshold: 5 });
}
if (localStorage.getItem(KEYS.products) === null) seedDemoData();

/* ---------- UI helpers: layout, toast, modal, form fields, table ---------- */
function shell(title, actions, body) {
  const s = settings(), page = document.body.dataset.page;
  document.title = `${title} · ${s.store}`;
  $('#app').innerHTML = `
    <aside class="sidebar"><div class="brand"><i>📦</i><span>${esc(s.store)}</span></div>
      <nav>${NAV.map(([file, name, icon]) => `<a href="${file}.html"${file === page ? ' class="active" aria-current="page"' : ''}><i>${icon}</i>${name}</a>`).join('')}</nav>
      <p class="side-foot">Data is saved in this browser</p></aside>
    <div class="overlay"></div>
    <div class="main">
      <header class="topbar"><button class="menu" aria-label="Open menu">☰</button><strong>Inventory Management System</strong>
        <span class="date">${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></header>
      <main class="content"><div class="page-head"><h1>${title}</h1><div>${actions}</div></div>${body}</main>
    </div>`;
  const toggleMenu = () => document.body.classList.toggle('nav-open');
  $('.menu').onclick = toggleMenu;
  $('.overlay').onclick = toggleMenu;
}

function toast(message, type = 'ok') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = message; box.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Opens a form dialog. onSubmit(data) returns an error message to keep it open, or nothing to close it.
function modal(title, body, onSubmit, okText = 'Save') {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<form class="modal"><h3>${title}</h3><div class="form-grid">${body}</div><p class="err" hidden></p>
    <div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">${okText}</button></div></form>`;
  document.body.appendChild(bg);
  bg.querySelector('[data-close]').onclick = () => bg.remove();
  bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
  bg.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const error = onSubmit(Object.fromEntries(new FormData(e.target)));
    if (error) { const p = bg.querySelector('.err'); p.textContent = error; p.hidden = false; } else bg.remove();
  };
  const first = bg.querySelector('input,select,textarea');
  if (first) first.focus();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelector('.modal-bg')?.remove(); });
const confirmBox = (message, onConfirm) => modal('Please confirm', `<p class="full">${message}</p>`, () => { onConfirm(); }, 'Confirm');

// Builds one form field. type: 'text' | 'number' | 'date' | 'area' | an array of options (string or [value, label]).
const F = (label, name, value = '', type = 'text', extra = '') =>
  Array.isArray(type)
    ? `<label>${label}<select name="${name}" ${extra}>${type.map((o) => { const [v, t] = [].concat(o, o); return `<option value="${esc(v)}"${v == value ? ' selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`
    : type === 'area'
      ? `<label class="full">${label}<textarea name="${name}" rows="2">${esc(value)}</textarea></label>`
      : `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;

const table = (heads, rows) =>
  `<div class="table-wrap"><table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${heads.length}" class="empty">Nothing here yet.</td></tr>`}</tbody></table></div>`;

const actionButtons = (id, extra = '') => `<td class="acts">${extra}<button class="btn sm" data-a="edit" data-id="${id}">Edit</button> <button class="btn sm danger" data-a="del" data-id="${id}">Delete</button></td>`;

/* ---------- Dashboard ---------- */
function dashboardPage() {
  const products = load('products'), categories = load('categories'), ins = load('stockIn'), outs = load('stockOut');
  const units = products.reduce((s, p) => s + p.qty, 0);
  const value = products.reduce((s, p) => s + p.qty * p.cost, 0);
  const alerts = products.filter((p) => status(p) !== 'in').sort((a, b) => a.qty - b.qty);
  const stats = [
    ['📦', 'Total products', products.length, ''], ['🏷️', 'Categories', categories.length, ''], ['🧮', 'Total stock', units.toLocaleString(), ''],
    ['💰', 'Inventory value', money(value), ''], ['⚠️', 'Low stock', alerts.filter((p) => status(p) === 'low').length, 'warn'], ['⛔', 'Out of stock', alerts.filter((p) => status(p) === 'out').length, 'bad'],
  ];
  const recent = [...ins.map((t) => ({ ...t, kind: 'in' })), ...outs.map((t) => ({ ...t, kind: 'out' }))].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  shell('Dashboard', '<a class="btn primary" href="stock-in.html">+ Record stock</a>', `
    <div class="stats">${stats.map(([icon, label, val, cls]) => `<div class="stat ${cls}"><div class="ico">${icon}</div><div><b>${val}</b><span>${label}</span></div></div>`).join('')}</div>
    <div class="grid-2">
      <div class="card"><h3>Stock by category</h3><div class="chart-box"><canvas id="c1"></canvas></div></div>
      <div class="card"><h3>Stock in vs. stock out (last 6 months)</h3><div class="chart-box"><canvas id="c2"></canvas></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>Low-stock alerts</h3>${alerts.length ? `<ul class="list">${alerts.map((p) => `<li><div><b>${esc(p.name)}</b><small>${esc(p.sku)} · ${p.qty} left (minimum ${p.min})</small></div>${badge(p)}</li>`).join('')}</ul>` : '<p class="empty">Every product is well stocked.</p>'}</div>
      <div class="card"><h3>Recent activity</h3>${recent.length ? `<ul class="list">${recent.map((t) => `<li><span class="dot ${t.kind}"></span><div><b>${esc(t.product)}</b><small>${t.kind === 'in' ? 'Stock in' : 'Stock out'} · ${t.date}</small></div><strong>${t.kind === 'in' ? '+' : '−'}${t.qty}</strong></li>`).join('')}</ul>` : '<p class="empty">No stock movements yet.</p>'}</div>
    </div>`);

  if (typeof Chart === 'undefined') return; // Chart.js CDN not reachable (offline)
  const palette = ['#2563eb', '#60a5fa', '#1e40af', '#93c5fd', '#0ea5e9', '#94a3b8'];
  new Chart($('#c1'), { type: 'doughnut', data: { labels: categories.map((c) => c.name), datasets: [{ data: categories.map((c) => products.filter((p) => p.category === c.name).reduce((s, p) => s + p.qty, 0)), backgroundColor: palette }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
  const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return { key: isoDate(d).slice(0, 7), label: d.toLocaleString(undefined, { month: 'short' }) }; });
  const monthly = (list) => months.map((m) => list.filter((t) => t.date.startsWith(m.key)).reduce((s, t) => s + t.qty, 0));
  new Chart($('#c2'), { type: 'bar', data: { labels: months.map((m) => m.label), datasets: [{ label: 'Stock in', data: monthly(ins), backgroundColor: '#2563eb' }, { label: 'Stock out', data: monthly(outs), backgroundColor: '#93c5fd' }] }, options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'bottom' } } } });
}

/* ---------- Products ---------- */
function productsPage() {
  const categories = load('categories');
  shell('Products', '<button class="btn primary" id="add">+ Add product</button>', `
    <div class="toolbar">
      <input id="q" type="search" placeholder="Search by name or SKU…" aria-label="Search products">
      <select id="fc" aria-label="Category"><option value="">All categories</option>${categories.map((c) => `<option>${esc(c.name)}</option>`).join('')}</select>
      <select id="fs" aria-label="Status"><option value="">All statuses</option><option value="in">In Stock</option><option value="low">Low Stock</option><option value="out">Out of Stock</option></select>
      <select id="so" aria-label="Sort"><option value="name">Sort by name</option><option value="qty">Sort by quantity</option><option value="price">Sort by price</option></select>
    </div><p class="count" id="count"></p><div id="list"></div>`);

  const draw = () => {
    const q = $('#q').value.toLowerCase(), cat = $('#fc').value, st = $('#fs').value, sort = $('#so').value;
    const rows = load('products')
      .filter((p) => (!q || (p.name + ' ' + p.sku).toLowerCase().includes(q)) && (!cat || p.category === cat) && (!st || status(p) === st))
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'qty' ? a.qty - b.qty : a.price - b.price));
    $('#count').textContent = `${rows.length} product${rows.length === 1 ? '' : 's'}`;
    $('#list').innerHTML = table(['SKU', 'Product', 'Category', 'Qty', 'Price', 'Status', ''], rows.map((p) =>
      `<tr><td>${esc(p.sku)}</td><td><b>${esc(p.name)}</b><small>${esc(p.supplier || 'No supplier')}</small></td><td>${esc(p.category)}</td><td>${p.qty}</td><td>${money(p.price)}</td><td>${badge(p)}</td>${actionButtons(p.id, `<button class="btn sm" data-a="view" data-id="${p.id}">View</button> `)}</tr>`));
  };

  const openForm = (id) => {
    const old = load('products').find((p) => p.id === id) || {}, suppliers = load('suppliers');
    if (!categories.length) return toast('Add a category before adding products.', 'err');
    modal(id ? 'Edit product' : 'Add product',
      F('SKU *', 'sku', old.sku, 'text', 'required maxlength="30"') + F('Product name *', 'name', old.name, 'text', 'required maxlength="80"') +
      F('Category *', 'category', old.category, categories.map((c) => c.name)) + F('Supplier', 'supplier', old.supplier, [['', '— None —'], ...suppliers.map((s) => s.name)]) +
      F('Purchase price *', 'cost', old.cost ?? '', 'number', 'min="0" step="0.01" required') + F('Selling price *', 'price', old.price ?? '', 'number', 'min="0" step="0.01" required') +
      F('Current stock *', 'qty', old.qty ?? 0, 'number', 'min="0" step="1" required') + F('Minimum stock level *', 'min', old.min ?? settings().threshold, 'number', 'min="0" step="1" required') +
      F('Date added', 'date', old.date || today(), 'date') + F('Description', 'description', old.description, 'area'),
      (d) => {
        const list = load('products');
        d.sku = d.sku.trim(); d.name = d.name.trim();
        if (!d.sku || !d.name) return 'SKU and product name are required.';
        if (list.some((p) => p.id !== id && p.sku.toLowerCase() === d.sku.toLowerCase())) return `The SKU "${d.sku}" is already used. Choose a different SKU.`;
        ['cost', 'price', 'qty', 'min'].forEach((k) => (d[k] = Number(d[k])));
        if ([d.cost, d.price, d.qty, d.min].some((n) => !Number.isFinite(n) || n < 0)) return 'Prices and quantities cannot be negative.';
        if (!Number.isInteger(d.qty) || !Number.isInteger(d.min)) return 'Stock quantities must be whole numbers.';
        if (id) Object.assign(list.find((p) => p.id === id), d); else list.push({ id: uid(), ...d });
        save('products', list); draw(); toast(id ? 'Product updated.' : 'Product added.');
      });
  };

  $('#add').onclick = () => openForm();
  ['q', 'fc', 'fs', 'so'].forEach((id) => $('#' + id).addEventListener('input', draw));
  $('#list').onclick = (e) => {
    const btn = e.target.closest('[data-a]'); if (!btn) return;
    const p = load('products').find((x) => x.id === btn.dataset.id);
    if (btn.dataset.a === 'edit') openForm(p.id);
    if (btn.dataset.a === 'del') confirmBox(`Delete "${esc(p.name)}"? Its stock history is kept, but the product cannot be recovered.`, () => { save('products', load('products').filter((x) => x.id !== p.id)); draw(); toast('Product deleted.'); });
    if (btn.dataset.a === 'view') {
      const info = [['SKU', esc(p.sku)], ['Name', esc(p.name)], ['Category', esc(p.category)], ['Supplier', esc(p.supplier || '—')], ['Purchase price', money(p.cost)], ['Selling price', money(p.price)], ['In stock', p.qty], ['Minimum level', p.min], ['Status', badge(p)], ['Date added', p.date], ['Description', esc(p.description || '—')]];
      modal('Product details', `<dl class="details full">${info.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`, () => {}, 'Close');
    }
  };
  draw();
}

/* ---------- Categories and Suppliers (one shared list/add/edit/delete page) ---------- */
function crud(o) {
  shell(o.title, `<button class="btn primary" id="add">+ Add ${o.noun}</button>`, `<div class="toolbar"><input id="q" type="search" placeholder="Search ${o.title.toLowerCase()}…" aria-label="Search"></div><div id="list"></div>`);
  const draw = () => {
    const q = $('#q').value.toLowerCase();
    const rows = load(o.key).filter((i) => Object.values(i).join(' ').toLowerCase().includes(q));
    $('#list').innerHTML = table([...o.cols, ''], rows.map((i) => `<tr>${o.row(i).map((c) => `<td>${c}</td>`).join('')}${actionButtons(i.id)}</tr>`));
  };
  const openForm = (id) => {
    const list = load(o.key), old = list.find((i) => i.id === id) || {};
    modal(`${id ? 'Edit' : 'Add'} ${o.noun}`, o.fields(old), (d) => {
      Object.keys(d).forEach((k) => (d[k] = d[k].trim()));
      if (!d.name) return 'Name is required.';
      if (list.some((i) => i.id !== id && i.name.toLowerCase() === d.name.toLowerCase())) return `A ${o.noun.toLowerCase()} named "${d.name}" already exists.`;
      const error = o.check(d); if (error) return error;
      if (id) {
        if (old.name !== d.name) { const ps = load('products'); ps.forEach((p) => { if (p[o.ref] === old.name) p[o.ref] = d.name; }); save('products', ps); } // keep products linked after a rename
        Object.assign(old, d);
      } else list.push({ id: uid(), ...d });
      save(o.key, list); draw(); toast(`${o.noun} ${id ? 'updated' : 'added'}.`);
    });
  };
  $('#add').onclick = () => openForm();
  $('#q').addEventListener('input', draw);
  $('#list').onclick = (e) => {
    const btn = e.target.closest('[data-a]'); if (!btn) return;
    const item = load(o.key).find((i) => i.id === btn.dataset.id);
    if (btn.dataset.a === 'edit') return openForm(item.id);
    const used = load('products').filter((p) => p[o.ref] === item.name).length;
    if (o.block && used) return toast(`"${item.name}" is assigned to ${used} product${used === 1 ? '' : 's'}. Reassign them before deleting.`, 'err');
    confirmBox(`Delete "${esc(item.name)}"? This cannot be undone.`, () => {
      if (!o.block) { const ps = load('products'); ps.forEach((p) => { if (p[o.ref] === item.name) p[o.ref] = ''; }); save('products', ps); }
      save(o.key, load(o.key).filter((i) => i.id !== item.id)); draw(); toast(`${o.noun} deleted.`);
    });
  };
  draw();
}

const categoryConfig = {
  key: 'categories', title: 'Categories', noun: 'Category', ref: 'category', block: true, cols: ['Category', 'Products'],
  fields: (c) => F('Category name *', 'name', c.name, 'text', 'required maxlength="40"'),
  row: (c) => [`<b>${esc(c.name)}</b>`, load('products').filter((p) => p.category === c.name).length],
  check: () => '',
};
const supplierConfig = {
  key: 'suppliers', title: 'Suppliers', noun: 'Supplier', ref: 'supplier', block: false, cols: ['Supplier', 'Phone', 'Email', 'Address', 'Products supplied'],
  fields: (s) => F('Supplier name *', 'name', s.name, 'text', 'required maxlength="60"') + F('Phone number', 'phone', s.phone, 'tel') + F('Email address', 'email', s.email, 'email') + F('Address', 'address', s.address) + F('Notes', 'notes', s.notes, 'area'),
  row: (s) => { const names = load('products').filter((p) => p.supplier === s.name).map((p) => esc(p.name)); return [`<b>${esc(s.name)}</b><small>${esc(s.notes)}</small>`, esc(s.phone), esc(s.email), esc(s.address), names.length ? names.join(', ') : '—']; },
  check: (d) => (d.email && !/^\S+@\S+\.\S+$/.test(d.email) ? 'Enter a valid email address.' : ''),
};

/* ---------- Stock In / Stock Out (one page function, two modes) ---------- */
function stockPage(isIn) {
  const key = isIn ? 'stockIn' : 'stockOut', products = load('products'), suppliers = load('suppliers');
  const reasons = ['Sale', 'Damaged', 'Expired', 'Lost', 'Internal use', 'Returned to supplier', 'Other'];
  const form = products.length ? `<form id="sf" class="form-grid">
      ${F('Product *', 'productId', '', [['', 'Select a product…'], ...products.map((p) => [p.id, `${p.name} (${p.sku}) — ${p.qty} on hand`])], 'required')}
      ${F('Quantity *', 'qty', '', 'number', 'min="1" step="1" required')}
      ${F('Date *', 'date', today(), 'date', 'required')}
      ${isIn ? F('Supplier', 'supplier', '', [['', '— None —'], ...suppliers.map((s) => s.name)]) + F('Unit cost *', 'cost', '', 'number', 'min="0" step="0.01" required') : F('Reason *', 'reason', '', reasons)}
      ${F('Notes', 'notes', '', 'area')}
      <div class="full"><button class="btn primary">${isIn ? 'Add to stock' : 'Release stock'}</button></div></form>` : '<p class="empty">Add a product first, then record stock here.</p>';
  shell(isIn ? 'Stock In' : 'Stock Out', '', `<div class="card"><h3>${isIn ? 'Record received stock' : 'Record released stock'}</h3>${form}</div><h2 class="sub">History</h2><div id="list"></div>`);

  const rows = load(key).reverse().sort((a, b) => b.date.localeCompare(a.date)).map((t) =>
    `<tr><td>${t.date}</td><td>${esc(t.product)}</td><td>${isIn ? '+' : '−'}${t.qty}</td>${isIn ? `<td>${esc(t.supplier || '—')}</td><td>${money(t.cost)}</td>` : `<td>${esc(t.reason)}</td>`}<td>${esc(t.notes)}</td></tr>`);
  $('#list').innerHTML = table(isIn ? ['Date', 'Product', 'Qty', 'Supplier', 'Unit cost', 'Notes'] : ['Date', 'Product', 'Qty', 'Reason', 'Notes'], rows);

  const f = $('#sf'); if (!f) return;
  f.productId.onchange = () => { const p = products.find((x) => x.id === f.productId.value); if (p && isIn) { f.cost.value = p.cost; f.supplier.value = p.supplier; } };
  f.onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f)), all = load('products'), p = all.find((x) => x.id === d.productId), qty = Number(d.qty), cost = Number(d.cost);
    if (!p) return toast('Select a product.', 'err');
    if (!Number.isInteger(qty) || qty < 1) return toast('Quantity must be a whole number of at least 1.', 'err');
    if (!d.date) return toast('Choose a date.', 'err');
    if (isIn && (d.cost === '' || !(cost >= 0))) return toast('Enter a unit cost of 0 or more.', 'err');
    if (!isIn && qty > p.qty) return toast(`Only ${p.qty} unit${p.qty === 1 ? '' : 's'} of "${p.name}" available.`, 'err');
    p.qty += isIn ? qty : -qty;
    const tx = { id: uid(), productId: p.id, product: p.name, qty, date: d.date, notes: d.notes.trim(), ...(isIn ? { supplier: d.supplier, cost } : { reason: d.reason }) };
    save('products', all); save(key, [...load(key), tx]);
    stockPage(isIn); toast(isIn ? `Added ${qty} × ${p.name} to stock.` : `Released ${qty} × ${p.name}.`);
  };
}

/* ---------- Reports ---------- */
function reportsPage() {
  const types = { inventory: 'Current inventory', low: 'Low-stock products', out: 'Out-of-stock products', in: 'Stock-in history', outs: 'Stock-out history', value: 'Inventory valuation', moves: 'Product movement history' };
  shell('Reports', '<button class="btn" id="print">Print</button><button class="btn primary" id="csv">Export CSV</button>', `
    <div class="toolbar">
      <select id="rt" aria-label="Report">${Object.entries(types).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <select id="rc" aria-label="Category"><option value="">All categories</option>${load('categories').map((c) => `<option>${esc(c.name)}</option>`).join('')}</select>
      <label>From <input type="date" id="rf"></label><label>To <input type="date" id="rto"></label>
    </div><div class="card" id="out"></div>`);
  let current = { name: '', head: [], rows: [] };

  const draw = () => {
    const type = $('#rt').value, cat = $('#rc').value, from = $('#rf').value, to = $('#rto').value, cur = settings().currency;
    const P = load('products').filter((p) => !cat || p.category === cat), ids = new Set(P.map((p) => p.id));
    const inRange = (t) => (!from || t.date >= from) && (!to || t.date <= to) && (!cat || ids.has(t.productId));
    const ins = load('stockIn').filter(inRange), outs = load('stockOut').filter(inRange);
    const sum = (list, fn) => list.reduce((s, x) => s + fn(x), 0), newest = (a, b) => b.date.localeCompare(a.date);
    const stockHead = ['SKU', 'Product', 'Category', 'Qty', 'Minimum'], stockRow = (p) => [p.sku, p.name, p.category, p.qty, p.min];
    let head, rows, note;
    if (type === 'inventory') { head = ['SKU', 'Product', 'Category', 'Qty', 'Status']; rows = P.map((p) => [p.sku, p.name, p.category, p.qty, LABELS[status(p)]]); note = `${P.length} products · ${sum(P, (p) => p.qty)} units`; }
    else if (type === 'low' || type === 'out') { const list = P.filter((p) => status(p) === type); head = stockHead; rows = list.map(stockRow); note = `${list.length} product${list.length === 1 ? '' : 's'}`; }
    else if (type === 'value') { head = ['SKU', 'Product', 'Qty', `Unit cost (${cur})`, `Value (${cur})`]; rows = P.map((p) => [p.sku, p.name, p.qty, p.cost.toFixed(2), (p.qty * p.cost).toFixed(2)]); note = `Total inventory value: ${money(sum(P, (p) => p.qty * p.cost))}`; }
    else if (type === 'in') { head = ['Date', 'Product', 'Qty', 'Supplier', `Unit cost (${cur})`, `Total (${cur})`]; rows = ins.sort(newest).map((t) => [t.date, t.product, t.qty, t.supplier || '', t.cost.toFixed(2), (t.qty * t.cost).toFixed(2)]); note = `${sum(ins, (t) => t.qty)} units received · cost ${money(sum(ins, (t) => t.qty * t.cost))}`; }
    else if (type === 'outs') { head = ['Date', 'Product', 'Qty', 'Reason']; rows = outs.sort(newest).map((t) => [t.date, t.product, t.qty, t.reason]); note = `${sum(outs, (t) => t.qty)} units released`; }
    else { head = ['Date', 'Type', 'Product', 'Qty', 'Details']; rows = [...ins.map((t) => ({ ...t, k: 'Stock in', d: t.supplier || '' })), ...outs.map((t) => ({ ...t, k: 'Stock out', d: t.reason }))].sort(newest).map((t) => [t.date, t.k, t.product, t.qty, t.d]); note = `${rows.length} movements`; }
    current = { name: types[type], head, rows, type };
    $('#out').innerHTML = `<div class="print-head"><h2>${esc(settings().store)} — ${types[type]}</h2><p class="muted">Generated ${today()}${cat ? ' · ' + esc(cat) : ''}</p></div>${table(head, rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`))}<p class="summary">${note}</p>`;
  };

  ['rt', 'rc', 'rf', 'rto'].forEach((id) => $('#' + id).addEventListener('input', draw));
  $('#print').onclick = () => window.print();
  $('#csv').onclick = () => {
    if (!current.rows.length) return toast('There is nothing to export for this report.', 'err');
    const csv = [current.head, ...current.rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
    a.download = `report-${current.type}-${today()}.csv`; a.click(); URL.revokeObjectURL(a.href);
    toast('CSV exported.');
  };
  draw();
}

/* ---------- Settings ---------- */
function settingsPage() {
  const s = settings();
  shell('Settings', '', `
    <form id="sf" class="card form-grid">
      ${F('Store name *', 'store', s.store, 'text', 'required maxlength="50"')}${F('Currency symbol', 'currency', s.currency, ['₱', '$', '€', '£', '¥', '₹'])}
      ${F('Store address', 'address', s.address, 'text', 'maxlength="120"')}${F('Default minimum stock level (for new products)', 'threshold', s.threshold, 'number', 'min="0" step="1" required')}
      <div class="full"><button class="btn primary">Save settings</button></div>
    </form>
    <div class="card"><h3>Data management</h3><p class="muted">All data lives in this browser only. Reset restores the demo sample; erase empties everything.</p>
      <div class="row"><button class="btn" id="reset">Reset demo data</button><button class="btn danger" id="wipe">Erase all data</button></div></div>`);
  $('#sf').onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target)), threshold = Number(d.threshold);
    if (!d.store.trim() || !Number.isInteger(threshold) || threshold < 0) return toast('Enter a store name and a whole-number threshold of 0 or more.', 'err');
    save('settings', { store: d.store.trim(), address: d.address.trim(), currency: d.currency, threshold });
    settingsPage(); toast('Settings saved.');
  };
  $('#reset').onclick = () => confirmBox('Reset to the demo sample data? Your current data will be replaced.', () => { seedDemoData(); settingsPage(); toast('Demo data restored.'); });
  $('#wipe').onclick = () => confirmBox('Erase all products, categories, suppliers and stock history?', () => { ['products', 'categories', 'suppliers', 'stockIn', 'stockOut'].forEach((k) => save(k, [])); toast('All data erased.'); });
}

/* ---------- Start the right page ---------- */
const PAGES = { index: dashboardPage, products: productsPage, categories: () => crud(categoryConfig), suppliers: () => crud(supplierConfig), 'stock-in': () => stockPage(true), 'stock-out': () => stockPage(false), reports: reportsPage, settings: settingsPage };
(PAGES[document.body.dataset.page] || dashboardPage)();
