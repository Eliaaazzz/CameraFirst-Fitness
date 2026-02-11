package com.fitnessapp.backend.user.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fitnessapp.backend.goals.repository.UserGoalRepository;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.recipe.repository.UserSavedRecipeRepository;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService.deleteUser")
class UserServiceDeleteUserTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private UserProfileRepository userProfileRepository;

  @Mock
  private MealLogRepository mealLogRepository;

  @Mock
  private UserSavedRecipeRepository userSavedRecipeRepository;

  @Mock
  private UserGoalRepository userGoalRepository;

  private UserService userService;

  private UUID userId;
  private User user;

  @BeforeEach
  void setUp() {
    userService = new UserService(
        userRepository,
        userProfileRepository,
        mealLogRepository,
        userSavedRecipeRepository,
        userGoalRepository
    );
    userId = UUID.randomUUID();
    user = User.builder()
        .id(userId)
        .email("test@example.com")
        .level("beginner")
        .timeBucket(0)
        .currentStreak(1)
        .build();
  }

  @Test
  void deletesRelatedDataThenUserInOrder() {
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));

    userService.deleteUser(userId);

    InOrder ordered = inOrder(
        userSavedRecipeRepository,
        mealLogRepository,
        userGoalRepository,
        userProfileRepository,
        userRepository
    );
    ordered.verify(userSavedRecipeRepository).deleteByUser_Id(userId);
    ordered.verify(mealLogRepository).deleteByUserId(userId);
    ordered.verify(userGoalRepository).deleteAllByUserId(userId);
    ordered.verify(userProfileRepository).deleteById(userId);
    ordered.verify(userRepository).delete(user);
  }

  @Test
  void throwsWhenUserDoesNotExist() {
    when(userRepository.findById(userId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.deleteUser(userId))
        .isInstanceOf(EntityNotFoundException.class)
        .hasMessageContaining("User not found")
        .hasMessageContaining(userId.toString());

    verify(userRepository, never()).delete(user);
    verifyNoInteractions(userSavedRecipeRepository, mealLogRepository, userGoalRepository, userProfileRepository);
  }

  @Test
  void propagatesExceptionWhenSavedRecipeDeletionFails() {
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    doThrow(new RuntimeException("saved recipe delete failed"))
        .when(userSavedRecipeRepository).deleteByUser_Id(userId);

    assertThatThrownBy(() -> userService.deleteUser(userId))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("saved recipe delete failed");

    verify(mealLogRepository, never()).deleteByUserId(userId);
    verify(userGoalRepository, never()).deleteAllByUserId(userId);
    verify(userProfileRepository, never()).deleteById(userId);
    verify(userRepository, never()).delete(user);
  }

  @Test
  void propagatesExceptionWhenProfileDeletionFails() {
    when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    doThrow(new RuntimeException("profile delete failed"))
        .when(userProfileRepository).deleteById(userId);

    assertThatThrownBy(() -> userService.deleteUser(userId))
        .isInstanceOf(RuntimeException.class)
        .hasMessageContaining("profile delete failed");

    verify(userSavedRecipeRepository).deleteByUser_Id(userId);
    verify(mealLogRepository).deleteByUserId(userId);
    verify(userGoalRepository).deleteAllByUserId(userId);
    verify(userRepository, never()).delete(user);
  }
}
