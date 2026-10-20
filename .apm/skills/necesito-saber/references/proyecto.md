# Ajustes, informes y publicación del proyecto

Contrato compartido por la preparación y las investigaciones. Léelo directamente; no abre ninguna entrevista.

## Resolver una fuente de verdad

La carpeta anfitriona contiene ajustes e informes; `proyecto.repositorio` es el workspace del código y puede estar vacío o fuera de ella. Identifica primero la carpeta anfitriona confirmada por el usuario.

Selecciona, en este orden:

1. Archivo/configuración indicado expresamente por el usuario para este proyecto.
2. Archivo identificado por la integración activa, comprobando su ruta y correspondencia con el proyecto. La interfaz de ajustes puede anunciarlo como `archivo`.
3. `research-settings.json` en la carpeta anfitriona.
4. Otros `research-settings.json` pertinentes dentro del proyecto: revisa las carpetas de configuración (ocultas o de ajustes), sin recorrer repositorios anidados, corpus de ejemplos, dependencias, cachés, salidas de compilación, entornos virtuales, enlaces ni copias de paquetes instalados. Para otras ubicaciones solicita la ruta explícita. Si hay varios candidatos, pregunta **solo** cuál utilizar; si ninguno pertenece inequívocamente al proyecto, pide selección.

Si no hay archivo adecuado, propone crear el común a partir de `research-settings.example.json` del paquete instalado. Localiza el paquete mediante el manifiesto/registro de instalación o su carpeta de origen; la plantilla acompaña al paquete, no al corpus investigado. Los valores predeterminados proceden exclusivamente de esa plantilla. Si no puedes leerla, registra el requisito, sin inventar valores. Una investigación puede continuar con fuentes explícitas y entrega en conversación mientras se resuelve la preparación.

La elección explícita dura la sesión; si una sesión posterior no puede reconstruirla, solicita únicamente esa selección. Reutiliza un único archivo: no copies ni sincronices ajustes. Si una herramienta consume otro archivo, ofrece la vinculación documentada por su adaptador o usa herramientas nativas para ajustes **y** publicaciones. Nunca mezcles preferencias de un archivo con un publicador gobernado por otro.

## Leer y modificar

Con runtime, usa las operaciones anunciadas por la interfaz que consuma el archivo elegido. `read` consulta; `saveMissing` solo completa fuentes vacías; `configure` aplica un parche de campos elegidos a fuentes o preferencias existentes. Sigue el esquema anunciado y conserva campos ajenos a la selección.

Sin runtime, lee el JSON completo con herramientas nativas y edita únicamente los campos seleccionados. Antes de escribir valida la propuesta completa y conserva el archivo original si falla; después vuelve a leer y comprobar el resultado. Una lectura nunca añade campos ni migra el archivo.

Validación compartida:

- `proyecto.repositorio`: vacío o ruta local absoluta. `referencia`: cadena. `carpetasDocumentales`: lista de rutas absolutas no vacías, conservando varias raíces.
- `proyecto.board`: un único board, `url` vacía o HTTPS; `proveedor` es un identificador abierto opcional. Con proveedor no vacío se requiere URL; la URL y el conector pueden bastar para identificar el sistema. Sin credenciales en los ajustes.
- `skills.necesito-saber`: `especialistasPermitidos` contiene `codigo`, `documentacion` o ambos, sin repeticiones; `maxRepreguntasEspecialistas` es entero no negativo; `modoLectura` opcional: `auto`, `paralelo`, `secuencial`. Ausente significa `auto`, sin reescritura.
- Las tres skills tienen `guardarEntregablesEnSesion` booleano e independiente.
- `sesiones.carpetaRaiz`: ruta relativa dentro de la carpeta anfitriona, sin segmentos vacíos, `.` o `..`, ni unidad/ruta absoluta. Mantén los demás campos compatibles con el esquema del paquete; rechaza claves desconocidas y tipos inválidos antes de aplicar.

Configuración válida y acceso operativo se comprueban por separado: una ruta válida no demuestra existencia ni permisos; un conector registrado no demuestra autenticación, carga de herramientas ni acceso al proyecto.

## Informe completo compacto

Un informe completo compacto responde a la pregunta hasta donde permita la evidencia, con condiciones, citas para cada afirmación material, conflictos y límites. Su completitud se mide por cobertura y evidencia, no por longitud ni inventario de lo consultado. Este contrato rige ambos lectores, delegados o en el principal, desde el primer encargo:

1. **Respuesta y suficiencia:** conclusión directa, condiciones y `SUFICIENTE`/`INSUFICIENTE` justificado según el lector.
2. **Alcance verificado:** fuentes, referencia o fecha de corte efectivas y cobertura real.
3. **Hallazgos con evidencia:** ID estable (`C-01` para código, `D-01` para documentación), tipo (`HECHO`, `INFERENCIA`, `NO DETERMINADO`), afirmación y localizador original verificable.
4. **Conflictos y límites:** los que afecten a la respuesta o su confianza, con su efecto explícito.

Integra recorrido, variantes y cronología donde sostengan hallazgos. Usa matrices en lugar de repetir reglas; abre secciones adicionales solo cuando aporten información necesaria y omite las vacías. Formula preguntas de seguimiento solo para una decisión o evidencia concreta que falte; un informe suficiente puede terminar sin ellas.

Consolida fuentes y localizadores en referencias reutilizables: cada afirmación material debe resolverse hasta el original con las precisiones exigidas por su lector. Para una consulta concreta, **600–1.000 palabras por lector**, incluidas referencias, son una orientación, no un mínimo ni un límite: usa menos si basta y amplía para conservar excepciones, citas y cobertura. La brevedad no modifica los criterios de suficiencia.

## Revisiones puntuales

Repregunta solo si una duda puede cambiar la conclusión, una condición, una cita o la suficiencia; `maxRepreguntasEspecialistas` es un máximo. Reutiliza el contexto del lector cuando sea posible y envía IDs afectados, duda exacta y evidencia nueva pertinente. En contexto nuevo añade pregunta, fuentes y referencia/corte, alcance, hallazgos afectados y extractos necesarios, incluidas dependencias y conflictos; amplía solo lo imprescindible para que pueda resolver la duda.

El lector investiga esa duda y devuelve una **revisión puntual**, no otro informe completo:

```markdown
# Revisión puntual
- Hallazgos afectados: <IDs existentes; IDs nuevos solo para hallazgos nuevos>
- Operación: ampliar | corregir | retirar | confirmar sin cambios
- Resultado: <afirmación resultante e identificación de la sustituida o retirada>
- Evidencia consultada: <fuente original y localizador>
- Efecto en la respuesta y sus condiciones: ...
- Suficiencia y límites actualizados: <estado justificado; indicar también si no cambian>
```

Si hace falta ampliar el alcance, identifica qué parte y por qué. El principal integra la revisión en la base y comprueba coherencia de respuesta, hallazgos, citas, condiciones y suficiencia. Conserva IDs existentes y el historial de retiradas, sin reutilizarlos:

- **Sin cambio material:** registra la comprobación y su evidencia en el contraste; conserva el informe vigente sin publicar una copia idéntica.
- **Cambio material:** materializa una nueva versión completa, conserva la anterior y enlázala desde la nueva entrega o síntesis.
- **Integración incierta:** pide la precisión que falta; solicita un informe completo nuevo solo si el cambio exige rehacerlo.

## Publicar desde el principal

Los lectores delegados devuelven el informe o revisión solicitado y sus fuentes, sin publicar. El principal aplica de forma independiente:

| Informe | Condición |
|---|---|
| `investigacion.md` | Código solicitado/permitido y guardado de `lee-codigo` activo. |
| `investigacion-documentacion.md` | Documentación solicitada/permitida y guardado de `lee-docs` activo, aunque la consulta no se guarde. |
| `resumen-ejecutivo.md`, `informe-detallado.md` | Guardado de `necesito-saber` activo. |

Prefiere un publicador compatible con el archivo elegido y el tipo de informe. Abre una investigación si su interfaz lo requiere y conserva su identificador para lectores, revisiones y síntesis; usa únicamente identificadores devueltos. Publica informes iniciales y versiones materialmente distintas sin sobrescribir entregas previas. Usa los esquemas reales: si el publicador exige contenido completo, el principal lo reconstruye desde la base y las revisiones; una revisión diferencial no supone una API de parches. Si ya guardaste el documental por separado, omítelo al publicar la consulta. La síntesis conserva el contraste y enlaza los informes existentes en lugar de reproducirlos.

Verifica rutas y relee el contenido completo publicado antes de anunciarlo, también con publicador. Reducir el intercambio entre agentes no elimina esta comprobación. Anuncia exclusivamente archivos confirmados y registra individualmente los pendientes.

### Escritura nativa

Si falta publicador compatible y hay escritura autorizada, el principal puede guardar sin terminal, Node ni servicios auxiliares:

1. Resuelve `sesiones.carpetaRaiz` dentro de la carpeta anfitriona. Comprueba padres y destino: carpetas reales, sin enlaces que desvíen la salida. Si no puedes comprobarlo, entrega en conversación y registra el pendiente.
2. Crea una carpeta nueva `AAAAMMDD-HHMM__tema` bajo esa raíz; si existe, elige un sufijo libre. Usa esa carpeta durante toda la investigación. Crea una subcarpeta nueva `entrega-01`, `entrega-02`, etc. por publicación, comprobando que no exista antes de escribir. No sobrescribas entregas previas.
3. Escribe únicamente los informes habilitados con los nombres anteriores. Lee cada archivo guardado y contrasta el contenido completo antes de anunciar su ruta. Conserva contenido, fuentes, modo efectivo y enlaces a las entregas anteriores en el informe o índice de la investigación.
4. Si una escritura falla, identifica exactamente los archivos confirmados y los pendientes y aplica la presentación por informe indicada abajo. Anuncia una entrega conjunta como completa solo si todos sus archivos están confirmados.

Esta vía no ofrece los controles de identidad, bloqueo, concurrencia ni atomicidad del runtime. Si dos coordinadores comparten carpeta, cada uno debe elegir una carpeta nueva y verificar sus destinos. Un fallo opcional de guardado no invalida hallazgos comprobados ni cambia por sí mismo `SUFICIENTE`/`INSUFICIENTE`.

## Presentación al usuario

El principal decide la presentación por informe, también con una fuente, en secuencial o en consultas directas a un lector:

| Estado del informe | Entrega en conversación |
|---|---|
| Guardado y verificado | Respuesta directa, citas decisivas, conflictos/límites esenciales y enlace; el archivo contiene el informe completo. |
| Guardado desactivado, no disponible o sin confirmación | Informe completo compacto de esa parte. |
| Guardado parcial | Enlaces de los archivos confirmados y contenido completo de las partes pendientes, con estado individual. |
| Petición expresa de informe completo en conversación | Inclúyelo aunque esté guardado. |

La respuesta se sostiene por sí misma: conclusión, condiciones decisivas, discrepancias relevantes, modo efectivo, fuentes usadas y contextos aislados o compartidos. Con ambos lectores y todos los guardados confirmados, **250–500 palabras** son una orientación flexible, no un mínimo; ajusta a la pregunta y preferencias del usuario. El detalle completo queda en los archivos enlazados, sin anexos ni desplegables automáticos en conversación.
