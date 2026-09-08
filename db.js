const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Si estan definidas TURSO_DATABASE_URL y TURSO_AUTH_TOKEN, los datos se
// guardan en la nube (Turso) y sobreviven aunque el servidor se reinicie o
// se vuelva a desplegar. Si no estan definidas (por ejemplo corriendo en tu
// propia PC), se usa un archivo local en data/registros.db, igual que antes.
const url = process.env.TURSO_DATABASE_URL || `file:${path.join(dataDir, 'registros.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url, authToken });

const FOLIO_INICIAL = parseInt(process.env.FOLIO_INICIAL || '3972', 10);

async function init() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio INTEGER NOT NULL,
      fecha_hora TEXT NOT NULL,
      fecha TEXT NOT NULL,
      empresa TEXT NOT NULL,
      celular_empresa TEXT,
      aclaracion TEXT NOT NULL,
      dni TEXT NOT NULL,
      patente TEXT NOT NULL,
      pax INTEGER NOT NULL,
      firma TEXT NOT NULL,
      entregado INTEGER NOT NULL DEFAULT 0,
      cantidad_tripulantes INTEGER NOT NULL DEFAULT 1,
      otros_tripulantes TEXT NOT NULL DEFAULT '[]'
    )
  `);

  // Migracion: si la tabla ya existia de antes (sin estas columnas), las
  // agrega ahora. Si ya existen, ALTER TABLE tira error y lo ignoramos.
  const migraciones = [
    'ALTER TABLE registros ADD COLUMN cantidad_tripulantes INTEGER NOT NULL DEFAULT 1',
    "ALTER TABLE registros ADD COLUMN otros_tripulantes TEXT NOT NULL DEFAULT '[]'",
  ];
  for (const sql of migraciones) {
    try {
      await client.execute(sql);
    } catch (err) {
      // La columna ya existe: no hay nada que hacer.
    }
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS contador (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ultimo_folio INTEGER NOT NULL
    )
  `);

  const row = await client.execute('SELECT ultimo_folio FROM contador WHERE id = 1');
  if (row.rows.length === 0) {
    await client.execute({
      sql: 'INSERT INTO contador (id, ultimo_folio) VALUES (1, ?)',
      args: [FOLIO_INICIAL - 1],
    });
  }
}

// Promesa que se resuelve cuando la base ya esta lista para usarse.
const listo = init();

async function siguienteFolio() {
  await listo;
  // UPDATE ... RETURNING hace el incremento y la lectura en un solo paso
  // atomico, sin necesidad de una transaccion aparte.
  const res = await client.execute(
    'UPDATE contador SET ultimo_folio = ultimo_folio + 1 WHERE id = 1 RETURNING ultimo_folio'
  );
  return Number(res.rows[0].ultimo_folio);
}

module.exports = { client, listo, siguienteFolio };
