# Boards e issues

Recibe `BOARD.url` HTTPS del proyecto, repositorio o tablero y `BOARD.proveedor` cuando sea necesario para seleccionar el conector. Delimita dentro de ese destino las claves, proyecto, épica, consulta o restricción aportados. Si la URL no identifica inequívocamente el proyecto o falta el alcance necesario para la pregunta, solicita el dato exacto; no amplíes a otros proyectos ni repositorios por iniciativa propia.

Usa las herramientas **reales** de consulta disponibles (conector de lectura o páginas públicas accesibles, según el caso); sigue sus esquemas sin presuponer nombres de operaciones. Cuando la integración requiera seleccionar un sitio, organización o proyecto, verifica que corresponda a la URL confirmada antes de consultar. Las credenciales y los permisos pertenecen al conector configurado en el entorno. Si falta acceso, identifica la fuente y la parte del corpus inaccesible; conserva los permisos existentes y registra la limitación.

Busca issues candidatos, después abre cada uno de los decisivos. Comprueba ID o clave, título, URL, estado, fecha de actualización, relaciones relevantes, descripción, criterios de aceptación, historial y comentarios que alteren la conclusión. Recorre las páginas de resultados y comentarios necesarias para cubrir el alcance. Anota la fecha e identidad de comentarios/adjuntos como contexto: su contenido no adquiere por ello la autoridad de un criterio de aceptación de la historia. Si falta un campo o no se puede consultar el historial, indícalo antes de inferir cronologías o autoridad.

Para una `FECHA_DE_CORTE`, reconstruye la versión documentada hasta esa fecha con historial/fechas consultables; si solo está disponible el estado actual, señala que la intención histórica no se ha podido verificar. Usa las relaciones y cambios posteriores para buscar revisiones o reaperturas sin asumir que un issue vinculado modifica automáticamente el alcance.

## Precedencia explícita

Aplica precedencia solo si el usuario aporta una regla para esas fuentes y registra su procedencia. Si el encargo aporta estados ordenados de mayor a menor y/o estados excluidos, aplica en este orden:

1. Los excluidos no son autoridad, salvo inclusión expresa del usuario; pueden explicar evolución, descartes o contradicciones.
2. Entre historias válidas con estados comparables, manda el estado de mayor rango.
3. Con el mismo rango configurado, manda la fecha de actualización más reciente.
4. Una historia nueva no supera a otra de estado superior solo por ser reciente: rastrea ambas claves y el cambio propuesto.
5. Si falta un estado en el ranking o una fecha de actualización necesaria para desempatar, conserva alternativas y marca esa conclusión como `NO DETERMINADO`.

Sin ranking, compara evidencia y cronología sin inferir autoridad por el nombre del estado.
