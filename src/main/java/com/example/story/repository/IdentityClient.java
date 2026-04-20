package com.example.story.repository;

import java.util.List;
import java.util.Map;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.story.dto.identity.TokenExchangeParam;
import com.example.story.dto.identity.TokenExchangeResponse;
import com.example.story.dto.identity.UserCreationParam;

import feign.QueryMap;

@FeignClient(name = "identity-client", url = "${idp.url}")
public interface IdentityClient {
    @PostMapping(
            value = "/realms/story-app/protocol/openid-connect/token",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    TokenExchangeResponse exchangeToken(@QueryMap TokenExchangeParam exchangeParam);

    @PostMapping(value = "/admin/realms/story-app/users", consumes = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<?> createUser(
            @RequestHeader("authorization") String token, @RequestBody UserCreationParam userCreationParam);

    @PostMapping(
            value = "/admin/realms/{realm}/users/{uuid}/role-mappings/realm",
            consumes = MediaType.APPLICATION_JSON_VALUE)
    void assignRole(
            @RequestHeader("Authorization") String token,
            @PathVariable("realm") String realm,
            @PathVariable("uuid") String uuid,
            @RequestBody List<Map<String, Object>> roles);

    @GetMapping(value = "/admin/realms/{realm}/users/{uuid}/role-mappings/realm")
    List<Map<String, Object>> getUserRoles(
            @RequestHeader("Authorization") String token,
            @PathVariable("realm") String realm,
            @PathVariable("uuid") String uuid);
}
