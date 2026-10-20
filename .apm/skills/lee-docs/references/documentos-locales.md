# Documentos locales

Consulta únicamente `LOCAL_DOCUMENT_ROOTS` y subalcances indicados. Lee directamente Markdown y texto plano cuando así se preserven mejor líneas y encabezados.

Para formatos compatibles, usa MarkItDown si está disponible. Si el entorno ofrece un conector de conversión local, sigue su esquema para comprobar disponibilidad y pasar la ruta absoluta. Si permite la CLI, comprueba `markitdown --version` y ejecuta solo `markitdown "<ruta local>"`. Analiza el texto devuelto; si se trunca, recupera la salida completa mediante las herramientas disponibles. Si falla o falta el conversor, registra error, archivo y cobertura perdida; no inventes el contenido ni recurras a servicios de conversión externos. No instales dependencias ni uses comandos compuestos, redirecciones o archivos de salida temporales.

Cita siempre la **ruta original**, no el texto convertido. Recoge versión declarada, fecha, etiquetas `WIP`/`Draft` y ubicación cuando consten. Localiza la evidencia por página, encabezado, tabla o párrafo; si la conversión pierde páginas, usa encabezado y frase distintiva, y explica la limitación. Conserva alternativas y excepciones de documentos enfrentados.
