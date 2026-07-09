# Despliegue en Nico-Server (Portainer + Caddy)

## Requisitos previos en el servidor

```bash
# Red compartida con Caddy (solo la primera vez)
docker network create caddy_net
```

## 1. Portainer — nuevo stack

- **Stacks** → **Add stack** → **Repository**
- Repository URL: tu repo de GitHub
- Compose path: `docker-compose.prod.yml`
- **Environment variables** (modo Advanced):

```
POSTGRES_PASSWORD=tu_clave_segura
JWT_SECRET=tu_secreto_jwt_largo
```

- Deploy the stack (el primer build puede tardar varios minutos en el Celeron)

## 2. Caddyfile

Agregar en `/data/compose/1/Caddyfile` (o donde tengas el Caddyfile):

```caddyfile
sigce.mrjaime-glb.uk {
    reverse_proxy sigce-frontend:80
}
```

Redesplegar o reiniciar el stack de Caddy.

## 3. DNS (Cloudflare)

```
Type: A
Name: sigce
Content: 200.50.59.223
Proxy: DNS only (nube gris)
```

Port forwarding en el router: **80** y **443** → `192.168.1.123` (si aún no están abiertos).

## 4. Verificación

```bash
docker ps --format "{{.Names}}\t{{.Status}}" | grep sigce
curl -s https://sigce.mrjaime-glb.uk/health
```

Respuesta esperada: `{"service":"gateway","status":"ok"}`

**Credenciales demo:** `oficial1` / `aduana2026`

## 5. Homepage (opcional)

En `/home/nico/homepage-config/services.yaml`:

```yaml
    - SIGCE:
        href: https://sigce.mrjaime-glb.uk
        description: Check-in fronterizo
        container: sigce-frontend
        icon: mdi-passport
```

```bash
docker restart homepage
```

## Desarrollo local

Sigue usando `docker-compose.yml` (puertos expuestos + `dist` manual):

```bash
cd sigce-app && npm install && npm run build
cd .. && docker compose up --build
```

Frontend: http://localhost:4173
