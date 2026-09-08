(function () {
  const canvas = document.getElementById('firma-canvas');
  const ctx = canvas.getContext('2d');
  const firmaWrap = document.getElementById('firma-wrap');
  let dibujando = false;
  let tieneTrazo = false;
  let ultimoPunto = null;

  function ajustarCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const imgPrevia = tieneTrazo ? canvas.toDataURL() : null;
    canvas.width = rect.width * ratio;
    canvas.height = 200 * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111111';
    if (imgPrevia) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, 200);
      img.src = imgPrevia;
    }
  }
  window.addEventListener('resize', ajustarCanvas);
  ajustarCanvas();

  function posDesdeEvento(e) {
    const rect = canvas.getBoundingClientRect();
    const punto = e.touches ? e.touches[0] : e;
    return { x: punto.clientX - rect.left, y: punto.clientY - rect.top };
  }

  function empezar(e) {
    e.preventDefault();
    dibujando = true;
    tieneTrazo = true;
    ultimoPunto = posDesdeEvento(e);
  }
  function mover(e) {
    if (!dibujando) return;
    e.preventDefault();
    const p = posDesdeEvento(e);
    ctx.beginPath();
    ctx.moveTo(ultimoPunto.x, ultimoPunto.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ultimoPunto = p;
  }
  function terminar() {
    dibujando = false;
  }

  canvas.addEventListener('mousedown', empezar);
  canvas.addEventListener('mousemove', mover);
  window.addEventListener('mouseup', terminar);
  canvas.addEventListener('touchstart', empezar, { passive: false });
  canvas.addEventListener('touchmove', mover, { passive: false });
  canvas.addEventListener('touchend', terminar);

  document.getElementById('limpiar-firma').addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, 200);
    tieneTrazo = false;
    firmaWrap.classList.remove('error');
    ocultarError('firma');
  });

  function mostrarError(campo) {
    document.getElementById('err-' + campo).classList.add('show');
    const el = document.getElementById(campo);
    if (el) el.classList.add('error');
  }
  function ocultarError(campo) {
    document.getElementById('err-' + campo).classList.remove('show');
    const el = document.getElementById(campo);
    if (el) el.classList.remove('error');
  }

  const campos = ['empresa', 'aclaracion', 'dni', 'patente', 'pax'];
  campos.forEach((c) => {
    document.getElementById(c).addEventListener('input', () => ocultarError(c));
  });

  const form = document.getElementById('formulario');
  const btnEnviar = document.getElementById('btn-enviar');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let valido = true;
    const valores = {};
    campos.forEach((c) => {
      const v = document.getElementById(c).value.trim();
      valores[c] = v;
      if (!v) {
        mostrarError(c);
        valido = false;
      } else {
        ocultarError(c);
      }
    });
    if (valores.pax && (isNaN(Number(valores.pax)) || Number(valores.pax) <= 0)) {
      mostrarError('pax');
      valido = false;
    }

    if (!tieneTrazo) {
      mostrarError('firma');
      firmaWrap.classList.add('error');
      valido = false;
    } else {
      ocultarError('firma');
      firmaWrap.classList.remove('error');
    }

    if (!valido) {
      const primerError = document.querySelector('.msg-error.show');
      if (primerError) primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    const payload = {
      empresa: valores.empresa,
      celular_empresa: document.getElementById('celular_empresa').value.trim(),
      aclaracion: valores.aclaracion,
      dni: valores.dni,
      patente: valores.patente,
      pax: Number(valores.pax),
      firma: canvas.toDataURL('image/png'),
    };

    try {
      const resp = await fetch('/api/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al enviar');

      document.getElementById('folio-confirmacion').textContent = `N° de folio: ${data.folio}`;
      document.getElementById('vista-form').style.display = 'none';
      document.getElementById('vista-confirmacion').style.display = 'block';
    } catch (err) {
      alert('Hubo un problema al enviar el registro. Probá de nuevo. ' + err.message);
    } finally {
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar registro';
    }
  });

  document.getElementById('btn-nuevo').addEventListener('click', () => {
    form.reset();
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, 200);
    tieneTrazo = false;
    document.getElementById('vista-confirmacion').style.display = 'none';
    document.getElementById('vista-form').style.display = 'block';
  });
})();
