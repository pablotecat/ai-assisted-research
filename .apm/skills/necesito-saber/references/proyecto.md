# Ajustes y publicación del proyecto

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

## Publicar desde el principal

Los lectores delegados devuelven contenido completo y fuentes, sin publicar. El principal aplica de forma independiente:

| Informe | Condición |
|---|---|
| `investigacion.md` | Código solicitado/permitido y guardado de `lee-codigo` activo. |
| `investigacion-documentacion.md` | Documentación solicitada/permitida y guardado de `lee-docs` activo, aunque la consulta no se guarde. |
| `resumen-ejecutivo.md`, `informe-detallado.md` | Guardado de `necesito-saber` activo. |

Prefiere un publicador compatible con el archivo elegido y el tipo de informe. Abre una investigación si su interfaz lo requiere y conserva su identificador para lectores, revisiones y síntesis. Guarda cada informe completo recibido y las revisiones solicitadas. Si ya guardaste el documental por separado, omítelo al publicar la consulta. Enlaza desde el informe de consulta las entregas existentes; conserva el historial.

### Escritura nativa

Si falta publicador compatible y hay escritura autorizada, el principal puede guardar sin terminal, Node ni servicios auxiliares:

1. Resuelve `sesiones.carpetaRaiz` dentro de la carpeta anfitriona. Comprueba padres y destino: carpetas reales, sin enlaces que desvíen la salida. Si no puedes comprobarlo, entrega en conversación y registra el pendiente.
2. Crea una carpeta nueva `AAAAMMDD-HHMM__tema` bajo esa raíz; si existe, elige un sufijo libre. Usa esa carpeta durante toda la investigación. Crea una subcarpeta nueva `entrega-01`, `entrega-02`, etc. por publicación, comprobando que no exista antes de escribir. No sobrescribas entregas previas.
3. Escribe únicamente los informes habilitados con los nombres anteriores. Lee cada archivo guardado y contrasta el contenido completo antes de anunciar su ruta. Conserva contenido, fuentes, modo efectivo y enlaces a las entregas anteriores en el informe o índice de la investigación.
4. Si una escritura falla, identifica exactamente los archivos confirmados y los pendientes; entrega todos los informes completos en conversación. No anuncies una entrega conjunta como completa si falta alguno de sus archivos.

Esta vía no ofrece los controles de identidad, bloqueo, concurrencia ni atomicidad del runtime. Si dos coordinadores comparten carpeta, cada uno debe elegir una carpeta nueva y verificar sus destinos. Un fallo opcional de guardado no invalida hallazgos comprobados ni cambia por sí mismo `SUFICIENTE`/`INSUFICIENTE`.
