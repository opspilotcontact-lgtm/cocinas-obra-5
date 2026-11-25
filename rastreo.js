(() => {
  if (document.getElementById('oc-panel')) return;
  const KEY = 'oc_rastreo';
  const st = JSON.parse(localStorage.getItem(KEY) || '{"res":{},"cola":[]}');
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));
  const sleep = (ms) => new Promise((z) => setTimeout(z, ms));
  const tienda = () => (document.querySelector('.l-context-header__item-store-name span') || {}).textContent || '?';
  const px = (h) => { const m = h.match(/class="m-price -main">\s*<span[^>]*>\s*([\d.]+)\s*<span class="m-price__decimal">\s*<span>([^<]*)<\/span>/); return m ? parseFloat(m[1].replace('.', '') + (m[2] ? '.' + m[2].replace(/\D/g, '') : '')) : null; };
  const ld = (h) => { for (const m of h.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/g)) { try { const j = JSON.parse(m[1]); if (j['@type'] === 'Product') return j; } catch (e) {} } return {}; };

  const p = document.createElement('div');
  p.id = 'oc-panel';
  p.style.cssText = 'position:fixed;z-index:2147483647;right:12px;bottom:12px;width:340px;background:#fff;border:2px solid #222;padding:10px;font:14px system-ui;box-shadow:0 4px 20px #0004';
  p.innerHTML = '<b>Rastreo de precios</b> <span id="oc-t" style="color:#b00"></span><br>' +
    '<textarea id="oc-in" placeholder="Pega aquí refs (cualquier texto: se cogen los números de 8 cifras)" style="width:100%;height:90px"></textarea>' +
    '<button id="oc-go">Empezar / seguir</button> <button id="oc-stop">Pausa</button> <button id="oc-csv">Descargar CSV</button> <button id="oc-del">Borrar todo</button> <button id="oc-x">×</button>' +
    '<div id="oc-st" style="margin-top:6px"></div>';
  document.body.appendChild(p);
  const $ = (id) => document.getElementById(id);
  let parar = false;
  const pinta = (txt) => { const n = Object.keys(st.res).length; $('oc-st').textContent = `${n} hechas · ${st.cola.length} en cola${txt ? ' · ' + txt : ''}`; };
  $('oc-t').textContent = tienda();
  pinta();

  $('oc-go').onclick = async () => {
    const nuevas = ($('oc-in').value.match(/\b\d{8}\b/g) || []).filter((r) => !st.res[r] && !st.cola.includes(r));
    st.cola.push(...nuevas); $('oc-in').value = ''; save();
    if (!/c[oó]rdoba/i.test(tienda())) { pinta('⚠ la tienda no es Córdoba: cámbiala y recarga'); return; }
    parar = false;
    while (st.cola.length && !parar) {
      const ref = st.cola[0];
      try {
        const r = await fetch('/search?q=' + ref, { credentials: 'include' });
        const h = await r.text();
        const j = ld(h);
        const esFicha = /\/productos\//.test(r.url) && String(j.sku || '') === ref;
        st.res[ref] = { ref, nombre: (j.name || '').replace(/;/g, ','), precio: esFicha ? px(h) : null, ean: j.gtin || '', estado: esFicha ? 'ok' : 'NO EXISTE / no encontrada', url: esFicha ? r.url : '', tienda: tienda(), fecha: new Date().toISOString().slice(0, 10) };
      } catch (e) {
        st.res[ref] = { ref, estado: 'error ' + e, nombre: '', precio: null, ean: '', url: '', tienda: tienda(), fecha: '' };
      }
      st.cola.shift(); save(); pinta(ref);
      await sleep(1500);
    }
    pinta(parar ? 'en pausa' : 'terminado');
  };
  $('oc-stop').onclick = () => { parar = true; };
  $('oc-x').onclick = () => { parar = true; p.remove(); };
  $('oc-del').onclick = () => { if (confirm('¿Borrar resultados y cola?')) { st.res = {}; st.cola = []; save(); pinta(); } };
  $('oc-csv').onclick = () => {
    const filas = [['ref', 'nombre', 'precio_iva', 'ean', 'estado', 'tienda', 'fecha', 'url']].concat(Object.values(st.res).map((x) => [x.ref, x.nombre, x.precio == null ? '' : String(x.precio).replace('.', ','), x.ean, x.estado, x.tienda, x.fecha, x.url]));
    const csv = '﻿' + filas.map((f) => f.join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'precios-obramat-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
  };
})();
