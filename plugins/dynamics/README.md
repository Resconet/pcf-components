# Dynamics Plugin

This is a plugin for tasks related to dynamics.

## proxy

Dynamics proxy executor to allow proxying dynamics apps to localhost for easy debugging.

To use, configure the executor in `app`'s `project.json` as follows:

```typescript
"proxy": {
  "executor": "dynamics:proxy",
  "options": {
    "webResourcePath": "resco_MobileCRM/WebClient",
    "proxyPort": 3333,
    "port": 4200
  }
}
```

Then, to run:

`nx proxy app`

To use the plugin, configure the browser to proxy requests to **127.0.0.1:3333**.

**You will also need to import** the following proxy certification authority file and set the browser or system to trust it:

[plugins/dynamics/src/executors/proxy/ca/certs/ca.pem](./src/executors/proxy/ca/certs/ca.pem)
