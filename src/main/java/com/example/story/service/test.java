package com.example.story.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import com.example.story.dto.identity.UserInfo;
import com.example.story.dto.identity.UserRole;

public class test {

    public static List<UserInfo> generateUserInfo(int count) {
        List<UserInfo> list = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            UserInfo u = new UserInfo();
            u.setUserId("U" + i);
            u.setUsername("user" + i);
            u.setEmail("user" + i + "@example.com");
            u.setFirstName("First" + i);
            u.setLastName("Last" + i);
            u.setStatus(i % 2 == 0 ? "Active" : "Inactive");
            list.add(u);
        }
        return list;
    }

    public static List<UserRole> generateUserRole(int count) {
        String[] roles = {"Admin", "User", "Manager"};
        List<UserRole> list = new ArrayList<>();
        Random random = new Random();
        for (int i = 1; i <= count; i++) {
            UserRole r = new UserRole();
            r.setUserId("U" + i);
            r.setUsername("user" + i);
            r.setRoles(roles[random.nextInt(roles.length)]);
            list.add(r);
        }
        return list;
    }
}
