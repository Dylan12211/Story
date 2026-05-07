package com.example.story.configuration;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private final String[] PUBLIC_ENDPOINTS = {
        "/register", "/api/users/**", "/api/auth/validate", "/api/login", "/api/forgot-password"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth.requestMatchers(HttpMethod.POST, "/register")
                .permitAll()
                .requestMatchers("/api/users/**")
                .permitAll()
                .requestMatchers("/api/auth/validate")
                .permitAll()
                .requestMatchers("/api/login")
                .permitAll()
                .requestMatchers("/api/auth/google/**")
                .permitAll()
                .requestMatchers("/api/auth/id-card-login")
                .permitAll()
                .requestMatchers("/api/auth/cccd/login")
                .permitAll()
                .requestMatchers(HttpMethod.POST, "/api/forgot-password")
                .permitAll()
                .requestMatchers("/api/admin/**")
                .hasRole("ADMIN")
                .requestMatchers("/api/user/**")
                .hasRole("USER")
                .requestMatchers("/api/reports/user/**")
                .hasRole("ADMIN")
                .requestMatchers("/camunda/**")
                .permitAll()
                //                              .requestMatchers("/api/reports/test").permitAll()
                .requestMatchers("/ws/**")
                .permitAll()
                .anyRequest()
                .authenticated());
        http.oauth2ResourceServer(oauth2 -> oauth2.jwt(
                        jwtConfigurer -> jwtConfigurer.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                .authenticationEntryPoint(new JwtAuthenticationEntryPoint()));
        http.csrf(AbstractHttpConfigurer::disable);

        return http.build();
    }

    @Bean
    public SecurityFilterChain publicEndpointSecurityFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher(request -> isPublicEndpoint(request))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .csrf(AbstractHttpConfigurer::disable);

        return http.build();
    }

    private boolean isPublicEndpoint(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        return path.equals("/register") && "POST".equals(method)
                || path.startsWith("/api/users/")
                || path.equals("/api/auth/validate")
                || path.equals("/api/login")
                || path.startsWith("/api/auth/google/")
                || path.equals("/api/auth/id-card-login")
                || path.equals("/api/auth/cccd/login")
                || path.equals("/api/forgot-password") && "POST".equals(method)
                || path.startsWith("/camunda/")
                || path.startsWith("/ws/");
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {

        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(new CustomAuthoritiesConverter());
        return jwtAuthenticationConverter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
