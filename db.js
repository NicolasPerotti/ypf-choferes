const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'registros.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
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
    entregado INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS contador (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    ultimo_folio INTEGER NOT NULL
  );
`);

// Inicializa el contador de folios si no existe.
// FOLIO_INICIAL define el numero desde el que arranca la numeracion
// (por defecto sigue despues del ultimo folio de papel usado, ej. 3971 -> arranca en 3972).
const FOLIO_INICIAL = parseInt(process.env.FOLIO_INICIAL || '3972', 10);

const row = db.prepare('SELECT ultimo_folio FROM contador WHERE id = 1').get();
if (!row) {
  db.prepare('INSERT INTO contador (id, ultimo_folio) VALUES (1, ?)').run(FOLIO_INICIAL - 1);
}

function siguienteFolio() {
  const tx = db.transaction(() => {
    db.prepare('UPDATE contador SET ultimo_folio = ultimo_folio + 1 WHERE id = 1').run();
    return db.prepare('SELECT ultimo_folio FROM contador WHERE id = 1').get().ultimo_folio;
  });
  return tx();
}

module.exports = { db, siguienteFolio };
