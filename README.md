# New API Gateway local

Entorno local reproducible para probar New API como gateway OpenAI-compatible, con PostgreSQL persistente, Redis y scripts de relay y saldo.

Incluye un portal de clientes independiente y simplificado. New API queda como motor administrativo y de relay; los clientes usan el portal para consultar saldo, crear claves, revisar modelos y obtener ejemplos de conexión.

## Componentes

- New API `v1.0.0-rc.24`, fijada para evitar cambios inesperados de `latest`.
- PostgreSQL 16 con volumen persistente.
- Redis 7.4 con AOF persistente, recomendado por el Compose oficial.
- Panel y API solamente en `http://localhost:3000`.
- Portal de clientes en `http://127.0.0.1:3100`.

Los valores incorporados son exclusivamente locales. No se deben reutilizar en produccion.

## Repositorio y flujo de trabajo

Este repositorio es la fuente de despliegue del gateway y del portal. El archivo `.env` local nunca se versiona; use `.env.example` como plantilla.

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

- Inicio de sesión y registro usando las cuentas de New API.
- Saldo, solicitudes y actividad reciente.
- Creación, revelado y revocación de subclaves.
- Límite de crédito y modelos permitidos por clave.
- Catálogo con precios finales del plan Profesional.
- Fragmentos listos para `.env`, Python, Node.js y cURL.
- Vista responsive para escritorio y teléfono.

Variables principales:

```env
PORTAL_PORT=3100
PORTAL_NAME=Gateway AI
PUBLIC_GATEWAY_URL=http://127.0.0.1:3000/v1
PORTAL_COOKIE_SECURE=false
```

Para producción, `PUBLIC_GATEWAY_URL` debe apuntar al dominio HTTPS público y `PORTAL_COOKIE_SECURE` debe ser `true`. Los botones de compra quedan en estado no disponible hasta incorporar las credenciales y webhooks de Mercado Pago.

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

### API 快连

Para API 快连, use el endpoint de API que indique su cuenta o su documentacion. `https://apikl.com` puede ser el sitio comercial, pero no debe asumirse que la raiz web es el endpoint OpenAI-compatible. Pegue en **Base URL** la URL de API exacta que entregue el proveedor, normalmente sin `/v1` si New API muestra la advertencia de ruta duplicada. Use solo una clave autorizada para relay/reventa y pruebe el canal con **Test** antes de crear saldo para clientes.

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

3. Cambie todos los secretos locales (`SESSION_SECRET`, `CRYPTO_SECRET`, contrasena de PostgreSQL y Redis) por valores aleatorios. Configure `PUBLIC_GATEWAY_URL=https://api.sudominio.com/v1`, `PORTAL_COOKIE_SECURE=true`, `GIN_MODE=release` y `DEBUG=false`.
4. Revise la configuracion y levante el stack:

   ```bash
   docker compose config --quiet
   docker compose up -d --build
   docker compose ps
   ```

5. Copie `deploy/nginx/gateway.conf.example` a `/etc/nginx/sites-available/gateway`, reemplace `app.example.com` y `api.example.com`, active el sitio y valide:

   ```bash
   sudo ln -s /etc/nginx/sites-available/gateway /etc/nginx/sites-enabled/gateway
   sudo nginx -t && sudo systemctl reload nginx
   ```

6. Emita certificados con Certbot para ambos dominios y fuerce HTTPS. Pruebe el portal en `https://app.sudominio.com` y el relay en `https://api.sudominio.com/v1`.
7. Mantenga New API admin en `http://127.0.0.1:3000` mediante tunel SSH o VPN. No cree una regla Nginx que publique `/`, `/setup` o las rutas `/api/*` administrativas.

Un despliegue habitual completo incluye:

1. VPS (Hetzner, DigitalOcean, Vultr u otro proveedor) con backups y firewall.
2. Dominio, proxy inverso Nginx o Traefik y HTTPS automatico para un endpoint como `https://api.tudominio.com`.
3. PostgreSQL y Redis sin puertos publicos, secretos gestionados externamente y `SESSION_COOKIE_SECURE=true`.
4. Mercado Pago mediante un servicio propio: el webhook valida firma e idempotencia, confirma el pago y llama a una operacion administrativa de New API para acreditar cuota. No exponga credenciales de administrador ni permita que un webhook sin autenticar modifique saldos.
5. Monitoreo de errores, consumo, saldo del proveedor madre, latencia, limites de tasa, rotacion de claves y auditoria de recargas.

Mercado Pago no queda integrado automaticamente por este repositorio. Hay que implementar y probar el adaptador de pagos, su conciliacion y la politica de reembolsos antes de aceptar dinero real.

## Antes de produccion

No publique este Compose tal cual. Use secretos aleatorios externos, TLS y proxy inverso; active `SESSION_COOKIE_SECURE=true`; defina origenes confiables; quite `DEBUG`; restrinja red y puertos de DB/Redis; configure backups, monitoreo, limites de tasa, alertas de saldo, rotacion de claves y una politica de auditoria. Fije y pruebe cada actualizacion de New API antes de desplegarla.
