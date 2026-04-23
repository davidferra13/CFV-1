AnythingLLM hosted instance

- Host port: `54390`
- Storage path: `C:\Users\david\Documents\AnythingLLM-Hosted-54390\storage`
- Compose file: `anythingllm-hosted/docker-compose.yml`
- Mobile root HTML override: `anythingllm-hosted/MetaGenerator.js`

Run:

```powershell
docker compose -f anythingllm-hosted/docker-compose.yml up -d
```

Stop:

```powershell
docker compose -f anythingllm-hosted/docker-compose.yml down
```

Allow LAN access from an elevated PowerShell window:

```powershell
powershell -ExecutionPolicy Bypass -File .\anythingllm-hosted\allow-port-54390.ps1
```

Reassert NordVPN local LAN access at user logon without admin rights:

```powershell
powershell -ExecutionPolicy Bypass -File .\anythingllm-hosted\Register-NordVpnLocalLanAccessTask.ps1
```

Notes:

- The compose file mounts a patched `MetaGenerator.js` into the stock image so the generated root HTML uses a mobile-safe viewport and dynamic viewport height handling.
- Plain `http://10.0.0.153:54390` is still not a secure context, so mobile-only features such as microphone capture or PWA install can still require HTTPS or the official Android app.
- `Ensure-NordVpnLocalLanAccess.ps1` drives NordVPN's own Settings UI and keeps `Stay invisible on LAN` off plus `Allow remote access` on, which is required when NordVPN would otherwise abort inbound LAN traffic.
