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

  // ---- Cantidad de tripulantes + pedido de comida de cada uno ----
  const selectCantidad = document.getElementById('cantidad_tripulantes');
  const wrapOtros = document.getElementById('otros-tripulantes-wrap');

  const PRODUCTOS = [
    'Combo de Café',
    'Combo de Hamb. Simple con Queso',
    'Combo de Hamb. Simple con Huevo',
    'Combo de Hamb. Doble',
    'Combo de Hamb. Doble con Huevo',
    'Combo de Ensalada',
  ];
  const TIPOS_CAFE = ['Cafe + 2 medialunas', 'Cafe con leche + 2 medialunas'];

  function crearSelect(id, opciones, placeholder) {
    const select = document.createElement('select');
    select.id = id;
    const optPlaceholder = document.createElement('option');
    optPlaceholder.value = '';
    optPlaceholder.textContent = placeholder;
    select.appendChild(optPlaceholder);
    opciones.forEach((op) => {
      const opt = document.createElement('option');
      opt.value = op;
      opt.textContent = op;
      select.appendChild(opt);
    });
    return select;
  }

  function actualizarSubcampoProducto(indice) {
    const producto = document.getElementById(`producto_${indice}`).value;
    const wrapSub = document.getElementById(`subcampo_wrap_${indice}`);
    wrapSub.innerHTML = '';

    if (producto === 'Combo de Café') {
      const label = document.createElement('label');
      label.innerHTML = 'Tipo de café <span class="req">*</span>';
      const select = crearSelect(`tipo_cafe_${indice}`, TIPOS_CAFE, 'Seleccioná...');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'msg-error';
      errorDiv.id = `err-tipo_cafe_${indice}`;
      errorDiv.textContent = 'Elegí el tipo de café.';
      select.addEventListener('change', () => ocultarError(`tipo_cafe_${indice}`));
      wrapSub.appendChild(label);
      wrapSub.appendChild(select);
      wrapSub.appendChild(errorDiv);
    }
  }

  function crearBloqueTripulante(indice, esVos) {
    const card = document.createElement('div');
    card.className = 'tripulante-card';

    const titulo = document.createElement('h4');
    titulo.textContent = esVos ? `Tripulante ${indice} (vos)` : `Tripulante ${indice}`;
    card.appendChild(titulo);

    if (!esVos) {
      const idCampo = `otro_tripulante_${indice}`;
      const label = document.createElement('label');
      label.innerHTML = 'Nombre y apellido <span class="req">*</span>';
      const input = document.createElement('input');
      input.type = 'text';
      input.id = idCampo;
      input.className = 'otro-tripulante-input';
      input.autocomplete = 'off';
      input.placeholder = 'Nombre y apellido completo';
      const errorDiv = document.createElement('div');
      errorDiv.className = 'msg-error';
      errorDiv.id = `err-${idCampo}`;
      errorDiv.textContent = 'Ingresá el nombre de este tripulante.';
      input.addEventListener('input', () => ocultarError(idCampo));
      card.appendChild(label);
      card.appendChild(input);
      card.appendChild(errorDiv);
    }

    const labelProducto = document.createElement('label');
    labelProducto.innerHTML = 'Comida / desayuno <span class="req">*</span>';
    const selectProducto = crearSelect(`producto_${indice}`, PRODUCTOS, 'Seleccioná...');
    const errorProducto = document.createElement('div');
    errorProducto.className = 'msg-error';
    errorProducto.id = `err-producto_${indice}`;
    errorProducto.textContent = 'Elegí una opción.';
    selectProducto.addEventListener('change', () => {
      ocultarError(`producto_${indice}`);
      actualizarSubcampoProducto(indice);
    });

    const subWrap = document.createElement('div');
    subWrap.id = `subcampo_wrap_${indice}`;

    card.appendChild(labelProducto);
    card.appendChild(selectProducto);
    card.appendChild(errorProducto);
    card.appendChild(subWrap);

    wrapOtros.appendChild(card);
  }

  function regenerarCamposTripulantes() {
    const cantidad = parseInt(selectCantidad.value, 10);
    wrapOtros.innerHTML = '';
    if (!cantidad) return;

    for (let i = 1; i <= cantidad; i++) {
      crearBloqueTripulante(i, i === 1);
    }
  }

  selectCantidad.addEventListener('change', () => {
    ocultarError('cantidad_tripulantes');
    regenerarCamposTripulantes();
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

    // Cantidad de tripulantes
    const cantidadTripulantesVal = selectCantidad.value;
    if (!cantidadTripulantesVal) {
      mostrarError('cantidad_tripulantes');
      valido = false;
    } else {
      ocultarError('cantidad_tripulantes');
    }
    const cantidadTripulantes = parseInt(cantidadTripulantesVal, 10) || 0;

    // Nombres y pedido de comida de cada tripulante (campos generados dinamicamente)
    const tripulantes = [];
    for (let i = 1; i <= cantidadTripulantes; i++) {
      let nombre;
      if (i === 1) {
        nombre = valores.aclaracion; // el que completa el formulario
      } else {
        const idCampo = `otro_tripulante_${i}`;
        const input = document.getElementById(idCampo);
        nombre = input ? input.value.trim() : '';
        if (!nombre) {
          mostrarError(idCampo);
          valido = false;
        } else {
          ocultarError(idCampo);
        }
      }

      const selectProducto = document.getElementById(`producto_${i}`);
      const producto = selectProducto ? selectProducto.value : '';
      if (!producto) {
        mostrarError(`producto_${i}`);
        valido = false;
      } else {
        ocultarError(`producto_${i}`);
      }

      let detalle = null;
      if (producto === 'Combo de Café') {
        const selectCafe = document.getElementById(`tipo_cafe_${i}`);
        detalle = selectCafe ? selectCafe.value : '';
        if (!detalle) {
          mostrarError(`tipo_cafe_${i}`);
          valido = false;
        } else {
          ocultarError(`tipo_cafe_${i}`);
        }
      }

      tripulantes.push({ nombre, producto, detalle });
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
      cantidad_tripulantes: cantidadTripulantes,
      tripulantes: tripulantes,
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
    wrapOtros.innerHTML = '';
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, 200);
    tieneTrazo = false;
    document.getElementById('vista-confirmacion').style.display = 'none';
    document.getElementById('vista-form').style.display = 'block';
  });
})();
