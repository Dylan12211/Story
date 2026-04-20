package com.example.keycloak.provider;

import org.keycloak.component.ComponentModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.storage.UserStorageProvider;
import org.keycloak.storage.UserStorageProviderFactory;

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
}
