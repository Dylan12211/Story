package com.example.story;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

import com.example.story.client.OcrClient;
import com.example.story.repository.IdentityClient;

@SpringBootApplication
@EnableFeignClients(clients = {IdentityClient.class, OcrClient.class})
public class StoryApplication {

    public static void main(String[] args) {
        SpringApplication.run(StoryApplication.class, args);
    }
}
