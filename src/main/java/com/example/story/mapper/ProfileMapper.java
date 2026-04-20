package com.example.story.mapper;

import java.util.ArrayList;
import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.story.dto.request.RegistrationRequest;
import com.example.story.dto.response.ProfileResponse;
import com.example.story.entity.Profile;

@Mapper(componentModel = "spring")
public interface ProfileMapper {

    Profile toProfile(RegistrationRequest request);

    @Mapping(target = "roles", expression = "java(mapRoles(profile))")
    @Mapping(target = "username", source = "user.username")
    @Mapping(target = "email", source = "user.email")
    ProfileResponse toProfileResponse(Profile profile);

    default List<String> mapRoles(Profile profile) {
        if (profile.getUser() == null || profile.getUser().getRoles() == null) {
            return List.of();
        }
        return new ArrayList<>(profile.getUser().getRoles());
    }
}
