# Orbiqen Gateway local

Entorno local reproducible para probar New API como gateway OpenAI-compatible, con PostgreSQL persistente, Redis y scripts de relay y saldo.

Incluye un portal de clientes independiente y simplificado. New API queda como motor administrativo y de relay; los clientes usan el portal para consultar saldo, crear claves, revisar modelos y obtener ejemplos de conexión.

## Componentes

- New API `v1.0.0-rc.24`, fijada y compilada con la plantilla de correo de Orbiqen.
- PostgreSQL 16 con volumen persistente.
- Redis 7.4 con AOF persistente, recomendado por el Compose oficial.
- Panel y API solamente en `http://localhost:3000`.
- Portal de clientes en `http://127.0.0.1:3100`.

Los valores incorporados son exclusivamente locales. No se deben reutilizar en produccion.

## Repositorio y flujo de trabajo

Este repositorio es la fuente de despliegue del gateway y del portal. El archivo `.env` local nunca se versiona; use `.env.example` como plantilla.

La guia visual para administradores esta en [`docs/admin-guide.html`](docs/admin-guide.html). Es un HTML local con checklist, comandos copiables y campos de sesion para credenciales; no contiene secretos reales.

```powershell
git clone https://github.com/Scribax/Gateway.git
Set-Location .\Gateway
Copy-Item .env.example .env
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Antes de publicar cambios, valide el portal:

```powershell
Set-Location .\portal
npm ci
npm run build
npm run lint
Set-Location ..
```

No haga commit de `.env`, claves de API, dumps de PostgreSQL, `portal/node_modules` ni `.next`.

## 1. Arranque

Requisitos: Docker Desktop con el motor Linux iniciado, Docker Compose y Python 3.10 o posterior.

PowerShell:

```powershell
Copy-Item .env.example .env
docker compose pull
docker compose up -d
docker compose ps
```

Espere a que `new-api` aparezca como `healthy`. Para seguir el arranque:

```powershell
docker compose logs -f new-api
```

Compruebe la API:

```powershell
Invoke-RestMethod http://localhost:3000/api/status
```

Si otro programa ocupa `localhost:3000` en IPv6, pruebe `http://127.0.0.1:3000` o cambie `NEW_API_PORT` en `.env` (por ejemplo, `3001`) y use el mismo puerto en `NEW_API_BASE_URL`.

Abra `http://localhost:3000`.

El acceso de clientes es `http://127.0.0.1:3100`. El portal se construye junto con el resto del Compose y espera a que New API esté saludable.

## Portal de clientes

El directorio `portal/` contiene una aplicación Next.js independiente. No modifica el frontend de New API y puede actualizarse sin mezclar código con el gateway.

Funciones disponibles:

- Inicio de sesión y registro con verificación de correo usando las cuentas de New API.
- Saldo, solicitudes y actividad reciente.
- Creación, revelado y revocación de subclaves.
- Límite de crédito y modelos permitidos por clave.
- Catálogo con precios finales del plan Profesional.
- Fragmentos listos para `.env`, Python, Node.js y cURL.
- Vista responsive para escritorio y teléfono.

Variables principales:

```env
PORTAL_PORT=3100
PORTAL_NAME=Orbiqen
PUBLIC_GATEWAY_URL=http://127.0.0.1:3000/v1
PORTAL_COOKIE_SECURE=false
```

Para producción, `PUBLIC_GATEWAY_URL` debe apuntar al dominio HTTPS público y `PORTAL_COOKIE_SECURE` debe ser `true`. El portal ofrece recargas por Mercado Pago y NOWPayments desde US$ 1; las credenciales crypto se configuran solamente en `.env`.

### Verificación de correo con Resend

El portal usa el mecanismo de verificación incorporado en New API. Resend se conecta como servidor SMTP; la API key de Resend se guarda solamente en el panel administrativo de New API y nunca en Git.

La imagen `orbiqen/new-api:v1.0.0-rc.24-2` se construye desde el tag oficial y aplica exclusivamente [`deploy/new-api/email-template.patch`](deploy/new-api/email-template.patch). El parche reemplaza el correo chino de verificación por una plantilla transaccional en español con el logo de Orbiqen. Al actualizar `NEW_API_VERSION`, primero verifique que el parche siga aplicando y pruebe el registro completo antes de desplegar.

Antes de configurar el envío, agregue y verifique `orbiqen.com` en **Resend > Domains**. Luego use una dirección remitente del dominio, por ejemplo `no-reply@orbiqen.com`. El remitente de prueba de Resend no sirve para enviar libremente a clientes reales.

En New API abra **System Settings / Configuración del sistema > Email / SMTP** y use:

```text
SMTP Server: smtp.resend.com
SMTP Port: 465
SMTP Account / Username: resend
SMTP Token / Password: [API key de Resend]
SMTP From: no-reply@orbiqen.com
SSL: activado
STARTTLS: desactivado
Insecure Skip Verify: desactivado
Force AUTH LOGIN: desactivado
```

Guarde y use la prueba de correo del panel si está disponible. Como alternativa, Resend también admite el puerto `587`; en ese caso desactive **SSL** y active **STARTTLS**.

Finalmente, en **System Settings > Operation Settings** active:

```text
Register enabled
Password register enabled
Email verification enabled
```

El cliente ahora pulsa **Crear una cuenta nueva**, escribe su correo, solicita el código, ingresa los seis dígitos recibidos y crea la cuenta. New API valida el código antes de guardar el usuario. Para comprobarlo, regístrese con un correo real desde el portal; el evento debe aparecer como `Delivered` en **Resend > Emails**.

Si aparece `SMTP server is not configured`, falta guardar alguno de los campos SMTP. Si Resend rechaza el remitente, confirme que `SMTP From` pertenece exactamente a un dominio verificado. Nunca pegue la API key en `.env.example`, documentación, capturas, commits ni logs.

## 2. Primer administrador

Esta version de New API **no tiene credenciales predeterminadas**. En una base nueva redirige al asistente `/setup`, donde las credenciales se crean una sola vez. Para este laboratorio use:

```text
Usuario: admin
Contrasena: LocalAdmin-ChangeMe!
Modo: operacion/publico (Self-use desactivado)
Demo site: desactivado
```

Estas son credenciales propuestas para el laboratorio, no credenciales incluidas en la imagen. Cambielas antes de exponer el servicio.

Acceso directo al asistente: `http://127.0.0.1:3000/setup`.

## 3. Configurar la API madre

Los textos exactos varian con el idioma del panel, pero el flujo es el siguiente:

1. Inicie sesion como `admin` y abra **Channels / Canales**.
2. Pulse **Add channel / Agregar canal**.
3. Elija el tipo **OpenAI** para cualquier proveedor OpenAI-compatible.
4. Nombre sugerido: `proveedor-madre-local`.
5. Pegue la clave madre en **Key**. No la agregue al repositorio ni a `.env`.
6. En **Base URL**, use el origen del proveedor sin `/v1`, por ejemplo `https://api.proveedor.example`. New API agrega `/v1`; la propia interfaz advierte que terminar en `/v1` puede duplicar la ruta.
7. En **Models**, seleccione o escriba exactamente los modelos ofrecidos por el upstream, por ejemplo `gpt-4o-mini`. Si el nombre vendido sera distinto, configure **Model mapping**.
8. Asigne el grupo `default`, guarde y use **Test** en la fila del canal. La prueba debe quedar en verde antes de continuar.

La URL y el formato de autenticacion dependen del proveedor. Si no es realmente OpenAI-compatible, seleccione su adaptador especifico. Confirme ademas que el contrato del proveedor permite reventa y sublicenciamiento.

### Wluvyh

El proveedor madre actual es Wluvyh. El sitio comercial es `https://www.wluvyh.cloud/` y el endpoint OpenAI-compatible para New API es `https://api.wluvyh.cloud`.

En **Channels / Canales**, cree o edite el canal madre con:

```text
Tipo: OpenAI
Nombre sugerido: Wluvyh Madre
Base URL: https://api.wluvyh.cloud
Key: pegar la clave madre solo en el panel de New API
```

No agregue la clave madre al repositorio, a `.env.example` ni a scripts de cliente. New API agrega `/v1` internamente cuando corresponde; si el panel advierte ruta duplicada, mantenga la Base URL sin `/v1`.

Modelos observados en `GET /v1/models` del nuevo gateway al 18 de agosto de 2026:

```text
codex-auto-review
gpt-4o-audio-preview
gpt-4o-realtime-preview
gpt-5.2
gpt-5.2-2025-12-11
gpt-5.2-chat-latest
gpt-5.2-pro
gpt-5.2-pro-2025-12-11
gpt-5.3-codex-spark
gpt-5.4
gpt-5.4-2026-03-05
gpt-5.4-mini
gpt-5.5
gpt-5.6
gpt-5.6-sol
gpt-5.6-terra
gpt-image-1
gpt-image-1.5
gpt-image-2
```

`gpt-5.6-luna` no aparece en el nuevo gateway; quite ese modelo de los canales, grupos, tokens y catálogos antes de probar clientes. Tras cambiar el canal, ejecute **Test** desde New API y luego valide con una subclave de cliente. Si `/v1/models` responde pero una completion devuelve `502`, el endpoint y la autenticacion llegan al proveedor, pero el modelo/canal aun requiere validacion del lado de Wluvyh antes de aceptar trafico real.

## 4. Precio y margen

New API calcula el cargo usando el precio/ratio del modelo y el ratio del grupo. Primero asegure que el precio base del modelo coincide con el costo que quiere tomar como referencia.

1. Abra **System settings / Configuracion del sistema**.
2. Entre en **Billing / Facturacion** y luego **Models / Model ratio**.
3. Verifique el precio de entrada y salida del modelo configurado.
4. En la seccion **Group ratio**, cambie `default` de `1` a `1.25` y guarde.

`1.25` cobra 25 % sobre el precio base. Eso equivale a 20 % de margen sobre el precio de venta, no a 25 % de margen. Para un margen objetivo `m`, use `multiplicador = 1 / (1 - m)`; por ejemplo, 25 % de margen requiere aproximadamente `1.3333`.

No aplique simultaneamente un sobreprecio al modelo y al grupo sin calcular el efecto: ambos multiplicadores se acumulan.

## 5. Usuario con USD 10

1. Como administrador, abra **Users / Usuarios** y pulse **Add user**.
2. Cree `cliente_test` con una contrasena local, rol **User**, estado habilitado y grupo `default`.
3. Asigne cuota/saldo `USD 10`. Si el formulario muestra unidades internas, introduzca `5000000`, porque el valor predeterminado es `500000 unidades = USD 1`.
4. Guarde, cierre la sesion de administrador e inicie sesion como `cliente_test`.

## 6. Crear la sub-clave

1. En la sesion de `cliente_test`, abra **Tokens / API Tokens**.
2. Pulse **Add token**, nombre `test-relay` y deje el token habilitado.
3. Desactive cuota ilimitada y asigne `USD 10` o `5000000` unidades, segun lo que muestre el formulario.
4. Seleccione `gpt-4o-mini` en la restriccion de modelos si decide activarla. Sin restriccion, el canal y el grupo determinan los modelos disponibles.
5. Guarde y revele/copiar la clave una sola vez. Debe comenzar con `sk-`.
6. Edite `.env` y reemplace `NEW_API_KEY`. Ajuste `TEST_MODEL` al nombre exacto habilitado en el canal.

El usuario y el token tienen limites independientes; una peticion necesita saldo en ambos. No use la clave madre en los scripts.

## 7. Prueba automatizada del relay

Instale la unica dependencia del cliente y ejecute:

```powershell
python -m pip install requests
python .\test_relay.py
```

El script imprime codigo HTTP, modelo, texto y tokens de prompt, completion y total. Tambien acepta parametros:

```powershell
python .\test_relay.py --model gpt-4o-mini --prompt "Responde OK"
```

Si el proveedor no devuelve `usage`, los contadores se muestran como `N/D`; esto no significa necesariamente que New API no haya facturado.

## 8. Verificar descuento

Ejecute una vez antes y otra despues del relay para comparar:

```powershell
python .\check_usage.py
python .\test_relay.py
python .\check_usage.py
```

`check_usage.py` consulta `GET /api/usage/token/` autenticado con la sub-clave. Muestra cuota otorgada, consumida y restante, y convierte el saldo a USD con `quota_per_unit` obtenido de `/api/status`.

La prueba se considera aceptada cuando el canal responde HTTP 200, el modelo devuelve contenido y el valor `total_available` de la sub-clave disminuye después de una petición facturable. Un proveedor que no devuelva `usage` puede seguir siendo facturable, pero requiere confirmar el consumo en los logs del panel.

## Operacion local

Detener conservando datos:

```powershell
docker compose down
```

Reiniciar:

```powershell
docker compose up -d
```

Eliminar todo el laboratorio, incluida la base y las claves (operacion irreversible):

```powershell
docker compose down -v
```

## Diagnostico rapido

```powershell
docker compose ps
docker compose logs --tail 200 new-api
docker compose logs --tail 100 postgres
docker compose config
```

- `connection refused`: Docker Desktop no esta iniciado o New API aun no esta `healthy`.
- `404` con una pagina que no dice New API: otro proceso esta atendiendo el nombre/puerto local (comun en `localhost` IPv6); pruebe `127.0.0.1` o cambie `NEW_API_PORT`.
- `invalid token`: `.env` contiene una clave incorrecta, revocada o sin el prefijo `sk-`.
- `model not found`: `TEST_MODEL`, la lista del canal y el nombre real del upstream no coinciden.
- `insufficient quota`: falta saldo en el usuario o en el token.
- `404`/ruta duplicada: quite `/v1` de la Base URL del canal madre.

## Siguiente fase: produccion en Argentina

El mismo Compose sirve como base para el VPS. Los puertos están ligados a `127.0.0.1`, por lo que Nginx/Traefik en el host puede publicar solo las rutas necesarias. No exponga el puerto 3000 directamente a Internet: contiene la interfaz administrativa de New API además del relay.

### Despliegue recomendado en VPS

1. Instale Docker Engine, Compose Plugin, Git y Nginx en un VPS nuevo. Abra en el firewall solo `22`, `80` y `443`.
2. Clone el repositorio y cree `.env`:

   ```bash
   git clone https://github.com/Scribax/Gateway.git /opt/gateway
   cd /opt/gateway
   cp .env.example .env
   chmod 600 .env
   ```

3. Cambie todos los secretos locales (`SESSION_SECRET`, `CRYPTO_SECRET`, contrasena de PostgreSQL y Redis) por valores aleatorios. Para este dominio configure `PUBLIC_GATEWAY_URL=https://orbiqen.com/v1`, `PORTAL_COOKIE_SECURE=true`, `GIN_MODE=release` y `DEBUG=false`.
4. Configure los pagos antes de publicar recargas. En `.env` agregue `PUBLIC_PORTAL_URL=https://orbiqen.com`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET` y `NEW_API_ADMIN_TOKEN`. Configure el IPN de NOWPayments hacia `https://orbiqen.com/api/payments/nowpayments/webhook`. Todos los tokens son secretos: no deben entrar en Git ni en el navegador.
5. Revise la configuracion y levante el stack con el script de deploy:

   ```bash
   chmod +x deploy/update-vps.sh
   sudo PROJECT_DIR=/opt/gateway ./deploy/update-vps.sh
   ```

   El script actualiza desde Git, crea `.env` si falta, guarda backup de la configuracion, fuerza variables seguras de produccion, ejecuta `docker compose up -d --build` y muestra los pasos para cambiar el canal madre a Wluvyh dentro de New API.

6. Copie `deploy/nginx/gateway.conf.example` a `/etc/nginx/sites-available/orbiqen`, active el sitio y valide:

   ```bash
   sudo ln -s /etc/nginx/sites-available/orbiqen /etc/nginx/sites-enabled/orbiqen
   sudo nginx -t && sudo systemctl reload nginx
   ```

7. Emita el certificado con Certbot para `orbiqen.com` y `www.orbiqen.com`. El portal quedara en `https://orbiqen.com` y el relay en `https://orbiqen.com/v1`.
8. En Mercado Pago configure el webhook de pagos hacia `https://orbiqen.com/api/payments/mercadopago/webhook` y copie su secreto de firma en `MERCADOPAGO_WEBHOOK_SECRET`. En NOWPayments configure el IPN hacia `https://orbiqen.com/api/payments/nowpayments/webhook` y copie su IPN Secret en `NOWPAYMENTS_IPN_SECRET`. Ambos endpoints validan firma, moneda/importe/orden y completan la recarga en New API una sola vez.
9. Mantenga New API admin en `http://127.0.0.1:3000` mediante tunel SSH o VPN. No cree una regla Nginx que publique `/`, `/setup` o las rutas `/api/*` administrativas.

Para actualizaciones posteriores en el VPS:

```bash
cd /opt/gateway
git pull --ff-only origin main
sudo ./deploy/update-vps.sh
```

Por defecto, `deploy/update-vps.sh` reconstruye solo el portal y reutiliza la imagen existente de New API para evitar errores `137`/`SIGKILL` por falta de RAM durante el build web de New API. Si necesita recompilar New API en el VPS, use:

```bash
sudo BUILD_NEW_API=true ./deploy/update-vps.sh
```

En VPS chicos, cree swap o construya la imagen custom fuera del servidor antes de usar `BUILD_NEW_API=true`.

El cambio de proveedor madre no se guarda en Git: pegue la clave Wluvyh en **Channels / Canales** desde el panel administrativo de New API. La Base URL del canal debe ser `https://api.wluvyh.cloud`.

Mientras todavia no haya dominios, puede usar `deploy/nginx/gateway-ip.conf.example`: publica el portal en la IP y dirige exclusivamente `/v1/` al relay. Es una configuracion temporal sin HTTPS; reemplácela por `gateway.conf.example` antes de recibir clientes reales.

Un despliegue habitual completo incluye:

1. VPS (Hetzner, DigitalOcean, Vultr u otro proveedor) con backups y firewall.
2. Dominio, proxy inverso Nginx o Traefik y HTTPS automatico para un endpoint como `https://api.tudominio.com`.
3. PostgreSQL y Redis sin puertos publicos, secretos gestionados externamente y `SESSION_COOKIE_SECURE=true`.
4. Mercado Pago Checkout Pro y NOWPayments ya estan integrados en el portal. Ambos webhooks validan firma, confirman el pago con el proveedor, usan la orden pendiente de New API y completan la recarga con una operacion administrativa idempotente. No exponga credenciales de administrador ni permita que un webhook sin autenticar modifique saldos.
5. Monitoreo de errores, consumo, saldo del proveedor madre, latencia, limites de tasa, rotacion de claves y auditoria de recargas.

Las recargas aprobadas se convierten con una tasa fija de `1 USD = 1.600 ARS`. El portal ofrece un paquete mínimo de `US$ 1` y permite importes personalizados mayores a `US$ 1`, con hasta dos decimales. Las URLs de retorno muestran el estado aprobado, pendiente o rechazado dentro de la vista **Saldo**. Antes de aceptar dinero real, prueba primero una recarga de `US$ 1` en produccion y verifica el saldo, el registro de recarga y el webhook en los logs.

## Antes de produccion

No publique este Compose tal cual. Use secretos aleatorios externos, TLS y proxy inverso; active `SESSION_COOKIE_SECURE=true`; defina origenes confiables; quite `DEBUG`; restrinja red y puertos de DB/Redis; configure backups, monitoreo, limites de tasa, alertas de saldo, rotacion de claves y una politica de auditoria. Fije y pruebe cada actualizacion de New API antes de desplegarla.
