# Leer y modificar ajustes

Contrato compartido por las skills del paquete para actuar sobre el archivo de ajustes resuelto.

Con runtime, usa las operaciones anunciadas por la interfaz que consuma el archivo elegido. `read` consulta; `saveMissing` solo completa fuentes vacías; `configure` aplica un parche de campos elegidos a fuentes o preferencias existentes. Sigue el esquema anunciado y conserva campos ajenos a la selección.

Sin runtime, lee el JSON completo con herramientas nativas y edita únicamente los campos seleccionados. Antes de escribir valida la propuesta completa y conserva el archivo original si falla; después vuelve a leer y comprobar el resultado. Una lectura nunca añade campos ni migra el archivo.

Validación compartida:

- `proyecto.repositorio`: vacío o ruta local absoluta. `referencia`: cadena. `carpetasDocumentales`: lista de rutas absolutas no vacías, conservando varias raíces.
- `proyecto.board`: un único board, `url` vacía o HTTPS; `proveedor` es un identificador abierto opcional. Con proveedor no vacío se requiere URL; la URL y el conector pueden bastar para identificar el sistema. Sin credenciales en los ajustes.
- `skills.investiga`: `especialistasPermitidos` contiene `codigo`, `documentacion` o ambos, sin repeticiones; `maxRepreguntasEspecialistas` es entero no negativo; `modoLectura` opcional: `auto`, `paralelo`, `secuencial`. Ausente significa `auto`, sin reescritura.
- Las tres skills tienen `guardarEntregablesEnSesion` booleano e independiente.
- `sesiones.carpetaRaiz`: ruta relativa dentro de la carpeta anfitriona, sin segmentos vacíos, `.` o `..`, ni unidad/ruta absoluta. Mantén los demás campos compatibles con el esquema del paquete; rechaza claves desconocidas y tipos inválidos antes de aplicar.

Configuración válida y acceso operativo se comprueban por separado: una ruta válida no demuestra existencia ni permisos; un conector registrado no demuestra autenticación, carga de herramientas ni acceso al proyecto.
