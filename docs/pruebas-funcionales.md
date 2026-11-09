# Pruebas funcionales locales

## Base de pruebas aislada

No importes directamente `database/confexpress.sql` sobre una base indicada en la línea de comandos. El archivo contiene `CREATE DATABASE confexpress` y `USE confexpress`, por lo que podría cargar o reemplazar datos de la base de trabajo.

En PowerShell, desde la raíz del repositorio, ejecuta lo siguiente. MySQL solicitará la contraseña y solo creará o reemplazará la base `confexpress_pruebas`.

```powershell
$mysql = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
$script = Get-Content .\database\confexpress.sql -Raw
$script.Replace('`confexpress`', '`confexpress_pruebas`') | & $mysql -u root -p
```

No uses una base con información real para estas pruebas. La base `confexpress_pruebas` incluye únicamente el catálogo de ejemplo definido por el proyecto.

Para iniciar el backend contra esa base sin modificar un archivo `.env` existente, abre una terminal nueva y define las variables de esa sesión:

```powershell
$env:DB_HOST = 'localhost'
$env:DB_USER = 'root'
$env:DB_PASSWORD = 'tu_contraseña_de_mysql'
$env:DB_NAME = 'confexpress_pruebas'
$env:ADMIN_PASSWORD = 'clave-solo-pruebas'
$env:PORT = '3002'
npm run dev
```

En otra terminal, inicia el cliente apuntando al backend de pruebas. La variable solo afecta esa sesión y deja el comportamiento normal en el puerto `3001` cuando no se define.

```powershell
$env:VITE_API_URL = 'http://localhost:3002'
npm run dev
```

Con el backend de pruebas activo, ejecuta la validación automatizada desde `backend`:

```powershell
$env:TEST_API_URL = 'http://localhost:3002'
npm run test:pmv
```

## Casos de prueba

1. Registra una solicitud web con un número como `+57 300 123 4567`. Registra otra solicitud con `573001234567`. Ambas deben quedar asociadas a un mismo cliente.
2. Crea una cotización, márcala como enviada y recházala. Debe ser posible crear y aceptar una nueva cotización de esa misma solicitud.
3. Crea una cotización con un día de vigencia. En la base de pruebas, actualiza su fecha con `UPDATE cotizaciones SET fecha_vencimiento = CURDATE() - INTERVAL 1 DAY WHERE id = <id>;`. Al abrir la solicitud, debe mostrarse como vencida y rechazar cualquier intento de aceptarla.
4. Crea dos cotizaciones vigentes para una solicitud. Acepta una y verifica que aparezca un único pedido. El intento de aceptar la otra debe devolver un conflicto y no crear un segundo pedido.
5. Desde Pedidos, cambia el estado en este orden: confirmado, en confección, listo y entregado. Verifica que quede registrada la fecha real de entrega y que no permita volver a un estado anterior.
6. Comprueba que el catálogo público, la solicitud presencial o de WhatsApp, el registro de medidas y el enlace manual de WhatsApp siguen disponibles.
