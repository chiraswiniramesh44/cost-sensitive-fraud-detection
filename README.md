# cost-sensitive-fraud-detection
Cost-Sensitive Fraud Detection with Operator Feedback Loop

## Shared PostgreSQL database

The API connects to a managed PostgreSQL database so all developers and deployments can use the same database. Neon is a recommended managed PostgreSQL provider; create a project and database there, then copy its connection details.

1. If `.env` does not already exist, copy `.env.example` to `.env`. Otherwise, update the existing `.env` without replacing unrelated local settings.
2. Set `DATABASE_URL` in `.env` to the provider's connection URL. Use the SQLAlchemy/psycopg format:
   `postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require`
   URL-encode any reserved characters in the username or password. Keep `.env` private and do not commit it.
3. Set `JWT_SECRET_KEY` to a long, random secret.
4. Run the migrations once against the shared database from the repository root:
   `alembic upgrade head`
5. Start the API with `docker compose up --build`.

The Compose setup does not start a local PostgreSQL container. Use the same `DATABASE_URL` for the API and migrations, and share it with teammates through a secrets manager rather than source control. Restrict the hosted database's network access to trusted deployment/developer IPs where the provider supports it.

Changing the connection URL does not copy data from the old local database. Export and import any local data you need to keep before switching; applying migrations creates or updates the schema but does not transfer application data.
