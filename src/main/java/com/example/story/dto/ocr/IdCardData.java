package com.example.story.dto.ocr;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class IdCardData {
    @JsonProperty("id_number")
    private FieldData idNumber;

    private FieldData name;
    private FieldData dob;
    private FieldData gender;
    private FieldData nationality;

    @JsonProperty("place_of_origin")
    private FieldData placeOfOrigin;

    @JsonProperty("place_of_residence")
    private FieldData placeOfResidence;

    @JsonProperty("date_of_expiry")
    private FieldData dateOfExpiry;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldData {
        private String text;
        private Double confidence;
        private List<Double> bbox;
    }
}
