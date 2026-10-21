# Índice global de sesiones

El coordinador mantiene `indice-sesiones.md` directamente en `sesiones.carpetaRaiz` mediante herramientas nativas de lectura y escritura, también cuando un runtime publica los informes.

Al cerrar cada respuesta:

1. Comprueba que la carpeta de investigación contiene al menos un entregable confirmado. Si todos los guardados están desactivados, conserva la entrega en conversación y omite la creación de carpetas o entradas vacías. **Termina cuando** exista un destino confirmado o conste que esta pregunta no se indexa.
2. Comprueba que los padres y el destino son seguros, sin enlaces que desvíen la escritura. Lee el índice global completo si existe; el destino existente debe ser un archivo regular. **Termina cuando** dispongas de la base completa o hayas confirmado su ausencia y un destino seguro.
3. Conserva las filas existentes y añade las preguntas iniciales y ampliaciones, también las ya cubiertas que no requieren reescribir informes. Usa una tabla con columnas `Fecha`, `Pregunta` y `Sesión`: fecha `AAAA-MM-DD`, pregunta del usuario y enlace relativo a la carpeta de investigación. Normaliza saltos de línea y escapa caracteres de tabla en el texto de la pregunta. Cada pregunta tiene su fila; las ampliaciones enlazan la misma carpeta y los reintentos del mismo turno reutilizan su entrada. Las confirmaciones, instrucciones de formato y repreguntas internas entre roles quedan fuera del índice. **Termina cuando** la propuesta conserve las filas previas y cada entrada nueva corresponda a una pregunta del usuario y a una carpeta confirmada.
4. Antes de escribir, vuelve a leer el índice: si cambió desde la lectura anterior, retoma el paso 2 e integra las entradas. Guarda la propuesta y relee su contenido completo para verificar filas y enlaces. **Termina cuando** el índice esté confirmado o se haya identificado su fallo como pendiente.

Si falla el índice, conserva los informes confirmados y comunica por separado «documentos guardados» e «índice pendiente». Mantén las preguntas pendientes en el contexto para reintentar su registro al siguiente cierre. La escritura nativa no garantiza exclusión mutua entre coordinadores concurrentes.
