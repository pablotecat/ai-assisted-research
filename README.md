# Skills de investigación asistida

Prepara las fuentes de un proyecto y responde preguntas con evidencias de código, documentos locales y un board remoto accesible.

- **`/setup`**: entrevista adaptativa para descubrir capacidades, reutilizar ajustes, preparar lo elegido y comprobar el resultado.
- **`/investiga`**: investiga una o ambas fuentes y contrasta sus informes.
- **`lee-codigo`**: lector del comportamiento implementado mediante Codegraph y citas de código.
- **`lee-docs`**: lector de intención documentada, con citas y contradicciones explícitas.

## Arranque mínimo

Instala [APM](https://microsoft.github.io/apm/getting-started/installation/) y ejecuta desde la **carpeta anfitriona del proyecto**:

```sh
apm install pablotecat/ai-assisted-research --target opencode
```

Para GitHub Copilot, utiliza `--target copilot`. Los destinos conservados distribuyen las cuatro skills, sus referencias y una entrada explícita `/setup` (comando en OpenCode y prompt en Copilot). En un anfitrión compatible con Agent Skills también puedes cargar sus instrucciones instaladas mediante sus herramientas nativas.

Recarga el asistente tras instalar y ejecuta:

```text
/setup
```

La entrevista muestra los valores existentes y pregunta por decisiones, sin exigir código local para investigar documentación. Puede terminar parcialmente preparada: por ejemplo, documentación `LISTA`, código `PENDIENTE` de índice y board `PENDIENTE` de autenticación. Repite `/setup` para conservar lo elegido y volver a comprobar pendientes. Las investigaciones pueden sugerirla; la entrevista solo empieza por petición explícita.

## Con o sin runtime

**Vía básica:** las skills utilizan herramientas nativas de lectura, búsqueda, consulta y escritura disponibles. No necesitan Node ni un servidor del paquete para investigar o guardar los informes de lectores y los índices. Los dos archivos de síntesis del coordinador requieren `write_report_pair`; sin ese publicador, su guardado queda pendiente, no se sustituye por `write`. Sin subagentes, `auto` ejecuta primero documentación y después código en el principal, declarando contexto compartido. Con una fuente, no exige subagentes.

**Runtime opcional:** requiere Node.js ≥ 24 y npm. Aporta edición validada de ajustes y publicación con sustitución atómica por archivo, restauración ante fallos, verificación interna del contenido, comprobaciones de ruta y bloqueo por sesión. El plugin nativo añade verificación de sesiones y restricciones de herramientas para los lectores; el MCP utiliza identificadores de investigación propios y respeta los permisos del anfitrión. El runtime no aporta por sí solo conectores de boards, lectura general de archivos ni orquestación de subagentes.

Si eliges instalarlo desde la carpeta anfitriona, distinta del repositorio de desarrollo del paquete:

### OpenCode

```sh
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-opencode.mjs
```

El instalador conserva los permisos compartidos de `explore`. Si eliges aplicar el perfil restrictivo del paquete, establece `RESEARCH_READER_PERMISSIONS=1` únicamente para esa ejecución; revisa antes `opencode.json` del paquete para conocer el perfil completo que sustituirá los permisos de ese lector. Los plugins heredados se conservan y se señalan para revisión expresa antes de cargar el runtime.

El runtime incluye una entrada compatible con OpenCode V2 y conserva la entrada V1. El instalador despliega ambas en el mismo plugin con su adaptador; el SDK V2 solo es dependencia de desarrollo. Tras reiniciar, comprueba que `write_report_pair` esté disponible antes de guardar la síntesis. La prueba con la CLI V2 real verifica su registro, además de las pruebas de escritura y permisos.

### GitHub Copilot

```sh
node apm_modules/pablotecat/ai-assisted-research/scripts/setup-copilot.mjs
```

Configura los servidores MCP en `.vscode/mcp.json` y `.github/research/mcp-config.json`, conservando comentarios, servidores ajenos y opciones existentes. En CLI:

```sh
copilot --additional-mcp-config '@.github/research/mcp-config.json'
```

Ambos instaladores comprueban entradas y conflictos antes de aplicar archivos, instalan dependencias con scripts de ciclo de vida deshabilitados y no retiran archivos heredados. Ante un fallo posterior indican lo aplicado y el paso pendiente. Reejecutarlos conserva las elecciones. **Cierra y reinicia OpenCode, o recarga Copilot**, para comprobar que se hayan cargado las herramientas; escribir la configuración no acredita su disponibilidad.

### Requisitos de las fuentes

- Código: un repositorio con workspace local accesible, Git e [índice Codegraph](https://github.com/colbymchenry/codegraph#quick-start) correspondiente al workspace y a la referencia solicitada.
- Documentos locales: una o varias raíces accesibles; texto/Markdown se leen nativamente. [MarkItDown](https://github.com/microsoft/markitdown#installation) u otro lector local adecuado cuando lo exijan sus formatos.
- Board: un proyecto/board/repositorio confirmado, con conector de lectura real o páginas públicas accesibles. La autenticación pertenece al anfitrión; las credenciales nunca se guardan en los ajustes de investigación.

`/setup` ofrece preparar dependencias, clonar/indexar o registrar un conector documentado únicamente como acciones elegidas, y comprueba cada capacidad por separado. Sin terminal proporciona pasos manuales y aprovecha lo que sí pueda consultar.

## Ajustes y guardado

La carpeta anfitriona contiene ajustes e informes; puede ser distinta del workspace del código. La resolución compartida elige: archivo explícito del usuario, configuración de la integración activa, `research-settings.json` común y, por último, otros candidatos pertinentes del proyecto. Ante varios candidatos pide selección, sin crear copias ni sincronizarlas. Los valores por defecto se encuentran en [`research-settings.example.json`](research-settings.example.json).

El runtime mantiene las ubicaciones nativas `.opencode/research-settings.json` y `.github/research-settings.json`, reutilizando el común si no existe el nativo. Para elegir otra ruta se admite `RESEARCH_SETTINGS_PATH`: en OpenCode debe estar presente también al arrancar el asistente; el instalador Copilot la vincula en los servidores generados. La herramienta `research_settings` anuncia el archivo en `archivo` y admite `read`, `saveMissing` (fuentes vacías) y `configure` (parche de opciones seleccionadas). Si un adaptador consume otro archivo, utiliza la vía básica completa o su vinculación soportada.

`skills.investiga.modoLectura` admite `auto`, `paralelo` y `secuencial`; su ausencia equivale a `auto` sin migrar el archivo. Una preferencia paralela sin lectores aislados requiere elegir otra vía, no simula investigadores independientes. Se admiten identificadores de board abiertos y URL HTTPS sin proveedor si el conector ya identifica el sistema.

El principal conserva de forma independiente:

| Ajuste de guardado | Entregables |
|---|---|
| `lee-codigo` | `investigacion-codebase.md`, publicado y sobrescrito por su lector. |
| `lee-docs` | `investigacion-documentacion.md`, publicado y sobrescrito por su lector, incluso con el guardado de la consulta desactivado. |
| `investiga` | `resumen-ejecutivo.md` e `informe-detallado.md`, síntesis consolidada que enlaza los informes de lectores existentes. |

Los lectores producen informes completos compactos: respuesta y suficiencia, alcance, hallazgos con evidencia y conflictos/límites relevantes. Cada lector delegado publica su informe en cuanto lo termina mediante su publicador acotado, limitado a su entregable y a su carpeta de sesión, sin herramientas de escritura genéricas. Una repregunta devuelve una revisión puntual con IDs estables; con cambio material, el lector dueño reconstruye la versión completa y sobrescribe su entregable. Una confirmación sin cambios queda registrada en el contraste, sin otra copia del informe.

La salida predeterminada es `sesiones-investigacion/`. Cada investigación ocupa una carpeta directamente bajo esa raíz; los informes y su `indice.md` local viven directamente en ella. La conversación conserva la misma carpeta, incluidas las ampliaciones, salvo petición explícita de iniciar otra investigación. Una conversación nueva empieza otra por defecto. `start_research` permite abrir otra investigación cuando la interfaz lo requiere o el usuario lo solicita; su identificador se reutiliza en las ampliaciones.

Los documentos reflejan las conclusiones vigentes de toda la investigación: integran puntualizaciones, conservan hallazgos válidos con sus citas y sustituyen lo corregido. Los publicadores `publish_code_report`, `publish_documentation_report` y `write_report_pair` reciben el contenido completo consolidado, comprueban internamente la escritura y devuelven solo rutas confirmadas. El coordinador guarda sus dos archivos exclusivamente con `write_report_pair`, sin relectura posterior ni alternativa mediante `write`, edición, parches o shell. El plugin bloquea la escritura genérica de esos dos destinos dentro de la raíz de sesiones, sin restringir los informes de lectores, los índices ni otros archivos del proyecto. Para los informes de lectores sin publicador compatible, el principal conserva la escritura nativa y la relectura de verificación; esa vía no ofrece el bloqueo, la identidad ni la atomicidad de la biblioteca.

El coordinador mantiene `sesiones-investigacion/indice-sesiones.md` mediante herramientas nativas, independientemente del runtime: una fila por pregunta de investigación del usuario, con fecha, pregunta y enlace relativo a la carpeta. Las ampliaciones apuntan a la misma sesión, incluso si no exigen reescribir informes. Se registran al terminar la respuesta y solo si existe algún entregable confirmado; sin guardado se omiten carpetas y entradas vacías. El índice local conserva tema, fuentes y enlaces a los entregables. Si falla el índice global, los documentos guardados se conservan y se comunica el pendiente.

El coordinador termina únicamente con la respuesta a la pregunta actual, con las condiciones, citas y límites necesarios. El guardado de sus dos informes es interno: no anuncia los archivos ni añade sus nombres, rutas o enlaces salvo petición expresa. Los informes completos solo se muestran en el chat por petición expresa. Un guardado desactivado, pendiente o fallido no provoca su transcripción: si falla un guardado solicitado, se añade una nota breve. Las consultas directas a los lectores conservan sus enlaces a archivos confirmados; las devoluciones entre agentes conservan el informe o revisión solicitado.

## Uso y actualización

```text
/setup conserva las fuentes y revisa únicamente el modo de lectura y los guardados
/investiga ¿Qué usuarios reciben notificaciones al crear un documento?
/investiga consulta solo documentación sobre las dependencias de esta historia
```

Para actualizar: `apm update --yes --target opencode` (o `copilot`). Si utilizas runtime, repite su instalador y reinicia/recarga el anfitrión.

## Verificación

```sh
npm test
node scripts/check-distribution.mjs
git diff --check
```

La segunda comprobación requiere APM y verifica una instalación local real en ambos destinos, incluidos `/setup`, referencias relativas y plantilla. Los [recorridos de aceptación](docs/plans/setup-ligera-verificacion.md) distinguen comprobaciones ejecutadas y límites de las pruebas de entrevista.
