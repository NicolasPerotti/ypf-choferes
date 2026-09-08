(function () {
  const zona = document.getElementById('zona-tabla');
  const contador = document.getElementById('contador');
  const reloj = document.getElementById('reloj');
  const INTERVALO_MS = 6000;

  function actualizarReloj() {
    const ahora = new Date();
    reloj.textContent = ahora.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  setInterval(actualizarReloj, 1000);
  actualizarReloj();

  function horaDe(fechaHora) {
    // fechaHora viene como "YYYY-MM-DD HH:MM:SS"
    return fechaHora.split(' ')[1] ? fechaHora.split(' ')[1].slice(0, 5) : fechaHora;
  }

  function tripulantesTexto(r) {
    let otros = [];
    try {
      otros = JSON.parse(r.otros_tripulantes || '[]');
    } catch (e) {
      otros = [];
    }
    const cantidad = r.cantidad_tripulantes || 1;
    if (cantidad <= 1) return `${cantidad}`;
    const nombres = [escapeHtml(r.aclaracion), ...otros.map(escapeHtml)].join(', ');
    return `${cantidad} <span class="hint" title="${nombres}">(ver nombres)</span>`;
  }

  function render(registros) {
    contador.textContent = registros.length;

    if (!registros.length) {
      zona.innerHTML = '<div class="vacio">Todavía no hay registros hoy.<br>Se van a mostrar acá apenas un chofer complete el formulario.</div>';
      return;
    }

    const filas = registros
      .map((r) => `
        <tr class="${r.entregado ? 'entregado' : ''}" data-id="${r.id}">
          <td data-label="Hora">${horaDe(r.fecha_hora)}</td>
          <td data-label="Empresa">${escapeHtml(r.empresa)}</td>
          <td data-label="Patente">${escapeHtml(r.patente)}</td>
          <td data-label="Chofer/Coord.">${escapeHtml(r.aclaracion)}</td>
          <td data-label="Tripulantes">${tripulantesTexto(r)}</td>
          <td data-label="PAX">${r.pax}</td>
          <td data-label="Estado">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" class="check-entregar" ${r.entregado ? 'checked' : ''} data-id="${r.id}" />
              <span class="badge ${r.entregado ? 'entregado' : 'pendiente'}">${r.entregado ? 'Entregado' : 'Pendiente'}</span>
            </label>
          </td>
        </tr>`)
      .join('');

    zona.innerHTML = `
      <div class="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Hora</th><th>Empresa</th><th>Patente</th><th>Chofer / Coordinador</th><th>Tripulantes</th><th>PAX</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;

    document.querySelectorAll('.check-entregar').forEach((chk) => {
      chk.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const entregado = e.target.checked;
        const fila = e.target.closest('tr');
        fila.classList.toggle('entregado', entregado);
        fila.querySelector('.badge').textContent = entregado ? 'Entregado' : 'Pendiente';
        fila.querySelector('.badge').className = `badge ${entregado ? 'entregado' : 'pendiente'}`;
        try {
          await fetch(`/api/registros/${id}/entregado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entregado }),
          });
        } catch (err) {
          console.error('No se pudo actualizar el estado', err);
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  async function cargar() {
    try {
      const resp = await fetch('/api/registros/hoy');
      const data = await resp.json();
      render(data);
    } catch (err) {
      zona.innerHTML = '<div class="vacio">No se pudo conectar con el servidor. Reintentando...</div>';
    }
  }

  cargar();
  setInterval(cargar, INTERVALO_MS);
})();
