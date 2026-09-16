// The same sample document in every supported format.

import type { DataFormat } from './formats';

export const SAMPLES: Record<DataFormat, string> = {
  json: `{
  "title": "Service config",
  "version": 3,
  "debug": false,
  "owner": {
    "name": "Ada Lovelace",
    "email": "ada@example.com"
  },
  "database": {
    "host": "db.internal",
    "ports": [5432, 5433],
    "pool": { "min": 2, "max": 10, "timeout": 2.5 }
  },
  "servers": [
    { "name": "alpha", "ip": "10.0.0.1", "roles": ["web", "api"] },
    { "name": "beta", "ip": "10.0.0.2", "roles": ["worker"] }
  ]
}
`,
  yaml: `title: Service config
version: 3
debug: false
owner:
  name: Ada Lovelace
  email: ada@example.com
database:
  host: db.internal
  ports:
    - 5432
    - 5433
  pool:
    min: 2
    max: 10
    timeout: 2.5
servers:
  - name: alpha
    ip: 10.0.0.1
    roles: [web, api]
  - name: beta
    ip: 10.0.0.2
    roles: [worker]
`,
  toml: `title = "Service config"
version = 3
debug = false

[owner]
name = "Ada Lovelace"
email = "ada@example.com"

[database]
host = "db.internal"
ports = [ 5432, 5433 ]

[database.pool]
min = 2
max = 10
timeout = 2.5

[[servers]]
name = "alpha"
ip = "10.0.0.1"
roles = [ "web", "api" ]

[[servers]]
name = "beta"
ip = "10.0.0.2"
roles = [ "worker" ]
`,
};
