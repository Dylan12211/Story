package com.example.story.configuration;

import java.util.*;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

public class CustomAuthoritiesConverter implements Converter<Jwt, Collection<GrantedAuthority>> {
    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Set<GrantedAuthority> authorities = new HashSet<>();

        // 1. Lấy Realm Roles
        Object realmAccessObj = jwt.getClaim("realm_access");
        if (realmAccessObj instanceof Map<?, ?> realmAccess) {
            Object rolesObj = realmAccess.get("roles");
            if (rolesObj instanceof List<?> roles) {
                roles.forEach(role -> authorities.add(
                        new SimpleGrantedAuthority("ROLE_" + role.toString().toUpperCase())));
            }
        }

        // 2. Lấy Client Roles (story-app)
        Object resourceAccessObj = jwt.getClaim("resource_access");
        if (resourceAccessObj instanceof Map<?, ?> resourceAccess) {
            Object clientObj = resourceAccess.get("story-app");
            if (clientObj instanceof Map<?, ?> client) {
                Object rolesObj = client.get("roles");
                if (rolesObj instanceof List<?> roles) {
                    roles.forEach(role -> authorities.add(
                            new SimpleGrantedAuthority("ROLE_" + role.toString().toUpperCase())));
                }
            }
        }

        // Log để debug (Xóa khi lên production)
        System.out.println("Final Authorities: " + authorities);
        return new ArrayList<>(authorities);
    }
}
