# Resolver la fuente de verdad de ajustes

Contrato compartido por las skills del paquete. Léelo directamente; no abre ninguna entrevista.

La carpeta anfitriona contiene ajustes e informes; `proyecto.repositorio` es el workspace del código y puede estar vacío o fuera de ella. Identifica primero la carpeta anfitriona confirmada por el usuario.

Selecciona, en este orden:

1. Archivo/configuración indicado expresamente por el usuario para este proyecto.
2. Archivo identificado por la integración activa, comprobando su ruta y correspondencia con el proyecto. La interfaz de ajustes puede anunciarlo como `archivo`.
3. `research-settings.json` en la carpeta anfitriona.
4. Otros `research-settings.json` pertinentes dentro del proyecto: revisa las carpetas de configuración (ocultas o de ajustes), sin recorrer repositorios anidados, corpus de ejemplos, dependencias, cachés, salidas de compilación, entornos virtuales, enlaces ni copias de paquetes instalados. Para otras ubicaciones solicita la ruta explícita. Si hay varios candidatos, pregunta **solo** cuál utilizar; si ninguno pertenece inequívocamente al proyecto, pide selección.

Si no hay archivo adecuado, propone crear el común a partir de `research-settings.example.json` del paquete instalado. Localiza el paquete mediante el manifiesto/registro de instalación o su carpeta de origen; la plantilla acompaña al paquete, no al corpus investigado. Los valores predeterminados proceden exclusivamente de esa plantilla. Si no puedes leerla, registra el requisito, sin inventar valores. Una investigación puede continuar con fuentes explícitas y entrega en conversación mientras se resuelve la preparación.

La elección explícita dura la sesión; si una sesión posterior no puede reconstruirla, solicita únicamente esa selección. Reutiliza un único archivo: no copies ni sincronices ajustes. Si una herramienta consume otro archivo, ofrece la vinculación documentada por su adaptador o usa herramientas nativas para ajustes **y** publicaciones. Nunca mezcles preferencias de un archivo con un publicador gobernado por otro.

## Preparación pendiente

Si falta preparación o un dato imprescindible, solicítalo al solicitante e indica `/setup` cuando la entrevista pueda resolver el requisito concreto. La sugerencia no inicia esa skill ni abre la entrevista, y no bloquea hallazgos independientes accesibles, que deben conservarse.
