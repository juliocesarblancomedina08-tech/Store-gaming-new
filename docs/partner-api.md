
# STORE GAMING Partner API v1

La API de socios permite consultar el catálogo publicado de recargas. Es de solo lectura: esta versión no crea pedidos ni realiza pagos.

## Autenticación

Envía la clave API de STORE GAMING en el encabezado `Authorization` como Bearer token:

```http
Authorization: Bearer sg_live_TU_CLAVE_API
Accept: application/json
```

No envíes la clave en la URL, parámetros de consulta, código público del navegador ni repositorios. Si se filtra, reemplázala desde Ajustes → Clave API.

## Comprobar el servicio

```http
GET /api/partners/v1/health
```

Este endpoint es público y solo informa si el servicio está en línea.

## Consultar ofertas publicadas

```http
GET /api/partners/v1/offers
Authorization: Bearer sg_live_TU_CLAVE_API
```

Filtros opcionales:

- `?service=free-fire-latam`: devuelve un servicio por su identificador.
- `?service=free_fire_latam`: también acepta el `categoryId`.
- `?q=diamonds`: busca por nombre de servicio u oferta.

La respuesta contiene servicios, identificadores de oferta, nombre, precio minorista, moneda USD, campos requeridos para la cuenta de juego y la página del servicio. No devuelve costes del proveedor ni claves internas del proveedor.

## Códigos HTTP

- `200`: consulta correcta.
- `401`: falta la clave API, es inválida o está desactivada.
- `500`: error interno al consultar el catálogo o validar la clave.

## Alcance actual

El endpoint publica los catálogos locales compartidos para Free Fire LATAM, Free Fire ID, Call of Duty Mobile (EE. UU.), Mobile Legends Global, Blood Strike, Arena Breakout, Delta Force, FC Mobile ID, Honor of Kings, League of Legends ID y Sausage Man. No incluye todavía Mobile Legends (EE. UU.), Modern Warships ni las tarjetas regalo; esos productos necesitan un catálogo de ofertas común antes de publicarlos en esta API.

Los precios corresponden a los configurados en el catálogo de STORE GAMING y no garantizan inventario en tiempo real. Esta API no habilita compras externas: las rutas de pedido actuales requieren su propio flujo de autenticación de usuario.
