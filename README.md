# L-Forms

Constructor de formularios con firma electrónica, construido sobre Next.js 16 y Supabase.
Replica el flujo de trabajo de Google Forms —galería de plantillas, editor, vista pública,
panel de respuestas y configuración— con identidad visual propia y diseño flat.

---

## Puesta en marcha

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre http://localhost:3000. Con la configuración por defecto (`NEXT_PUBLIC_DATA_SOURCE=mock`)
no necesitas backend: los datos viven en el navegador y hay contenido de ejemplo precargado.

**Cuenta de prueba del modo mock:** `demo@l-forms.app` / `demo1234`

### Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm start` | Sirve la compilación |
| `npm test` | Pruebas de la lógica de negocio (Vitest) |
| `npm run typecheck` | Comprobación de tipos sin emitir |

> La compilación descarga Inter y Space Grotesk desde Google Fonts. Si compilas detrás de un
> proxy sin salida a `fonts.googleapis.com`, define `HTTPS_PROXY` o sustituye `next/font/google`
> por `next/font/local`.

---

## Conectar Supabase

1. En tu proyecto de Supabase, abre el editor SQL y ejecuta las migraciones **en orden**:
   `0001_init.sql` y después `0002_questions_and_collaborators.sql`. Entre las dos crean las
   tablas, los índices, las políticas RLS, el bucket de Storage y el trigger que genera el
   perfil al registrarse. Si ya habías ejecutado la primera, la segunda copia tus datos
   existentes a las tablas nuevas antes de eliminar la columna antigua.
2. Copia la URL del proyecto y la **anon key** (Settings → API) en tu `.env.local`:

```env
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_BUCKET=l-forms
```

3. Reinicia el servidor. No hay que tocar ningún componente: la aplicación solo conoce la
   interfaz `DataSource`.

La `service_role` key **no se usa en este proyecto** y no debe llegar nunca al cliente ni al
repositorio. Toda la protección se apoya en las políticas RLS.

### Modelo de seguridad

| Quién | Puede |
| --- | --- |
| Autor autenticado | Leer, crear, editar y borrar sus formularios, secciones, preguntas, colaboradores y las respuestas que reciban |
| Cualquiera (anónimo) | Leer un formulario **publicado** con sus secciones y preguntas, y enviar una respuesta |
| Colaborador invitado | Ver la invitación que lleva su correo |
| Cualquiera | Nada sobre formularios en borrador ni sobre respuestas ajenas |

### Tablas

| Tabla | Contiene |
| --- | --- |
| `profiles` | Perfil de cada cuenta, creado por trigger al registrarse |
| `forms` | Título, descripción, tema, ajustes, estado y `spreadsheet_id` |
| `sections` | Una fila por sección, con su posición y su ruta de salida |
| `questions` | **Una fila por pregunta**, con tipo, obligatoriedad, posición, puntos, clave de respuesta y lógica condicional |
| `responses` | Una fila por envío, con las respuestas en JSONB |
| `form_collaborators` | Invitaciones por formulario, con permiso de edición o solo lectura |

En `questions`, lo que cambia según el tipo (opciones, filas, columnas, escala, configuración de
firma, validación, medios) vive en la columna `config` en JSONB. Lo que se consulta o se filtra
—tipo, título, obligatoriedad, posición, puntos— tiene columna propia.

---

## Funcionalidades

**Acceso.** Registro e inicio de sesión con correo y contraseña, rutas protegidas y cierre de sesión.

**Inicio.** Galería de ocho plantillas, buscador, orden por fecha o nombre, vista de cuadrícula o
lista, y menú por formulario con abrir, renombrar, duplicar y eliminar.

**Editor.** Trece tipos de pregunta:

| | |
| --- | --- |
| Respuesta corta | Párrafo |
| Opción múltiple | Casillas |
| Desplegable | Subida de archivos |
| Escala lineal | Calificación (estrellas, corazones, pulgares) |
| Cuadrícula de opción múltiple | Cuadrícula de casillas |
| Fecha | Hora |
| **Firma electrónica** | |

Además: arrastrar y soltar para reordenar, duplicar y eliminar, obligatoriedad, descripción,
opción «Otro», barajado de opciones, validación de respuesta (número, longitud, texto),
imagen y vídeo de YouTube por pregunta, secciones con lógica condicional por opción,
modo cuestionario con puntos y clave de respuestas, importación de preguntas desde otro
formulario, editor de tema, vista previa, publicación, enlace compartible y código de
inserción, invitación de colaboradores con permiso de edición o solo lectura, deshacer y
rehacer (`Ctrl+Z` / `Ctrl+Shift+Z`) y autoguardado.

**Firma electrónica.** Trazo en lienzo o imagen subida, nombre escrito, aceptación de una
declaración configurable y certificado PDF descargable con fecha, dispositivo y huella SHA-256
del contenido firmado.

> Es una **firma electrónica simple**: deja constancia de quién firmó y cuándo, y permite
> detectar si el contenido cambió después. No equivale a una firma digital emitida por una
> entidad de certificación. Si el uso final es contractual, conviene validarlo con un abogado.

**Respuestas.** Resumen con gráficas (torta para opción múltiple, barras para escalas y
casillas), vista por pregunta, vista individual navegable, exportación a CSV y descarga del
certificado desde cada firma.

**Configuración.** Cuestionario y sus opciones de calificación, recogida de correos, límite de
una respuesta, edición posterior, barra de progreso, barajado de preguntas, mensaje de
confirmación y valores predeterminados.

---

## Arquitectura

```
src/
  app/
    login, signup            Acceso
    forms/                   Inicio: plantillas y formularios recientes
    forms/[id]/edit/         Editor con las tres pestañas
    f/[id]/                  Vista pública del formulario
  components/
    ui/                      Primitivas: botón, campo, interruptor, modal
    home/                    Galería de plantillas
    editor/                  Cabecera, preguntas, opciones, tema, compartir, configuración
    public/                  Renderizador, campos y lienzo de firma
    responses/               Resumen, por pregunta e individual
  lib/
    types.ts                 Modelo de datos
    logic.ts                 Validación, lógica condicional y calificación
    defaults.ts              Fábricas de formulario, sección y pregunta
    templates.ts             Las ocho plantillas
    certificate.ts           Certificado PDF de la firma
    csv.ts, format.ts        Exportación y formato
    data/                    Capa de datos: interfaz, mock, Supabase, semilla
    supabase/                Cliente del navegador
    sheets/                  Punto de extensión para Google Sheets
  store/editor.ts            Estado del editor con historial
supabase/migrations/         Esquema SQL, normalización y políticas RLS
```

La **capa de datos** es una interfaz única (`src/lib/data/types.ts`) con dos implementaciones.
Ningún componente importa Supabase directamente: todos hablan con `dataSource`. Cambiar de
origen es una variable de entorno.

---

## Pendiente: hoja de cálculo en Drive

Cada formulario debe generar una hoja de cálculo y volcar allí cada respuesta. **No está
implementado**, pero el terreno está preparado:

- Columna `spreadsheet_id` en la tabla `forms` y en el modelo `FormDoc`.
- Interfaz `SheetsSyncProvider` en `src/lib/sheets/provider.ts` con implementación vacía.
- Las tres llamadas ya colocadas donde corresponde: al crear el formulario
  (`ensureSpreadsheet`), al guardar cambios (`syncHeaders`) y al recibir una respuesta
  (`appendResponse`).

Conectar la API de Google consiste en escribir una implementación de esa interfaz, devolverla
desde `getSheetsProvider()` y añadir el flujo OAuth con los permisos de Drive y Sheets.

---

## Decisiones que conviene revisar

**El guardado del formulario no es atómico.** `saveForm` hace varias llamadas seguidas: la fila
del formulario, las secciones, la limpieza de secciones borradas, las preguntas y la limpieza de
preguntas borradas. Si una falla a mitad, el formulario queda entre dos estados. Para producción
conviene envolverlo en una función de Postgres que reciba el formulario completo y haga todo en
una transacción.

**El botón «Título y descripción»** crea una sección nueva en vez de un bloque de texto suelto,
porque el formulario se modeló como secciones que contienen preguntas y no como una lista mixta
de elementos.

**Las invitaciones a colaboradores se guardan**, pero todavía no otorgan acceso: la política RLS
deja que el invitado vea su invitación, no que abra el formulario. Falta ampliar las políticas de
`forms`, `sections`, `questions` y `responses` para contemplar al colaborador.

---

## Pruebas

```bash
npm test
```

25 pruebas sobre dos frentes:

- **Lógica de negocio**: validación de respuestas incluida la firma, navegación condicional entre
  secciones y calificación de cuestionarios.
- **Mapeo a las tablas**: ida y vuelta entre el modelo y las filas de `forms`, `sections` y
  `questions`, comprobando que el orden, la configuración de cada tipo, la clave de respuesta y
  la lógica condicional sobreviven al viaje aunque Postgres devuelva las filas desordenadas.
