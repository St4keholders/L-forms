# Puesta en marcha con Supabase

Pasos para dejar L-Forms funcionando contra una base real. Unos 15 minutos.

---

## 1. Migraciones

Crea el proyecto en Supabase y ejecuta las dos migraciones **en este orden**:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_questions_and_collaborators.sql`

La segunda depende de la primera. Si usas el MCP de Supabase desde el IDE, pídeselo así:

> Aplica `0001_init.sql` y después `0002_questions_and_collaborators.sql` a mi proyecto, uno por uno, y confírmame que existen las tablas profiles, forms, sections, questions, responses y form_collaborators.

## 2. Autenticación

En **Authentication → Sign In / Providers → Email**, apaga *Confirm email*.

Con la confirmación activa, al registrarte Supabase crea el usuario pero no abre sesión, y la app no puede leer nada porque todas las políticas RLS dependen de `auth.uid()`. Parece un fallo de la aplicación y no lo es. Vuelve a activarlo cuando pases a producción.

## 3. Variables de entorno

Copia `.env.example` a `.env.local` y rellena con los valores de **Settings → API**:

```env
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_BUCKET=l-forms
```

Si el panel muestra *publishable key* en vez de *anon key*, usa esa: cumple el mismo papel.

**La `service_role` / `secret` no va aquí ni en ningún archivo del repositorio.**

## 4. Storage

Comprueba en **Storage** que existe el bucket `l-forms` y está marcado como público. Si la migración no pudo crear sus políticas por permisos, créalas desde la interfaz: permitir `insert` y `select` sobre ese bucket.

## 5. Probar

```bash
npm install
npm run dev
```

Recorrido completo para validar toda la cadena:

1. Entra a `/signup` y crea tu cuenta. El trigger genera el perfil solo.
2. Crea un formulario desde la plantilla **Autorización de salida escolar**.
3. Pulsa **Publicar** y copia el enlace.
4. Ábrelo en una ventana de incógnito, responde y firma.
5. Vuelve al editor → pestaña **Respuestas** → vista **Individual** → descarga el certificado PDF.

Si eso corre de principio a fin, la base, la autenticación, RLS, Storage y la firma están bien.

---

## Antes de abrirlo al público

**Las firmas viajan dentro del JSON de la respuesta** en base64, no en Storage. Los adjuntos sí van a Storage; la firma no. Funciona, pero añade 15–30 KB por firma a la fila de `responses`. Para cambiarlo: que `SignaturePad` llame a `dataSource.uploadFile` y guarde solo la URL. Es un archivo.

**Las políticas de Storage permiten subir a cualquiera** que conozca la URL del proyecto, porque los encuestados son anónimos por diseño. Conviene limitar por tamaño y tipo de archivo.

**El guardado del formulario no es atómico**: son cinco llamadas seguidas. Si una falla a mitad, el formulario queda entre dos estados. La solución es una función de Postgres que reciba el formulario completo y lo escriba en una transacción.

## Si el agente del IDE toca el esquema

Que `sections` y `questions` conserven su columna `position`. Es lo único que sostiene el orden de las secciones y de las preguntas dentro de cada una.
