#[allow(unused_imports)]
use crate::grades::{GradingScale, GradingScaleMapping, GradingScaleConfig};
use serde::{Deserialize, Serialize};

// Type definitions for component-based scoring
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ComponentScore {
    pub name: String,
    pub score: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ComponentConfig {
    pub name: String,
    pub weight: f64,
}

/// Converts a numeric percentage score to grade points using a grading scale
/// Finds the highest matching mapping threshold and returns corresponding points
/// 
/// # Arguments
/// * `score` - Percentage score (e.g., 85.0 for 85%)
/// * `scale` - The grading scale to use for conversion
///
/// # Returns
/// Grade point value or error if score is below minimum
///
/// # Example
/// ```
/// // 85% → 9 points (10-point scale with 80% threshold = 9)
/// convert_numeric_score(85.0, &scale)?
/// ```
pub fn convert_numeric_score(score: f64, scale: &GradingScale) -> Result<f64, String> {
    if scale.type_ != "numeric" {
        return Err(format!("Scale type must be 'numeric', got '{}'", scale.type_));
    }

    let mappings = &scale.config.mappings;
    if mappings.is_empty() {
        return Err("No mappings defined in grading scale".to_string());
    }

    // Find the highest threshold that the score meets
    let mut matching_mapping: Option<&GradingScaleMapping> = None;

    for mapping in mappings {
        if let Some(min_percent) = mapping.min_percent {
            if score >= min_percent as f64 {
                // Check if this is a better match (higher threshold)
                if let Some(current_best) = matching_mapping {
                    if let Some(current_threshold) = current_best.min_percent {
                        if let Some(this_threshold) = mapping.min_percent {
                            if this_threshold > current_threshold {
                                matching_mapping = Some(mapping);
                            }
                        }
                    }
                } else {
                    matching_mapping = Some(mapping);
                }
            }
        }
    }

    match matching_mapping {
        Some(mapping) => Ok(mapping.point),
        None => Err(format!(
            "Score {} is below minimum threshold for this grading scale",
            score
        )),
    }
}

/// Converts a letter grade to grade points using a grading scale
/// Performs case-insensitive lookup
///
/// # Arguments
/// * `grade` - Letter grade (e.g., "A", "A-", "B+")
/// * `scale` - The grading scale to use for conversion
///
/// # Returns
/// Grade point value or error if grade not found in scale
///
/// # Example
/// ```
/// // "A" → 4.0 (US 4.0 scale)
/// convert_letter_grade("A", &scale)?
/// ```
pub fn convert_letter_grade(grade: &str, scale: &GradingScale) -> Result<f64, String> {
    if scale.type_ != "letter" {
        return Err(format!("Scale type must be 'letter', got '{}'", scale.type_));
    }

    let grade_upper = grade.to_uppercase();

    for mapping in &scale.config.mappings {
        if let Some(ref letter) = mapping.letter {
            if letter.to_uppercase() == grade_upper {
                return Ok(mapping.point);
            }
        }
    }

    Err(format!(
        "Grade '{}' not found in grading scale mappings",
        grade
    ))
}

/// Reverse lookup: finds the letter grade for a given point value
/// Used for displaying grades in UI
///
/// # Arguments
/// * `point` - Grade point value (e.g., 4.0)
/// * `scale` - The grading scale to use
///
/// # Returns
/// Letter grade or None if no exact match found
pub fn get_letter_for_points(point: f64, scale: &GradingScale) -> Option<String> {
    for mapping in &scale.config.mappings {
        if (mapping.point - point).abs() < 0.001 {
            return mapping.letter.clone();
        }
    }
    None
}

/// Calculates weighted average of component scores
/// Validates that total weight is approximately 1.0
///
/// # Arguments
/// * `components` - Array of component scores (e.g., exam=85, lab=90)
/// * `config` - Array of component configurations with weights
///
/// # Returns
/// Weighted average score or error if validation fails
///
/// # Example
/// ```
/// // Components: exam=85 (0.7), lab=90 (0.3) → 86.5
/// calculate_weighted_score(&components, &config)?
/// ```
pub fn calculate_weighted_score(
    components: &[ComponentScore],
    config: &[ComponentConfig],
) -> Result<f64, String> {
    // Build a map of component name -> weight for quick lookup
    let mut weight_map: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    let mut total_weight = 0.0;

    for component_cfg in config {
        weight_map.insert(component_cfg.name.clone(), component_cfg.weight);
        total_weight += component_cfg.weight;
    }

    // Validate total weight is approximately 1.0 (allow 1% tolerance)
    if (total_weight - 1.0).abs() > 0.01 {
        return Err(format!(
            "Component weights must sum to 1.0, got {}",
            total_weight
        ));
    }

    // Calculate weighted sum
    let mut weighted_sum = 0.0;
    let mut found_count = 0;

    for component in components {
        if let Some(&weight) = weight_map.get(&component.name) {
            weighted_sum += component.score as f64 * weight;
            found_count += 1;
        }
    }

    // Check that we found all required components
    if found_count < config.len() {
        return Err(format!(
            "Missing {} component(s). Expected {} components, found {}",
            config.len() - found_count,
            config.len(),
            found_count
        ));
    }

    Ok(weighted_sum)
}

/// Converts a course score to grade points
/// Supports two modes: direct (manual override) or component-based calculation
/// Priority: manual_override > component calculation
///
/// # Arguments
/// * `manual_override` - Direct grade point entry (takes priority)
/// * `components` - Component scores if using component mode
/// * `config` - Component configurations for weighting
/// * `scale` - Grading scale for conversion
///
/// # Returns
/// Final grade point or error
pub fn convert_course_score(
    manual_override: Option<f64>,
    components: Option<&[ComponentScore]>,
    config: Option<&[ComponentConfig]>,
    scale: &GradingScale,
) -> Result<f64, String> {
    // Priority 1: Manual override (already in grade points)
    if let Some(grade_point) = manual_override {
        if grade_point < 0.0 || grade_point > scale.config.max_point {
            return Err(format!(
                "Grade point {} exceeds scale max of {}",
                grade_point, scale.config.max_point
            ));
        }
        return Ok(grade_point);
    }

    // Priority 2: Component-based calculation
    if let (Some(comps), Some(cfg)) = (components, config) {
        // Calculate weighted score from components
        let weighted_score = calculate_weighted_score(comps, cfg)?;

        // Convert weighted score to grade point based on scale type
        match scale.type_.as_str() {
            "numeric" => convert_numeric_score(weighted_score, scale),
            "letter" => {
                // For letter scales, treat weighted_score as a percentage
                // This is a simplification - actual implementation may vary
                convert_numeric_score(weighted_score, scale)
            }
            _ => Err(format!("Unsupported scale type: {}", scale.type_)),
        }
    } else {
        Err("Either manual_override or both components and config must be provided".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_numeric_scale() -> GradingScale {
        GradingScale {
            id: 1,
            name: "Test 10-point".to_string(),
            type_: "numeric".to_string(),
            config: GradingScaleConfig {
                max_point: 10.0,
                mappings: vec![
                    GradingScaleMapping {
                        min_percent: Some(90),
                        letter: None,
                        point: 10.0,
                    },
                    GradingScaleMapping {
                        min_percent: Some(80),
                        letter: None,
                        point: 9.0,
                    },
                    GradingScaleMapping {
                        min_percent: Some(70),
                        letter: None,
                        point: 8.0,
                    },
                    GradingScaleMapping {
                        min_percent: Some(60),
                        letter: None,
                        point: 7.0,
                    },
                    GradingScaleMapping {
                        min_percent: Some(50),
                        letter: None,
                        point: 6.0,
                    },
                ],
            },
            is_default: true,
        }
    }

    fn create_test_letter_scale() -> GradingScale {
        GradingScale {
            id: 2,
            name: "Test 4.0".to_string(),
            type_: "letter".to_string(),
            config: GradingScaleConfig {
                max_point: 4.0,
                mappings: vec![
                    GradingScaleMapping {
                        min_percent: None,
                        letter: Some("A".to_string()),
                        point: 4.0,
                    },
                    GradingScaleMapping {
                        min_percent: None,
                        letter: Some("A-".to_string()),
                        point: 3.7,
                    },
                    GradingScaleMapping {
                        min_percent: None,
                        letter: Some("B+".to_string()),
                        point: 3.3,
                    },
                    GradingScaleMapping {
                        min_percent: None,
                        letter: Some("B".to_string()),
                        point: 3.0,
                    },
                ],
            },
            is_default: false,
        }
    }

    #[test]
    fn test_numeric_conversion_90_percent() {
        let scale = create_test_numeric_scale();
        let result = convert_numeric_score(90.0, &scale);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 10.0);
    }

    #[test]
    fn test_numeric_conversion_85_percent() {
        let scale = create_test_numeric_scale();
        let result = convert_numeric_score(85.0, &scale);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 9.0);
    }

    #[test]
    fn test_numeric_conversion_below_minimum() {
        let scale = create_test_numeric_scale();
        let result = convert_numeric_score(40.0, &scale);
        assert!(result.is_err());
    }

    #[test]
    fn test_letter_grade_conversion_a() {
        let scale = create_test_letter_scale();
        let result = convert_letter_grade("A", &scale);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 4.0);
    }

    #[test]
    fn test_letter_grade_conversion_case_insensitive() {
        let scale = create_test_letter_scale();
        let result = convert_letter_grade("a-", &scale);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 3.7);
    }

    #[test]
    fn test_letter_grade_not_found() {
        let scale = create_test_letter_scale();
        let result = convert_letter_grade("F", &scale);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_letter_for_points() {
        let scale = create_test_letter_scale();
        let result = get_letter_for_points(4.0_f64, &scale);
        assert!(result.is_some());
        assert_eq!(result.unwrap(), "A");
    }

    #[test]
    fn test_weighted_score_basic() {
        let components = vec![
            ComponentScore {
                name: "exam".to_string(),
                score: 85,
            },
            ComponentScore {
                name: "lab".to_string(),
                score: 90,
            },
        ];

        let config = vec![
            ComponentConfig {
                name: "exam".to_string(),
                weight: 0.7,
            },
            ComponentConfig {
                name: "lab".to_string(),
                weight: 0.3,
            },
        ];

        let result = calculate_weighted_score(&components, &config);
        assert!(result.is_ok());
        let weighted = result.unwrap();
        assert!((weighted - 86.5).abs() < 0.01);
    }

    #[test]
    fn test_weighted_score_invalid_weight() {
        let components = vec![ComponentScore {
            name: "exam".to_string(),
            score: 85,
        }];

        let config = vec![ComponentConfig {
            name: "exam".to_string(),
            weight: 0.5, // Only 0.5, not 1.0
        }];

        let result = calculate_weighted_score(&components, &config);
        assert!(result.is_err());
    }

    #[test]
    fn test_convert_course_score_manual_override() {
        let scale = create_test_numeric_scale();
        let result = convert_course_score(Some(8.5), None, None, &scale);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 8.5);
    }

    #[test]
    fn test_convert_course_score_components() {
        let scale = create_test_numeric_scale();
        let components = vec![
            ComponentScore {
                name: "exam".to_string(),
                score: 85,
            },
            ComponentScore {
                name: "lab".to_string(),
                score: 90,
            },
        ];

        let config = vec![
            ComponentConfig {
                name: "exam".to_string(),
                weight: 0.7,
            },
            ComponentConfig {
                name: "lab".to_string(),
                weight: 0.3,
            },
        ];

        let result = convert_course_score(None, Some(&components), Some(&config), &scale);
        assert!(result.is_ok());
        // 86.5 should map to 9.0 (80% threshold)
        assert_eq!(result.unwrap(), 9.0);
    }
}
