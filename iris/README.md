# IRIS Backend Skeleton

This directory contains ObjectScript source files for the NYeC SMS Outreach Manager.

## Compile Order

1. `HSFRAMEWORK.*`
2. `HSAUDIT.*`
3. `HSREGISTRY.MEF.*`
4. `HSOUTREACH.Admin.*`
5. `HSOUTREACH.SMS.*`
6. `HSOUTREACH.Campaign.*`
7. `HSOUTREACH.Billing.*`
8. `HSOUTREACH.Service.*`
9. `HSOUTREACH.API.REST`
10. `HSOUTREACH.Setup.SeedData`

## Namespaces

For first build simplicity, classes can be compiled into one development namespace. For production, split data ownership into:

- `HSREGISTRY` for MEF data
- `HSOUTREACH` for campaigns/SMS/billing
- `HSAUDIT` for audit

## REST Web Application

Create a CSP web application pointing to `HSOUTREACH.API.REST`, for example:

```text
/api/nyec
```

with dispatch class:

```text
HSOUTREACH.API.REST
```
