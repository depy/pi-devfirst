# explorer — pi extension

Read-only browser view of devfirst projects, phase documents, history versions,
and tickets. Reads `~/.projects` and `~/.tickets`. Writes nothing and starts no
agent turn.

## Load and start

```bash
pi -e /home/matjaz/dev/pi-devfirst
```

Then in pi:

| Command | Effect |
|---|---|
| `/explorer start [host]` | Start. Default host `0.0.0.0` (all interfaces) |
| `/explorer open [host]` | Start if stopped, then show the URL |
| `/explorer stop` | Stop and free the port |
| `/explorer status` | Show running state, URL, and port |

Default port is `7391`, with the next free port on a conflict.

## URLs

```
/                              projects
/p/<slug>                      project (tickets first, then phases)
/p/<slug>/tickets              tickets for that project
/p/<slug>/phase/<name>         phase document
/p/<slug>/phase/<name>/v/<stamp>   history version
/p/<slug>/ticket/<file>        ticket
```

## Notes

- Live reload uses `fs.watch` plus SSE. A manual reload link is always present.
- Binding `0.0.0.0` exposes the view on the network with no authentication.
  Use `/explorer start 127.0.0.1` to keep it local.
