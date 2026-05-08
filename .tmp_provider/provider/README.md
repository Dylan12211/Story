# Remote User Storage Provider

A Keycloak User Storage Provider that fetches users from a remote REST API.

## Build

```bash
mvn clean package
```

JAR file will be in `target/` folder. Copy to Keycloak `providers/` folder:

```bash
cp target/provider-1.0-SNAPSHOT.jar providers/
docker restart keycloak
```

## Configuration

1. Login to Keycloak Admin Console: http://localhost:8090/admin
2. Go to **Realm Settings** → **User Federation**
3. Click **Add provider** → Select **remote-user-provider**

### Settings

| Option | Description | Default |
|--------|-------------|---------|
| **API URL** | Base URL of the remote user API | `http://localhost:8080/api/users` |
| **Cache Policy** | Caching strategy | `DEFAULT` |

### Cache Policy Options

- **DEFAULT**: Cache user data for 60 seconds
- **NO_CACHE**: Always fetch fresh data from API
- **MAX_LIFESPAN**: Cache with maximum lifespan (future implementation)

## API Contract

Your remote API should implement:

```
GET {API_URL}/{username}
```

Response (200 OK):
```json
{
  "id": "user123",
  "username": "demo",
  "email": "demo@example.com",
  "firstName": "Demo",
  "lastName": "User",
  "enabled": true
}
```

404 Not Found if user doesn't exist.
