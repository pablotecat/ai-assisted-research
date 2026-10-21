# Documentos locales

Consulta únicamente `LOCAL_DOCUMENT_ROOTS` y subalcances indicados. Lee directamente Markdown y texto plano cuando así se preserven mejor líneas y encabezados.

Para formatos compatibles, usa MarkItDown si está disponible. Si el entorno ofrece un lector o conector de conversión local, sigue su esquema para comprobar disponibilidad y pasar la ruta absoluta. Para la vía CLI:

- En Windows, comprueba `python -X utf8 -m markitdown --version` y convierte con `python -X utf8 -m markitdown "<ruta absoluta del documento>"`, usando el mismo intérprete en ambas llamadas. Si ese Python no contiene el módulo, identifica el intérprete instalado con las herramientas permitidas o registra el bloqueo; la ruta del intérprete depende del entorno.
- En otras plataformas donde funcione, conserva `markitdown --version` y `markitdown "<ruta absoluta del documento>"`.

Analiza el texto devuelto; si se trunca, recupera la salida completa mediante las herramientas disponibles. Ante un fallo, dependencia ausente o documento ilegible, registra archivo, comando (o invocación del conector), código de salida si existe, error y cobertura perdida; continúa con las otras fuentes accesibles. Una salida incompleta o con caracteres alterados no acredita lectura íntegra. Conserva los originales: no instales dependencias ni uses servicios de conversión externos, comandos compuestos, redirecciones o archivos de salida temporales.

Cita siempre la **ruta original**, no el texto convertido. Recoge versión declarada, fecha, etiquetas `WIP`/`Draft` y ubicación cuando consten. Localiza la evidencia por página, encabezado, tabla o párrafo; si la conversión pierde páginas, usa encabezado y frase distintiva, y explica la limitación. Conserva alternativas y excepciones de documentos enfrentados.
