package com.fitnessapp.backend.user.entity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_profile")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "userId")
public class UserProfile {

  @Id
  @Column(name = "user_id", columnDefinition = "uuid")
  private UUID userId;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @MapsId
  @JoinColumn(name = "user_id")
  private User user;

  @Column(name = "height_cm")
  private Integer heightCm;

  @Column(name = "weight_kg", precision = 6, scale = 2)
  private BigDecimal weightKg;

  @Column(name = "bmi", precision = 5, scale = 2)
  private BigDecimal bmi;

  @Column(name = "body_fat_percentage", precision = 5, scale = 2)
  private BigDecimal bodyFatPercentage;

  @Column(name = "basal_metabolic_rate")
  private Integer basalMetabolicRate;

  @Enumerated(EnumType.STRING)
  @Column(name = "fitness_goal", length = 32)
  private FitnessGoal fitnessGoal;

  @Enumerated(EnumType.STRING)
  @Column(name = "dietary_preference", length = 32)
  private DietaryPreference dietaryPreference;

  @Enumerated(EnumType.STRING)
  @Column(name = "health_mode", length = 20)
  @Builder.Default
  private HealthMode healthMode = HealthMode.PREVENTION;

  @Column(name = "daily_calorie_target")
  private Integer dailyCalorieTarget;

  @Column(name = "daily_protein_target")
  private Integer dailyProteinTarget;

  @Column(name = "daily_carbs_target")
  private Integer dailyCarbsTarget;

  @Column(name = "daily_fat_target")
  private Integer dailyFatTarget;

  @Column(name = "avatar_url", length = 500)
  private String avatarUrl;

  @Column(name = "avatar_file_key", length = 500)
  private String avatarFileKey;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @PrePersist
  void onCreate() {
    OffsetDateTime now = OffsetDateTime.now();
    createdAt = Optional.ofNullable(createdAt).orElse(now);
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = OffsetDateTime.now();
  }

  public void apply(UserProfile source) {
    this.heightCm = source.getHeightCm();
    this.weightKg = source.getWeightKg();
    this.bmi = source.getBmi();
    this.bodyFatPercentage = source.getBodyFatPercentage();
    this.basalMetabolicRate = source.getBasalMetabolicRate();
    this.fitnessGoal = source.getFitnessGoal();
    this.dietaryPreference = source.getDietaryPreference();
    this.healthMode = source.getHealthMode();
    this.dailyCalorieTarget = source.getDailyCalorieTarget();
    this.dailyProteinTarget = source.getDailyProteinTarget();
    this.dailyCarbsTarget = source.getDailyCarbsTarget();
    this.dailyFatTarget = source.getDailyFatTarget();
    this.avatarUrl = source.getAvatarUrl();
    this.avatarFileKey = source.getAvatarFileKey();
  }
}
