(function () {
  const cuerpoTabla = document.getElementById('cuerpo-tabla');
  const resumenEl = document.getElementById('resumen');

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function queryFiltros() {
    const p = new URLSearchParams();
    const desde = document.getElementById('f-desde').value;
    const hasta = document.getElementById('f-hasta').value;
    const empresa = document.getElementById('f-empresa').value.trim();
    const patente = document.getElementById('f-patente').value.trim();
    if (desde) p.set('desde', desde);
    if (hasta) p.set('hasta', hasta);
    if (empresa) p.set('empresa', empresa);
    if (patente) p.set('patente', patente);
    return p.toString();
  }

  async function cargarResumen() {
    const resp = await fetch('/api/admin/resumen');
    if (resp.status === 401) return (window.location.href = '/admin/login');
    const r = await resp.json();

    const ranking = r.rankingEmpresas
      .slice(0, 3)
      .map((e) => `${escapeHtml(e.empresa)} (${e.cantidad})`)
      .join(', ') || '—';

    resumenEl.innerHTML = `
      <div class="resumen-item"><div class="valor">${r.colectivosHoy}</div><div class="label">Colectivos hoy</div></div>
      <div class="resumen-item"><div class="valor">${r.paxHoy}</div><div class="label">PAX hoy</div></div>
      <div class="resumen-item"><div class="valor">${r.totalColectivos}</div><div class="label">Colectivos histórico</div></div>
      <div class="resumen-item"><div class="valor">${r.totalPax}</div><div class="label">PAX histórico</div></div>
      <div class="resumen-item" style="grid-column: span 2"><div class="valor" style="font-size:15px">${ranking}</div><div class="label">Empresas más frecuentes</div></div>
    `;
  }

  async function cargarTabla() {
    const qs = queryFiltros();
    const resp = await fetch('/api/admin/registros' + (qs ? '?' + qs : ''));
    if (resp.status === 401) return (window.location.href = '/admin/login');
    const rows = await resp.json();

    if (!rows.length) {
      cuerpoTabla.innerHTML = `<tr><td colspan="10" class="vacio">Sin registros para estos filtros.</td></tr>`;
      return;
    }

    cuerpoTabla.innerHTML = rows
      .map((r) => {
        const [fecha, hora] = r.fecha_hora.split(' ');
        return `
        <tr>
          <td data-label="Folio">${r.folio}</td>
          <td data-label="Fecha">${fecha}</td>
          <td data-label="Hora">${(hora || '').slice(0, 5)}</td>
          <td data-label="Empresa">${escapeHtml(r.empresa)}</td>
          <td data-label="Celular">${escapeHtml(r.celular_empresa)}</td>
          <td data-label="Chofer/Coord.">${escapeHtml(r.aclaracion)}</td>
          <td data-label="DNI">${escapeHtml(r.dni)}</td>
          <td data-label="Patente">${escapeHtml(r.patente)}</td>
          <td data-label="PAX">${r.pax}</td>
          <td data-label="Firma"><img class="firma-mini" src="${r.firma}" data-full="${r.firma}" /></td>
        </tr>`;
      })
      .join('');

    document.querySelectorAll('.firma-mini').forEach((img) => {
      img.addEventListener('click', () => {
        document.getElementById('img-firma-grande').src = img.getAttribute('data-full');
        document.getElementById('modal-firma').style.display = 'flex';
      });
    });
  }

  document.getElementById('btn-filtrar').addEventListener('click', cargarTabla);
  document.getElementById('btn-limpiar').addEventListener('click', () => {
    ['f-desde', 'f-hasta', 'f-empresa', 'f-patente'].forEach((id) => (document.getElementById(id).value = ''));
    cargarTabla();
  });
  document.getElementById('btn-exportar').addEventListener('click', () => {
    const qs = queryFiltros();
    window.location.href = '/api/admin/export.csv' + (qs ? '?' + qs : '');
  });
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  });

  document.getElementById('btn-qr').addEventListener('click', () => {
    document.getElementById('modal-qr').style.display = 'flex';
  });
  document.getElementById('btn-cerrar-qr').addEventListener('click', () => {
    document.getElementById('modal-qr').style.display = 'none';
  });
  document.getElementById('btn-cerrar-firma').addEventListener('click', () => {
    document.getElementById('modal-firma').style.display = 'none';
  });

  cargarResumen();
  cargarTabla();
})();
