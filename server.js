const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');
const QRCode = require('qrcode');
const { client, listo, siguienteFolio } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ypf2024';
const SESSION_SECRET = process.env.SESSION_SECRET || 'cambiar-este-secreto-en-produccion';
const TZ = 'America/Argentina/Buenos_Aires';
const ES_PRODUCCION = process.env.NODE_ENV === 'production';

// Necesario cuando la app corre detras de un proxy (Railway, Render, etc.)
// para que Express detecte correctamente https y la IP real del cliente.
app.set('trust proxy', 1);

app.use(express.json({ limit: '5mb' })); // la firma va como dataURL base64
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  cookieSession({
    name: 'ypf_session',
    secret: SESSION_SECRET,
    maxAge: 12 * 60 * 60 * 1000, // 12hs
    secure: ES_PRODUCCION, // cookie solo por HTTPS en produccion
    sameSite: 'lax',
  })
);

// ---------- Helpers ----------
function fechaHoyStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
}
function fechaHoraStr() {
  const d = new Date();
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
  return { fecha, fechaHora: `${fecha} ${hora}` };
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'No autorizado' });
  return res.redirect('/admin/login');
}
function sendView(res, file) {
  res.sendFile(path.join(__dirname, 'views', file));
}

// ---------- Formulario publico (chofer/coordinador) ----------
app.get('/', (req, res) => res.redirect('/form'));
app.get('/form', (req, res) => sendView(res, 'form.html'));

app.post('/api/registros', async (req, res) => {
  try {
    const { empresa, celular_empresa, aclaracion, dni, patente, pax, firma } = req.body;

    const errores = [];
    if (!empresa || !String(empresa).trim()) errores.push('empresa');
    if (!aclaracion || !String(aclaracion).trim()) errores.push('aclaracion');
    if (!dni || !String(dni).trim()) errores.push('dni');
    if (!patente || !String(patente).trim()) errores.push('patente');
    if (pax === undefined || pax === null || pax === '' || isNaN(Number(pax)) || Number(pax) <= 0)
      errores.push('pax');
    if (!firma || !String(firma).startsWith('data:image')) errores.push('firma');

    if (errores.length) {
      return res.status(400).json({ error: 'Faltan campos obligatorios', campos: errores });
    }

    const folio = await siguienteFolio();
    const { fecha, fechaHora } = fechaHoraStr();

    const info = await client.execute({
      sql: `INSERT INTO registros
        (folio, fecha_hora, fecha, empresa, celular_empresa, aclaracion, dni, patente, pax, firma, entregado)
        VALUES (?,?,?,?,?,?,?,?,?,?,0)`,
      args: [
        folio,
        fechaHora,
        fecha,
        String(empresa).trim(),
        celular_empresa ? String(celular_empresa).trim() : '',
        String(aclaracion).trim(),
        String(dni).trim(),
        String(patente).trim().toUpperCase(),
        Number(pax),
        firma,
      ],
    });

    res.json({ ok: true, id: Number(info.lastInsertRowid), folio, fecha_hora: fechaHora });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno al guardar el registro' });
  }
});

// ---------- Panel de vendedores (solo lectura, sin login) ----------
app.get('/vendedores', (req, res) => sendView(res, 'vendedores.html'));

app.get('/api/registros/hoy', async (req, res) => {
  try {
    const hoy = fechaHoyStr();
    const result = await client.execute({
      sql: `SELECT id, folio, fecha_hora, empresa, celular_empresa, aclaracion, patente, pax, entregado
            FROM registros WHERE fecha = ? ORDER BY id DESC`,
      args: [hoy],
    });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al leer los registros de hoy' });
  }
});

app.patch('/api/registros/:id/entregado', async (req, res) => {
  try {
    const { id } = req.params;
    const { entregado } = req.body;
    await client.execute({
      sql: 'UPDATE registros SET entregado = ? WHERE id = ?',
      args: [entregado ? 1 : 0, id],
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el registro' });
  }
});

// ---------- QR ----------
app.get('/api/qr.png', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}/form`;
  res.type('png');
  QRCode.toFileStream(res, baseUrl, { width: 600, margin: 2 });
});

// ---------- Admin ----------
app.get('/admin/login', (req, res) => sendView(res, 'admin-login.html'));

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Contraseña incorrecta' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get('/admin', requireAdmin, (req, res) => sendView(res, 'admin.html'));

app.get('/api/admin/registros', requireAdmin, async (req, res) => {
  try {
    const { desde, hasta, empresa, patente } = req.query;
    let sql = 'SELECT * FROM registros WHERE 1=1';
    const params = [];
    if (desde) {
      sql += ' AND fecha >= ?';
      params.push(desde);
    }
    if (hasta) {
      sql += ' AND fecha <= ?';
      params.push(hasta);
    }
    if (empresa) {
      sql += ' AND empresa LIKE ?';
      params.push(`%${empresa}%`);
    }
    if (patente) {
      sql += ' AND patente LIKE ?';
      params.push(`%${patente.toUpperCase()}%`);
    }
    sql += ' ORDER BY id DESC';
    const result = await client.execute({ sql, args: params });
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al leer los registros' });
  }
});

app.get('/api/admin/resumen', requireAdmin, async (req, res) => {
  try {
    const hoy = fechaHoyStr();

    const [totalRes, paxRes, hoyRes, paxHoyRes, rankingRes, porDiaRes] = await Promise.all([
      client.execute('SELECT COUNT(*) c FROM registros'),
      client.execute('SELECT COALESCE(SUM(pax),0) s FROM registros'),
      client.execute({ sql: 'SELECT COUNT(*) c FROM registros WHERE fecha = ?', args: [hoy] }),
      client.execute({ sql: 'SELECT COALESCE(SUM(pax),0) s FROM registros WHERE fecha = ?', args: [hoy] }),
      client.execute(
        `SELECT empresa, COUNT(*) cantidad, SUM(pax) pax_total
         FROM registros GROUP BY empresa ORDER BY cantidad DESC LIMIT 10`
      ),
      client.execute(
        `SELECT fecha, COUNT(*) cantidad, SUM(pax) pax_total
         FROM registros GROUP BY fecha ORDER BY fecha DESC LIMIT 30`
      ),
    ]);

    res.json({
      totalColectivos: Number(totalRes.rows[0].c),
      totalPax: Number(paxRes.rows[0].s),
      colectivosHoy: Number(hoyRes.rows[0].c),
      paxHoy: Number(paxHoyRes.rows[0].s),
      rankingEmpresas: rankingRes.rows,
      porDia: porDiaRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular el resumen' });
  }
});

app.get('/api/admin/export.csv', requireAdmin, async (req, res) => {
 try {
  const { desde, hasta, empresa, patente } = req.query;
  let sql = 'SELECT * FROM registros WHERE 1=1';
  const params = [];
  if (desde) {
    sql += ' AND fecha >= ?';
    params.push(desde);
  }
  if (hasta) {
    sql += ' AND fecha <= ?';
    params.push(hasta);
  }
  if (empresa) {
    sql += ' AND empresa LIKE ?';
    params.push(`%${empresa}%`);
  }
  if (patente) {
    sql += ' AND patente LIKE ?';
    params.push(`%${patente.toUpperCase()}%`);
  }
  sql += ' ORDER BY id DESC';
  const result = await client.execute({ sql, args: params });
  const rows = result.rows;

  const headers = [
    'folio',
    'fecha_hora',
    'empresa',
    'celular_empresa',
    'aclaracion',
    'dni',
    'patente',
    'pax',
    'entregado',
  ];
  const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(';')];
  for (const r of rows) {
    lines.push(
      [
        r.folio,
        r.fecha_hora,
        r.empresa,
        r.celular_empresa,
        r.aclaracion,
        r.dni,
        r.patente,
        r.pax,
        r.entregado ? 'SI' : 'NO',
      ]
        .map(csvEscape)
        .join(';')
    );
  }
  const csv = '\uFEFF' + lines.join('\n'); // BOM para que Excel abra bien los acentos
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="registros_choferes.csv"`);
  res.send(csv);
 } catch (err) {
  console.error(err);
  res.status(500).send('Error al exportar los datos');
 }
});

listo
  .then(() => {
    app.listen(PORT, () => {
      console.log(`YPF Choferes y Coordinadores corriendo en http://localhost:${PORT}`);
      console.log(`Formulario:  http://localhost:${PORT}/form`);
      console.log(`Vendedores:  http://localhost:${PORT}/vendedores`);
      console.log(`Admin:       http://localhost:${PORT}/admin  (password: ${ADMIN_PASSWORD})`);
    });
  })
  .catch((err) => {
    console.error('No se pudo inicializar la base de datos:', err);
    process.exit(1);
  });
