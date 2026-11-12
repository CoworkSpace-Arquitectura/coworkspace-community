# CoworkSpace · Community Service

![CI-CD](https://github.com/CoworkSpace-Arquitectura/coworkspace-community/actions/workflows/deploy.yml/badge.svg)

Microservicio de comunidad: directorio de miembros, eventos de networking por sede y mensajes entre miembros. Antes de cada acción consulta síncronamente al Membership Service para verificar que el miembro tenga una membresía activa.

- **Endpoints:** `/directory`, `/directory/me`, `/events`, `/events/:id/register`, `/messages`, `/messages/:id/read`
- **Puerto local:** 3006
- **Identidad:** lee el encabezado `x-member-id` que agrega el API Gateway tras validar el JWT. Debe exponerse solo detrás del Gateway.