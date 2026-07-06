# ADR-005: Docker Compose instead of Kubernetes

## Status
Accepted

## Context
The platform needed container orchestration for production. Options:
1. **Docker Compose** — simple, single-node, YAML-based
2. **Kubernetes** — complex, multi-node, industry standard for large scale

## Decision
Use **Docker Compose** for the foreseeable future, with a path to Kubernetes when needed.

## Consequences
**Positive:**
- Simple to set up (single `docker-compose.yml` file)
- Easy to understand and debug
- No additional infrastructure (no k8s control plane)
- Lower cost (single VPS vs. k8s cluster)
- Works well for 1-3 VPS instances

**Negative:**
- Single-node (no automatic failover)
- Manual scaling (no auto-scaling)
- No rolling updates (brief downtime on deploy)

**When to migrate to Kubernetes:**
- When traffic exceeds 10,000+ concurrent users
- When multi-region deployment is needed
- When zero-downtime deploys are critical
- When auto-scaling is required

**Migration path:** The Dockerfile is k8s-compatible. To migrate:
1. Create Kubernetes manifests (Deployment, Service, Ingress, ConfigMap, Secret)
2. Use the same Docker image from GHCR
3. Replace Nginx with an Ingress controller
4. Replace docker-compose volumes with PersistentVolumeClaims
