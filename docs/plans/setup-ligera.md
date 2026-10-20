# Plan de implementación: `/setup` ligera e interactiva

- **Estado:** implementación completada; verificación y alcance de los recorridos en [setup-ligera-verificacion.md](setup-ligera-verificacion.md).
- **Fecha:** 2026-10-20.
- **Rama de implementación:** `feature/setup-ligera` (sobre `feature/agnostic-skills`, conservando sus cambios previos).

Este documento recoge el alcance acordado y sus criterios de aceptación. La implementación y su verificación están registradas en el documento enlazado arriba.

## 1. Objetivo

Preparar un proyecto para investigar código y documentación mediante una entrevista adaptativa. `/setup` descubre las capacidades reales del entorno, reutiliza su configuración, ofrece alternativas viables, aplica las opciones elegidas y comprueba el resultado.

La carpeta anfitriona del proyecto y el workspace del código son conceptos distintos: puede existir una configuración de investigación sin tener código local.

## 2. Decisiones confirmadas

| Área | Contrato de v1 |
|---|---|
| Activación | El usuario invoca `/setup`. Las skills de investigación pueden sugerirla cuando detecten una carencia; no abren automáticamente la entrevista. |
| Portabilidad | Selección por capacidades, sin limitar la skill a los dos entornos integrados actualmente. |
| Configuración | Por carpeta de proyecto. Reutilizar el archivo adecuado; preguntar ante ambigüedad; crear uno común solo si hace falta. Sin duplicación ni sincronización automática. |
| Reejecución | Revisar o ampliar lo existente, conservando los valores no seleccionados para cambiar. |
| Código | Un repositorio con workspace local accesible e índice Codegraph. Sin workspace, ofrecer preparar uno o continuar con documentación. |
| Documentación | Varias raíces locales y un board/proyecto remoto. Conectores reales de lectura o páginas públicas accesibles; sin lista cerrada de proveedores. |
| Ejecución | Preferencia configurable: automática, paralela o secuencial. Automática prefiere lectores aislados en paralelo y utiliza el principal secuencialmente si no hay subagentes. |
| Runtime | Opcional. La vía básica utiliza las skills y las herramientas nativas disponibles. |
| Preparación | Puede editar configuración, preparar dependencias, clonar/indexar o registrar conectores cuando el usuario elija esas acciones. |
| MCP | Reutilizar conectores detectados o ayudar a preparar uno existente y documentado. Autenticación gestionada por el anfitrión; sin credenciales en los ajustes de investigación. |
| Publicación | El agente principal guarda los informes mediante un publicador compatible o herramientas nativas. Los lectores delegados investigan en lectura y devuelven contenido. |
| Guardado | Código y documentación se guardan independientemente del resumen/informe de la consulta, según sus propias opciones. |
| Resultado | Preparación parcial permitida, con estado por capacidad y pasos concretos para retomarla. |

La v1 no incorpora investigación de código remoto por API/MCP sin workspace, múltiples repositorios/boards, configuración global de usuario ni colecciones documentales remotas independientes de un board.

## 3. Base existente y desajustes comprobados

| Evidencia | Implicación para el trabajo |
|---|---|
| [`research-settings.example.json`](../../research-settings.example.json) ya contiene fuentes, especialistas, repreguntas, guardado y carpeta de informes. | Mantenerla como plantilla y fuente de valores predeterminados. |
| [`lib/research.ts`](../../lib/research.ts) limita el proveedor a tres valores y exige proveedor y URL juntos. | Abrir la identificación del sistema, manteniendo la validación de URL y alcance. |
| La biblioteca valida rutas, pero no comprueba que existan, que sean repositorios o que haya acceso a un conector. | Separar validación de configuración y comprobación operativa. |
| `research_settings` solo expone `read` y `saveMissing`; este último completa fuentes vacías. | Hace falta una vía para cambiar opciones existentes y preferencias, no solo completar campos. |
| El plugin lee `.opencode/research-settings.json`; el servidor MCP lee `.github/research-settings.json`. | Definir resolución común de configuración para la vía básica y conservar las ubicaciones nativas. |
| [`plugin/research.ts`](../../plugin/research.ts) reserva `publish_code_report` a `explore`; la skill encarga el guardado al principal. | Alinear el adaptador con la publicación por el principal. |
| El rol de lector de código de la biblioteca depende del nombre `explore`. | Separar el tipo de entregable de los nombres de agente específicos del anfitrión. |
| No existe publicación documental independiente; actualmente acompaña al paquete de consulta. | Añadirla en las vías nativas y básica. |
| Las skills exigen lectores separados y no contemplan el contraste secuencial en el principal. | Incorporar ese modo sin atribuirle independencia de contexto. |
| [`scripts/setup-opencode.mjs`](../../scripts/setup-opencode.mjs) retira archivos antiguos y modifica permisos compartidos de `explore`. | No ejecutarlo a ciegas: revisar efectos y proporcionar preparación no destructiva. |
| Ambos instaladores escriben antes de completar todas sus validaciones. | Comprobar entradas y conflictos antes de aplicar cambios; describir lo aplicado si una fase posterior falla. |
| Los instaladores no instalan/indexan Codegraph ni preparan autenticación de boards. | La entrevista debe abordar estos requisitos explícitamente. |
| El MCP del paquete no aporta conectores de boards, lectura general de archivos ni orquestación de subagentes. | Su presencia no demuestra por sí sola que una investigación esté preparada. |
| El plugin dispone de controles nativos de sesión/herramientas que no existen en la vía básica. | Explicar las capacidades efectivas sin presentar las vías como equivalentes. |

## 4. Contratos compartidos

### 4.1. Resolución y edición de configuración

Usar el mismo orden de resolución en `/setup` y en las investigaciones:

1. Ruta o configuración indicada expresamente por el usuario para el proyecto.
2. Configuración identificada por la integración activa, si existe y corresponde a ese proyecto.
3. Configuración común `research-settings.json` en la carpeta anfitriona.
4. Otras configuraciones de investigación detectadas dentro del proyecto: si no hay una elección inequívoca, preguntar cuál utilizar.

La detección incluye las carpetas de configuración propias del proyecto y excluye dependencias, cachés y copias de paquetes instalados. No se asume que todo archivo llamado igual pertenezca al proyecto activo.

Reutilizar el archivo elegido como fuente de verdad. Si no hay uno adecuado, proponer crear el común a partir de la plantilla. Una elección explícita tiene prioridad en la sesión; si otra sesión no puede reconstruirla y encuentra ambigüedad, pide únicamente esa selección, sin repetir toda la entrevista ni crear una copia de los ajustes.

La vía básica lee y modifica ese archivo mediante herramientas nativas. Las integraciones pueden utilizar sus herramientas de ajustes cuando trabajen sobre el mismo archivo. No se escriben dos configuraciones para una misma elección ni se cambia silenciosamente la ruta que consume un adaptador.

Si un adaptador no puede consumir el archivo seleccionado, ofrecer una vinculación soportada o la vía básica; no combinar preferencias de un archivo con publicaciones gobernadas por otro. Las ubicaciones nativas conservan su compatibilidad.

Cambios mínimos de esquema:

- Mantener los campos y valores existentes compatibles.
- Admitir un identificador de sistema abierto en `proyecto.board.proveedor`; permitir que la URL y el conector seleccionado identifiquen el sistema cuando no se necesite ese campo.
- Conservar un repositorio, varias raíces documentales y un board.
- Añadir `skills.necesito-saber.modoLectura` opcional, con valores `auto`, `paralelo` y `secuencial`; interpretar su ausencia como `auto` sin reescribir el archivo por leerlo.
- Mantener las tres opciones de guardado; cambiar la semántica documental según la sección 4.3.
- Mantener rutas locales absolutas y la carpeta de salida relativa al proyecto.

Las modificaciones se limitan a los campos elegidos. Los cambios de preferencias y valores ya poblados requieren una operación de configuración validada en las integraciones; conservar `read` y `saveMissing` para sus usos actuales. La vía básica también valida antes de escribir y vuelve a leer el resultado.

### 4.2. Capacidades y ejecución

Comprobar por separado:

- Acceso a la carpeta anfitriona y, si se solicita, escritura de ajustes/entregas.
- Carga de skills o acceso a sus instrucciones instaladas.
- Lectura, búsqueda y consultas Git/Codegraph para código local.
- Identidad, correspondencia y estado del índice respecto al workspace y referencia solicitada.
- Acceso a raíces documentales y conversión local si los formatos lo requieren.
- Alcance y operaciones reales de consulta del board; autenticación y paginación cuando correspondan.
- Subagentes, publicadores y capacidades adicionales del runtime, si existen.

La configuración de un conector y su acceso operativo son comprobaciones distintas. Un registro recién escrito que requiere recarga queda pendiente hasta que sus herramientas puedan utilizarse.

El coordinador resuelve el modo en cada investigación:

- `auto`: paralelo con lectores aislados si es posible; secuencial en el principal en otro caso.
- `paralelo`: si no está disponible, explicar la carencia y ofrecer cambiar de modo o investigar una sola fuente.
- `secuencial`: ejecutar las dos lecturas en el principal cuando se soliciten ambas fuentes.

En secuencial, producir primero el informe documental y después el de código, conservando la separación de evidencias antes de sintetizar. Las reglas de cada lector siguen vigentes; el informe final identifica el contexto compartido y no afirma corroboración entre investigadores independientes. Una consulta de una sola fuente no exige subagentes.

Los lectores delegados mantienen su aislamiento cuando se use el modo paralelo. No se añaden delegaciones anidadas. El modo efectivo se refleja en la entrega, aunque la preferencia guardada sea `auto`.

### 4.3. Publicación por el principal

| Entregable | Condición de guardado |
|---|---|
| `investigacion.md` de código | Lector de código solicitado/permitido y guardado de `lee-codigo` activo. |
| `investigacion-documentacion.md` | Lector documental solicitado/permitido y guardado de `lee-docs` activo, aunque el guardado de la consulta esté desactivado. |
| `resumen-ejecutivo.md` e `informe-detallado.md` | Guardado de `necesito-saber` activo. |

Guardar cada informe completo y las revisiones que se solicite conservar. Agrupar por investigación; enlazar desde la consulta las entregas de los lectores cuando existan, evitando duplicar el mismo informe por usar dos publicadores. Conservar el historial y las entregas previas.

Preferir el publicador disponible que soporte el entregable. Si falta y hay escritura nativa autorizada, el principal puede usarla en la carpeta de salida elegida, creando entregas nuevas y comprobando las rutas antes de anunciarlas. Esta vía no atribuye al anfitrión los controles de identidad, bloqueo o atomicidad de la biblioteca.

Si no hay escritura o falla el guardado, entregar los informes completos en conversación e identificar el pendiente. Un fallo opcional de guardado no invalida los hallazgos comprobados. El resultado operativo de `/setup` tampoco sustituye la evaluación `SUFICIENTE`/`INSUFICIENTE` de una investigación.

## 5. Experiencia de la entrevista

La skill pregunta por decisiones; descubre por sí misma los hechos accesibles. Cada bloque muestra los valores existentes, recomienda una opción y ofrece únicamente alternativas respaldadas por capacidades detectadas o pasos de preparación verificables. El usuario puede mantener, cambiar, posponer o volver sobre una elección.

| Paso | Comportamiento y opciones | Criterio de salida |
|---|---|---|
| 1. Proyecto y diagnóstico | Confirmar la carpeta anfitriona; detectar ajustes y herramientas; ofrecer reutilizar lo existente o revisar opciones. | Proyecto y configuración inequívocos, o elección concreta pendiente. |
| 2. Objetivo | Código, documentación o ambos. Mostrar fuentes y especialistas ya configurados. | Objetivo elegido, sin exigir fuentes no solicitadas. |
| 3. Código local | Reutilizar un workspace, elegir otra ruta o preparar uno desde un origen real. Si falta, ofrecer continuar solo con documentación o dejar código pendiente. | Ruta/referencia e índice comprobados, o preparación pendiente explícita. |
| 4. Documentación | Seleccionar raíces locales, board remoto o ambos; conservar varias raíces y un board. | Corpus confirmado o limitación localizada. |
| 5. Accesos y preparación | Reutilizar conectores; comprobar páginas públicas; guiar la configuración de un conector existente. Instalar dependencias o clonar/indexar solo como acciones elegidas. | Cada acción aplicada y comprobada, pospuesta o acompañada de un requisito concreto. |
| 6. Preferencias | Elegir modo de lectura, especialistas, repreguntas, guardados independientes y carpeta de salida. Explicar las capacidades aportadas por una integración opcional. | Opciones compatibles con el objetivo, distinguiendo preferencia de disponibilidad actual. |
| 7. Aplicación | Mostrar archivo destino y cambios seleccionados. Aplicar la selección mediante herramientas nativas o integración compatible; conservar lo demás. | Ajustes releídos y válidos, con registro de cualquier aplicación parcial. |
| 8. Resultado | Mostrar estado por capacidad, archivo utilizado, modo posible, entregables habilitados y siguiente paso. | Usuario puede iniciar una consulta viable o retomar una preparación concreta. |

Estados de salida:

- `LISTA`: comprobaciones pertinentes realizadas con resultado satisfactorio.
- `PENDIENTE`: capacidad solicitada con un requisito, fallo, autenticación, recarga o comprobación sin resolver.
- `NO_SOLICITADA`: capacidad fuera del objetivo elegido.

La preparación parcial se reanuda leyendo los ajustes guardados y volviendo a comprobar las capacidades; no exige una base de datos de entrevistas ni conserva supuestos de acceso antiguos como hechos actuales.

### Ejemplos que la entrevista debe resolver

| Situación real | Alternativas que debe ofrecer |
|---|---|
| No hay código local | Elegir/preparar un workspace; configurar solo documentación; posponer código. No ofrecer investigación remota por MCP como si estuviera implementada. |
| No hay Codegraph o índice válido | Prepararlo si el usuario lo elige; aportar pasos concretos; continuar con documentación o dejar código pendiente. |
| Board privado sin acceso | Reutilizar otro conector adecuado, configurar uno existente o completar autenticación en el anfitrión; conservar el pendiente mientras no se verifique. |
| No hay terminal, pero sí herramientas de lectura y MCP | Configurar las vías que esas herramientas soporten; dar pasos manuales para la preparación local no ejecutable. |
| No hay subagentes | Ofrecer lectura secuencial de ambas fuentes o una fuente; mostrar el modo efectivo. |
| No hay runtime del paquete | Usar ajustes y herramientas nativas; ofrecer la integración opcional cuando sea adecuada al entorno. |
| Hay varias configuraciones | Mostrar cuáles son pertinentes y solicitar selección; no sincronizarlas. |
| Todo está preparado | Ofrecer conservar la configuración e iniciar una investigación sin repetir las preguntas de cada campo. |

## 6. Fases de implementación

### Fase 1. Contrato común de ajustes

1. Actualizar esquema y plantilla con proveedor abierto y preferencia de lectura compatible con archivos anteriores.
2. Definir la resolución de archivo y lectura sin runtime de la sección 4.1 en una referencia común del paquete. Los valores predeterminados permanecen en la plantilla, no duplicados en las skills.
3. Añadir edición validada de opciones existentes en las interfaces de ajustes, conservando las operaciones actuales.
4. Verificar cómo APM instala archivos compartidos y enlaces relativos antes de fijar la ubicación de esa referencia. Debe poder consultarse desde `/setup` y el coordinador sin invocar otra skill interactiva.

**Termina cuando:** archivos existentes siguen siendo legibles, puede configurarse un board no enumerado y un entorno sin runtime puede encontrar y editar la misma configuración que usa su investigación.

### Fase 2. Publicación coherente e independiente

1. Habilitar publicación por el principal en el plugin y separar en la biblioteca el tipo de informe del nombre del agente lector.
2. Incorporar publicación documental independiente en el plugin y servidor MCP.
3. Conservar nombres de herramientas compatibles cuando sea posible; actualizar sus esquemas/descripciones para que su descubrimiento explique quién publica y qué opciones se respetan.
4. Mantener numeración, trazabilidad y controles de escritura existentes; comprobar compatibilidad con sesiones/entregas previas.
5. Precisar la ruta de publicación nativa en la referencia común, sin exigir Node ni servicios auxiliares para las consultas documentales que no los necesiten.

**Termina cuando:** cada uno de los tres guardados puede activarse/desactivarse de forma independiente, el principal publica los informes recibidos y nunca se anuncian rutas no confirmadas.

### Fase 3. Consumidores de la configuración y modo secuencial

1. Adaptar `necesito-saber` para resolver ajustes con o sin runtime y seleccionar el modo efectivo.
2. Incorporar lectura secuencial en el principal y la ruta de una sola fuente, manteniendo el paralelismo aislado donde esté disponible.
3. Ajustar `lee-codigo` y `lee-docs`: mismas reglas de evidencia en ambos modos, lectores delegados sin publicación y guardado a cargo del principal.
4. Permitir que las investigaciones sugieran `/setup` cuando falte preparación, sin iniciar la entrevista ni bloquear hallazgos independientes ya comprobados.

**Termina cuando:** las mismas fuentes y preferencias sirven para ambos modos, no se exige un subagente para una sola fuente y la entrega identifica el modo utilizado.

### Fase 4. Skill `/setup`

1. Crear `.apm/skills/setup/SKILL.md` con activación explícita, preguntas adaptativas, criterios de salida y el recorrido de la sección 5.
2. Usar el mecanismo de invocación explícita admitido por la distribución; comprobar su resultado en los destinos soportados, sin asumir que todos interpretan igual el frontmatter.
3. Separar referencias por ramas de preparación: código local, documentación/conectores e integraciones opcionales. Mantener en el cuerpo solo la entrevista y las reglas comunes.
4. Conservar las skills agnósticas: nombres de proveedores de asistentes/boards, rutas de integración y comandos de sus instaladores permanecen en configuración, metadatos o adaptadores externos, no en el texto de las skills. Las referencias técnicas de Git, Codegraph y conversión local conservan su función.
5. Utilizar herramientas y esquemas anunciados por el entorno. Para conectores ausentes, consultar configuración/documentación real antes de ofrecer una instalación concreta.

**Termina cuando:** los ejemplos de la sección 5 tienen caminos explícitos y ninguna alternativa depende de herramientas inventadas o de un servicio aún no preparado.

### Fase 5. Reutilización no destructiva de las integraciones

1. Conservar ambos scripts de instalación y sus archivos de configuración.
2. Revisar la aplicación de permisos compartidos y la limpieza heredada del instalador nativo. La vía invocada desde `/setup` debe preservar archivos existentes y limitarse a cambios elegidos, sin ejecutar la limpieza automática actual.
3. Detectar configuración existente antes de instalar. Ejecutar cada instalador únicamente si corresponde al entorno y la carpeta anfitriona elegidos, respetando que no se instala sobre el repositorio de desarrollo del paquete.
4. Adelantar validaciones de entradas y conflictos; informar de lo aplicado si una dependencia o recarga impide completar el proceso.
5. Diferenciar instalación de runtime, requisitos de Codegraph/MarkItDown y acceso al board; verificar cada capacidad por separado.

**Termina cuando:** repetir la preparación conserva elecciones y archivos ajenos, no instala otra integración por defecto y no declara disponible una herramienta que requiere recarga o autenticación pendiente.

### Fase 6. Documentación y verificación

1. Actualizar `README.md` con el arranque mediante `/setup`, instalación inicial mínima, vías con/sin runtime y ejemplos de preparación parcial.
2. Ajustar la descripción de `apm.yml` para reflejar el objetivo agnóstico, conservando destinos que sigan operativos; comprobar distribución de la nueva skill y referencias.
3. Actualizar las pruebas existentes para los contratos modificados y añadir casos de comportamiento relevantes de la sección 8.
4. Recorrer manualmente la entrevista con escenarios representativos; documentar el resultado real, no solo la existencia de archivos o frontmatter.

**Termina cuando:** las comprobaciones automatizadas y los recorridos de aceptación demuestran los caminos prometidos, y el repositorio conserva su instalación y actualización actuales.

## 7. Archivos previstos

| Archivo o grupo | Trabajo previsto |
|---|---|
| `.apm/skills/setup/SKILL.md` y referencias de ramas | Nuevos: entrevista y preparación progresiva. |
| Referencia común de configuración/publicación del paquete | Nueva: resolución, edición y vía básica; ubicación verificada durante la fase 1. |
| `.apm/skills/necesito-saber/SKILL.md` | Lectura de ajustes sin runtime, preferencia de modo, secuencial, sugerencia de setup y guardados independientes. |
| `.apm/skills/lee-codigo/SKILL.md` y `lee-docs/SKILL.md` | Contratos de ejecución y entrega compatibles con ambos modos. |
| Referencias actuales de código y documentación | Ajustes puntuales de preparación y comprobación, conservando sus reglas de investigación. |
| `research-settings.example.json` | Mantener plantilla; añadir preferencia opcional y coherencia con el esquema. |
| `lib/research.ts` | Esquema abierto, edición de preferencias y publicación por tipo de entregable independiente de nombres de agente. |
| `plugin/research.ts` y `copilot/server.ts` | Ajustes configurables y publicación de lectores por el principal, incluida documentación independiente. |
| `scripts/setup-opencode.mjs` y `scripts/setup-copilot.mjs` | Preparación reutilizable, validada y no destructiva. |
| `opencode.json` | Revisar permisos necesarios para los contratos corregidos; conservar su función de configuración nativa. |
| `research_flow.test.ts` | Actualizar y ampliar comprobaciones de ajustes, publicación e instalación. |
| `README.md` y `apm.yml` | Entrada al asistente, distribución y compatibilidad documentada. |

No se necesita un servidor MCP universal nuevo, una fusión obligatoria de los instaladores ni una base de datos adicional para la entrevista. `package.json` y sus dependencias se conservan; cualquier cambio deberá justificarse por una función concreta de las fases anteriores.

## 8. Criterios de aceptación

### Comprobaciones automatizadas de comportamiento

- Leer ajustes anteriores sin migración destructiva; interpretar la ausencia de modo como `auto`.
- Aceptar un identificador de board no enumerado y mantener validaciones de URL y rutas.
- Cambiar preferencias seleccionadas sin reemplazar los demás valores; comprobar límites de `saveMissing` y de la nueva operación de configuración.
- Publicar desde el principal y respetar especialistas permitidos.
- Probar las combinaciones de guardado de código, documentación y consulta, incluida documentación activa con consulta desactivada.
- Repetir publicaciones sin sobrescribir entregas previas; conservar las comprobaciones pertinentes de concurrencia y rutas del runtime.
- Reejecutar instaladores en proyectos temporales preservando configuración y archivos existentes.
- Comprobar frontmatter y enlaces de las skills, incluida su forma instalada, y ausencia de referencias específicas de proveedor en sus instrucciones.
- Ejecutar las pruebas con `npm test` y revisar el diff con `git diff --check`.

### Recorridos de aceptación de la entrevista

1. Proyecto preparado: conservar ajustes y llegar al resultado sin volver a preguntar cada valor.
2. Sin configuración ni runtime: crear ajustes comunes y preparar una consulta con herramientas nativas.
3. Sin código local: elegir documentación, preparar un workspace o dejar código pendiente, sin prometer código remoto por MCP.
4. Sin índice utilizable: ofrecer preparación elegida y comprobar después la correspondencia workspace/índice/referencia.
5. Documentación local y board: combinar ambas fuentes sin ampliar el corpus confirmado.
6. Board sin autenticación o con herramientas todavía no cargadas: guardar avance y emitir un pendiente verificable.
7. Dos configuraciones plausibles: pedir selección y reutilizar solo la elegida.
8. Sin subagentes: ejecutar ambas lecturas secuencialmente y declarar el modo en la síntesis.
9. Preferencia paralela sin capacidad: ofrecer alternativa explícita y no simular lectores.
10. Guardado documental independiente: producir el informe aunque no se guarde la consulta, tanto con runtime como por escritura nativa.
11. Sin escritura o con fallo del publicador: entregar contenido en conversación y no anunciar rutas inexistentes.
12. Preparación parcial: repetir `/setup`, conservar avances y volver a comprobar lo pendiente.

## 9. Finalización

La implementación estará terminada cuando las capacidades seleccionadas puedan prepararse mediante la entrevista, los dos lectores y el coordinador consuman la misma configuración elegida y las entregas respeten los contratos de ejecución y guardado acordados.

La verificación debe distinguir cuatro resultados: configuración válida, acceso comprobado, modo de investigación disponible y guardado operativo. Ninguno se infiere únicamente de haber escrito un archivo.
