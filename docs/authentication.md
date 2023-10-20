# Authentication

If you don't wish to have your connector publicly accessible then you must set a service token by specifying the 
`SERVICE_TOKEN_SECRET` environment variable when creating your connector:

* `--env SERVICE_TOKEN_SECRET=SUPER_SECRET_TOKEN_XXX123`

Your Hasura project metadata must then set a matching bearer token:

```yaml
kind: DataConnector
version: v1
definition:
  name: my_connector
  url:
    singleUrl: 'https://connector-9XXX7-hyc5v23h6a-ue.a.run.app'
  headers:
    Authorization:
      value: "Bearer SUPER_SECRET_TOKEN_XXX123"
```

While you can specify the token inline as above, it is recommended to use the Hasura secrets functionality for this
purpose:

```yaml
kind: DataConnector
version: v1
definition:
  name: my_connector
  url:
    singleUrl: 'https://connector-9XXX7-hyc5v23h6a-ue.a.run.app'
  headers:
    Authorization:
      valueFromSecret: BEARER_TOKEN_SECRET
```

NOTE: This secret should contain the `Bearer ` prefix.