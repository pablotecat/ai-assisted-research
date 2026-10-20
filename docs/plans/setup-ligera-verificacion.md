# Verificación de `/setup` ligera

Fecha: 2026-10-20. Rama de implementación: `feature/setup-ligera`.

## Comprobaciones reproducibles

| Comprobación | Resultado |
|---|---|
| `npm test` | 10 pruebas: ajustes antiguos sin migración al leer, proveedor abierto/URL sin proveedor, parches validados, resolución/ambigüedad, publicación por el principal y lectores genéricos, ocho combinaciones de guardado, historial/concurrencia/rutas, plugin, MCP real e instaladores repetidos. |
| `node scripts/check-distribution.mjs` | Instalación local real con APM 0.32.0 en los destinos `opencode` y `copilot`. Cuatro skills, enlaces de todas las referencias, plantilla dentro del paquete instalado y entrada explícita `/setup` comprobados. |
| `git diff --check` | Sin errores de whitespace. |

El chequeo de distribución copia los archivos del paquete a un sandbox sin dependencias ni `.git`, instala esa copia con APM y elimina el sandbox al terminar. La referencia compartida reside en `necesito-saber/references/proyecto.md`: APM conserva los directorios hermanos y sus enlaces relativos. La plantilla permanece en la raíz del paquete instalado, no se duplica en las skills. El prompt portable se distribuye como `.opencode/commands/setup.md` y `.github/prompts/setup.prompt.md`; la activación explícita también se exige en el cuerpo de la skill porque los anfitriones no interpretan necesariamente el frontmatter igual.

Los instaladores se prueban en proyectos temporales: conservan ajustes, permisos compartidos, archivos heredados, comentarios JSONC y servidores ajenos. Reutilizan un archivo común sin crear el nativo. Los conflictos de configuración se rechazan antes de desplegar el runtime. El esquema del runtime vuelve a validar los ajustes después de instalar dependencias; la validación previa del instalador funciona sin dependencias instaladas.

## Recorrido manual con herramientas reales

Sandbox: `setup-ligera-acceptance-20261020`, bajo el directorio temporal autorizado. Las elecciones siguientes son entradas de aceptación prefijadas; no se abrió una entrevista nueva al usuario del repositorio.

### Documentación sin runtime y sin código configurado

1. Se partió de una carpeta anfitriona con `documentos/notificaciones.md` (tres líneas) y sin runtime. Se eligió solo documentación, modo `auto`, guardado documental activo y guardado de consulta desactivado.
2. Se creó el común `research-settings.json` desde la estructura de la plantilla mediante herramientas nativas y se releyó. Workspace vacío; una raíz documental absoluta; sin board. Se comprobó leyendo el documento completo.
3. Se produjo el informe documental con todas sus secciones y evidencia original. Se guardó mediante escritura nativa y se releyó en `informes-investigacion/sesiones/20261020__notificaciones/entrega-01/investigacion-documentacion.md`. No se creó el par de consulta.
4. Resultado: configuración válida, documentación accesible, una fuente en el principal disponible y guardado documental comprobado. Código y board `NO_SOLICITADA`; runtime opcional ausente. Esta ruta no utilizó Node ni un servidor del paquete para leer, editar o publicar.

### Preparación de código y lectura secuencial

1. Se amplió la misma configuración para permitir código y documentación, manteniendo raíz documental, modo `auto` y consulta sin guardar. El código de aceptación era `recipients(enabled)` en un único archivo, con retorno de `owner` o lista vacía. Se inicializó Git sin commits; no se modificó ningún repositorio real.
2. `codegraph status "<workspace>" --json` informó inicialmente `initialized:false`. Después de consultar `codegraph init --help`, se ejecutó `codegraph init "<workspace>" --yes` como preparación elegida del sandbox.
3. El segundo `status` (Codegraph 1.6.0) devolvió el workspace correcto, índice propio, `state:complete`, un archivo, dos nodos, una relación, cero cambios pendientes y `worktreeMismatch:null`. Git identificó `master` sin commits y archivos sin seguimiento; se declaró ese contenido local, sin atribuir un commit al índice.
4. Con la delegación excluida de este recorrido, `auto` se resolvió secuencialmente en el principal. Se produjo primero el informe documental completo (`entrega-02`); después se consultó `codegraph query ... recipients --json`, se leyó el archivo original y se produjo el informe de código (`entrega-03`). Ambos archivos se releyeron y `entrega-01` se conservó.
5. Contraste: la documentación expresa intención de notificar al propietario; el código demuestra selección de destinatarios y coerción truthy/falsy, **no** el envío. Los informes declaran contexto compartido, sin corroboración entre investigadores independientes. No se guardó la consulta, de acuerdo con su opción independiente.

## Cobertura de los doce escenarios del plan

| Escenario | Evidencia y alcance de la verificación |
|---|---|
| 1. Proyecto preparado | Relectura de la configuración del sandbox y conservación de valores; rama de entrevista «conservar y comprobar» revisada. No se midió una sesión nueva de asistente con usuario humano. |
| 2. Sin configuración/runtime | Recorrido nativo documental anterior, con creación, lectura, informe completo y guardado real. |
| 3. Sin código local | Primera elección documental con repositorio vacío; ramas elegir/preparar/posponer revisadas en la referencia de código. |
| 4. Sin índice | `initialized:false` → preparación elegida → índice completo y correspondencia comprobados en el sandbox. |
| 5. Documentos y board | Contrato de corpus combinado y varias raíces revisado; configuración abierta probada. No se hizo una consulta conjunta a un board privado real. |
| 6. Autenticación/recarga pendiente | Revisión de la rama: conservar URL, `PENDIENTE`, autenticación en el anfitrión y nueva consulta de alcance tras recarga. No se autenticaron ni registraron conectores reales. |
| 7. Dos configuraciones | Prueba real del resolvedor: selección explícita, integración, común, candidatos ambiguos y exclusión de paquetes. Entrevista revisada para preguntar solo selección. |
| 8. Sin subagentes | Lectura secuencial manual real, documentación antes de código y contexto compartido declarado. |
| 9. Paralelo no disponible | Revisión de la rama de decisión explícita: secuencial/una fuente/pendiente; no se simuló la presencia de lectores aislados. |
| 10. Documentación independiente | Guardado nativo del recorrido y pruebas reales con plugin y MCP, con consulta desactivada. Ocho combinaciones cubiertas en biblioteca. |
| 11. Sin escritura/fallo | Pruebas de fallo por padre no escribible como carpeta y rechazo de enlace sin modificar destino; revisión del retorno completo en conversación. No se inyectó un fallo durante una conversación de otro asistente. |
| 12. Reanudar parcial | Mismo archivo ampliado tras resolver el índice, raíz/preferencias conservadas y estado vuelto a comprobar; reejecución de ambos instaladores probada. |

Las pruebas de instrucciones son una revisión manual de ramas, además de las ejecuciones descritas. No equivalen a una evaluación automatizada de comportamiento de modelos en todos los anfitriones. Configuración válida, acceso comprobado, modo disponible y guardado operativo se registraron por separado; ninguna autenticación o recarga se dio por realizada a partir de un archivo escrito.
