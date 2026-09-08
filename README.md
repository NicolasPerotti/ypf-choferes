# Registro de Choferes y Coordinadores — YPF Full

Reemplaza el formulario de papel "CHOFERES Y COORDINADORES" por una app web
con tres partes:

1. **Formulario** (`/form`) — lo completa el chofer/coordinador desde su
   celular al escanear el QR fijo. Sin login. Incluye firma digital con el dedo.
2. **Panel de vendedores** (`/vendedores`) — pantalla de solo lectura, sin
   login, que se actualiza sola cada 6 segundos, para saber a quién entregarle
   la comida. Permite tildar "entregado".
3. **Panel de administración** (`/admin`) — histórico completo, filtros por
   fecha/empresa/patente, resumen de totales y exportación a CSV (se abre
   directo en Excel). Protegido con una contraseña simple.

Los datos quedan guardados en una base **SQLite real** (archivo
`data/registros.db`), no en memoria del navegador, así que sobreviven a
reinicios y quedan disponibles para el histórico.

## 1. Requisitos

- Node.js 18 o superior instalado en la PC/servidor de la estación.
  Se puede descargar gratis de https://nodejs.org (elegir la versión LTS).

## 2. Instalación (una sola vez)

Abrir una terminal dentro de esta carpeta y ejecutar:

```bash
npm install
```

Esto descarga las dependencias necesarias (Express, SQLite, generador de QR).

## 3. Configuración (opcional pero recomendado)

Antes de arrancar por primera vez, se puede definir:

- **Contraseña de administrador** (por defecto es `ypf2024`, cambiarla).
- **Número de folio inicial** (por defecto arranca en `3972`, es decir, sigue
  después del último folio de papel usado, ej. si el papel llegó hasta el
  N° 3971).

En Windows (PowerShell), antes de iniciar:

```powershell
$env:ADMIN_PASSWORD="elegir-una-clave"
$env:FOLIO_INICIAL="3972"
npm start
```

En Mac/Linux:

```bash
ADMIN_PASSWORD="elegir-una-clave" FOLIO_INICIAL="3972" npm start
```

Si no se define nada, arranca igual con los valores por defecto (se puede
cambiar más adelante, siempre y cuando no se haya usado ya el contador).

## 4. Arrancar la aplicación

```bash
npm start
```

Va a mostrar algo como:

```
YPF Choferes y Coordinadores corriendo en http://localhost:3000
Formulario:  http://localhost:3000/form
Vendedores:  http://localhost:3000/vendedores
Admin:       http://localhost:3000/admin  (password: ypf2024)
```

Dejar esa ventana abierta (o correrlo como servicio/con PM2 — ver abajo) para
que la app siga funcionando.

## 5. Uso diario

- **QR para pegar en el mostrador**: entrar a `/admin`, ingresar la
  contraseña y tocar "Ver / imprimir QR". El QR apunta siempre a
  `http://<direccion-del-servidor>:3000/form`. Imprimirlo una sola vez y
  pegarlo en la isla de Full — sirve para todas las empresas.
- **Pantalla de vendedores**: dejar abierta en una tablet o notebook del
  mostrador la dirección `http://<direccion-del-servidor>:3000/vendedores`.
  Se actualiza sola.
- **Reporte administrativo**: `http://<direccion-del-servidor>:3000/admin`.

### Importante sobre la dirección IP

Si el formulario se va a usar desde celulares distintos a la PC donde corre
el servidor (lo normal, ya que el chofer escanea el QR con su propio
celular), la PC/servidor y los celulares deben estar en la **misma red WiFi**
de la estación, y hay que reemplazar `localhost` por la **IP local de la PC**
(ej. `http://192.168.1.50:3000/form`) tanto en el QR como en los links que se
compartan. La IP local se puede ver con `ipconfig` (Windows) o `ifconfig` /
`ip a` (Mac/Linux).

Si se prefiere que sea accesible desde cualquier lado (por ejemplo, correrlo
en un servidor en la nube con un dominio propio), se puede desplegar en
cualquier proveedor que soporte Node.js (Render, Railway, un VPS, etc.) — en
ese caso usar la URL pública en lugar de la IP local.

## 6. Mantener la app siempre corriendo (recomendado)

Para que no dependa de dejar una terminal abierta, se puede usar **PM2**:

```bash
npm install -g pm2
pm2 start server.js --name ypf-choferes
pm2 save
pm2 startup   # sigue las instrucciones que muestra para que arranque solo con la PC
```

## 7. Respaldo de datos

Toda la información vive en el archivo `data/registros.db`. Conviene
copiarlo periódicamente (por ejemplo a un pendrive o carpeta en la nube) como
respaldo. También se puede exportar todo el histórico a CSV desde el panel
de administración cuando se necesite.

## 8. Estructura del proyecto

```
├── server.js              # Servidor Express con todas las rutas
├── db.js                  # Conexión y esquema de SQLite
├── views/
│   ├── form.html           # Formulario del chofer/coordinador
│   ├── vendedores.html     # Panel de vendedores (solo lectura)
│   ├── admin-login.html    # Login de administración
│   └── admin.html          # Panel de administración
├── public/
│   ├── css/style.css       # Estilos (identidad YPF: negro/blanco/azul)
│   └── js/
│       ├── form.js          # Validación + firma digital (canvas)
│       ├── vendedores.js    # Polling en tiempo real + marcar entregado
│       └── admin.js         # Filtros, resumen, export CSV, ver firmas
└── data/registros.db       # Base de datos (se crea sola al arrancar)
```

## 9. Preguntas frecuentes

**¿Puedo cambiar los colores o el estilo?**
Sí, todo está en `public/css/style.css`, con variables al principio del
archivo (`--ypf-azul`, `--ypf-negro`, etc.).

**¿Puedo agregar más campos al formulario?**
Sí. Hay que agregarlos en `views/form.html`, en la validación de
`public/js/form.js`, en la tabla `registros` de `db.js`, y en el insert de
`server.js` (`/api/registros`).

**¿El campo "Celular de contacto" es obligatorio?**
No, quedó como opcional según lo indicado en la consigna. Si se quiere hacer
obligatorio, se agrega a la lista de validaciones en `form.js` y `server.js`.
