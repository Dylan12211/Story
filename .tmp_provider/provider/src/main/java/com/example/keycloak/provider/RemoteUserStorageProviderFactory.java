package com.example.keycloak.provider;

import org.keycloak.component.ComponentModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;
import org.keycloak.provider.ProviderConfigurationBuilder;
import org.keycloak.storage.UserStorageProvider;
import org.keycloak.storage.UserStorageProviderFactory;

import java.util.List;

public class RemoteUserStorageProviderFactory
        implements UserStorageProviderFactory<RemoteUserStorageProvider> {

    @Override
    public RemoteUserStorageProvider create(KeycloakSession session, ComponentModel model) {
        return new RemoteUserStorageProvider(session, model);
    }

    @Override
    public String getId() {
        return "remote-user-provider";
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        return ProviderConfigurationBuilder.create()
                .property()
                    .name("apiUrl")
                    .type(ProviderConfigProperty.STRING_TYPE)
                    .label("API URL")
                    .helpText("URL of the remote user API")
                    .defaultValue("http://host.docker.internal:8080/api")
                    .add()
                .property()
                    .name("cachePolicy")
                    .type(ProviderConfigProperty.LIST_TYPE)
                    .label("Cache Policy")
                    .helpText("Caching strategy for remote user data")
                    .options("DEFAULT", "NO_CACHE", "MAX_LIFESPAN")
                    .defaultValue("DEFAULT")
                    .add()
                .build();
    }

    @Override
    public void close() {
    }
}
