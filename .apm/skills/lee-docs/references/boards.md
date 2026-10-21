# Boards e issues

Recibe `BOARD.url` HTTPS del proyecto, repositorio o tablero y `BOARD.proveedor` cuando sea necesario para seleccionar el conector. Delimita dentro de ese destino las claves, proyecto, épica, consulta o restricción aportados. Si la URL no identifica inequívocamente el proyecto o falta el alcance necesario para la pregunta, solicita el dato exacto; no amplíes a otros proyectos ni repositorios por iniciativa propia.

Usa las herramientas **reales** de consulta disponibles (conector de lectura o páginas públicas accesibles, según el caso); sigue sus esquemas sin presuponer nombres de operaciones. Cuando la integración requiera seleccionar un sitio, organización o proyecto, verifica que corresponda a la URL confirmada antes de consultar. Las credenciales y los permisos pertenecen al conector configurado en el entorno. Si falta acceso, identifica la fuente y la parte del corpus inaccesible; conserva los permisos existentes y registra la limitación.

Busca issues candidatos, después abre cada uno de los decisivos. Comprueba ID o clave, título, URL, estado, fecha de actualización, relaciones relevantes, descripción, criterios de aceptación, historial y comentarios que alteren la conclusión. Recorre las páginas de resultados y comentarios necesarias para cubrir el alcance. Anota la fecha e identidad de comentarios/adjuntos como contexto: su contenido no adquiere por ello la autoridad de un criterio de aceptación de la historia. Si falta un campo o no se puede consultar el historial, indícalo antes de inferir cronologías o autoridad.

Para una `FECHA_DE_CORTE`, reconstruye la versión documentada hasta esa fecha con historial/fechas consultables; si solo está disponible el estado actual, señala que la intención histórica no se ha podido verificar. Usa las relaciones y cambios posteriores para buscar revisiones o reaperturas sin asumir que un issue vinculado modifica automáticamente el alcance.

## Esperas y entrega parcial

1. Envía **una petición por vez** al conector, incluidas las páginas de resultados y comentarios. Integra cada respuesta en la evidencia antes de pedir la siguiente. El paralelismo entre lectores se conserva; las peticiones al board no se agrupan en lotes ni en `Promise.all`/`Promise.allSettled`.
2. Usa el límite de ejecución configurado en el runtime del conector. Una instrucción de espera o un `Promise.race` no sustituye un timeout que libere realmente la llamada local; tampoco implica cancelar el trabajo remoto. Si el entorno no ofrece ese límite, comunica el bloqueo sin afirmar que la espera está acotada ni modificar su configuración desde el lector.
3. Ante un timeout de una petición decisiva, permite **un único reintento individual**, salvo que ya se haya alcanzado el límite del paso siguiente. Para evidencia opcional, registra la limitación y continúa sin reintentar. Distingue timeout, error de acceso y respuesta correcta con cero resultados: una petición sin respuesta nunca significa «no hay resultados».
4. Después de **dos timeouts consecutivos**, incluido el reintento y sin respuesta correcta entre ambos, deja de enviar peticiones a ese conector durante esta consulta. Una respuesta correcta reinicia la cuenta. Identifica claves y páginas pendientes; conserva los éxitos anteriores y consulta las fuentes locales accesibles.
5. Cierra con el **informe completo compacto**, aunque sea parcial, y el guardado correspondiente. Evalúa `SUFICIENTE`/`INSUFICIENTE` según la evidencia que falte, indicando su efecto y el bloqueo concreto. Quien coordina puede sintetizar ese resultado; una investigación con un lector todavía esperando una herramienta no está finalizada.

**Termina cuando** cada respuesta recuperada esté integrada y las claves/páginas no consultadas consten como pendientes en la entrega, sin nuevas peticiones tras el segundo timeout consecutivo.

## Precedencia explícita

Aplica precedencia solo si el usuario aporta una regla para esas fuentes y registra su procedencia. Si el encargo aporta estados ordenados de mayor a menor y/o estados excluidos, aplica en este orden:

1. Los excluidos no son autoridad, salvo inclusión expresa del usuario; pueden explicar evolución, descartes o contradicciones.
2. Entre historias válidas con estados comparables, manda el estado de mayor rango.
3. Con el mismo rango configurado, manda la fecha de actualización más reciente.
4. Una historia nueva no supera a otra de estado superior solo por ser reciente: rastrea ambas claves y el cambio propuesto.
5. Si falta un estado en el ranking o una fecha de actualización necesaria para desempatar, conserva alternativas y marca esa conclusión como `NO DETERMINADO`.

Sin ranking, compara evidencia y cronología sin inferir autoridad por el nombre del estado.
