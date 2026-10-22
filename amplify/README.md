# Amplify backend

Esta carpeta contiene la base de datos y la API mínima que puedes usar con tu app de festival.

## Estructura

- `data/festival-events.json`: datos iniciales del festival
- `backend/server.js`: API REST local para eventos

## Ejecutar localmente

```bash
npm run start:api
```

Endpoints disponibles:

- `GET /api/events`
- `POST /api/events`
- `PUT /api/events/:id`
- `PATCH /api/events/:id`
- `DELETE /api/events/:id`

## Preparado para Amplify

Este backend es la base para convertirlo en una API serverless o para conectarlo a Amplify Hosting con una función Node.
