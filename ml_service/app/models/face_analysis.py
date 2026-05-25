import cv2
import mediapipe as mp
import numpy as np
import logging
from typing import Dict, List, Tuple, Any, Optional

logger = logging.getLogger(__name__)

class FaceAnalyzer:
    def __init__(self):
        # Use higher confidence thresholds and enable 3D landmarks
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,  # Enable 3D landmarks
            min_detection_confidence=0.6,
            min_tracking_confidence=0.6
        )
        
        # Define landmark indices for different facial features
        # Using more comprehensive landmark sets
        self.LEFT_EYE = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
        self.RIGHT_EYE = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382]
        self.MOUTH = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0]
        self.JAWLINE = [162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251, 389]
        
        # Add nose and eyebrows for more comprehensive analysis
        self.NOSE = [1, 2, 3, 4, 5, 6, 168, 195, 197, 6, 197, 195, 5, 4, 45, 220, 115, 45, 4, 3, 2]
        self.LEFT_EYEBROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
        self.RIGHT_EYEBROW = [336, 296, 334, 293, 300, 285, 295, 282, 283, 276]
        
        # Define facial midline landmarks - using more stable points (forehead, between eyes, chin)
        self.MIDLINE_POINTS = [10, 168, 6, 152]
        
        # For neurological indicators from facial analysis
        self.neuro_indicators = {
            "asymmetry_threshold": 0.20,  # Lowered for higher sensitivity
            "eye_movement_threshold": 0.12,
            "mouth_deviation_threshold": 0.15,
            "blink_rate_range": (8, 21)
        }

    def analyze_symmetry(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze facial symmetry using MediaPipe Face Mesh with enhanced metrics."""
        try:
            # Convert BGR to RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            height, width = image.shape[:2]
            
            logger.info(f"Processing image of size {width}x{height}")
            
            # Process the image
            results = self.face_mesh.process(rgb_image)
            
            if not results.multi_face_landmarks:
                logger.warning("No face detected in the image")
                return {
                    "success": False,
                    "error": "No face detected"
                }

            landmarks = results.multi_face_landmarks[0].landmark
            
            # Process landmarks with 3D coordinates
            processed_landmarks = {
                "leftEye": self._process_landmarks_3d(landmarks, self.LEFT_EYE, width, height),
                "rightEye": self._process_landmarks_3d(landmarks, self.RIGHT_EYE, width, height),
                "mouth": self._process_landmarks_3d(landmarks, self.MOUTH, width, height),
                "jawline": self._process_landmarks_3d(landmarks, self.JAWLINE, width, height),
                "nose": self._process_landmarks_3d(landmarks, self.NOSE, width, height),
                "leftEyebrow": self._process_landmarks_3d(landmarks, self.LEFT_EYEBROW, width, height),
                "rightEyebrow": self._process_landmarks_3d(landmarks, self.RIGHT_EYEBROW, width, height)
            }
            
            # Calculate midline of the face
            midline = self._calculate_face_midline(landmarks, self.MIDLINE_POINTS, width, height)
            
            # Calculate rotation angle to align midline vertically
            # Use points 10 (top) and 152 (chin) for a stable tilt assessment
            top_pt = landmarks[10]
            bottom_pt = landmarks[152]
            dy = (bottom_pt.y - top_pt.y) * height
            dx = (bottom_pt.x - top_pt.x) * width
            tilt_angle = np.degrees(np.arctan2(dx, dy))
            
            # Rotation center (point between eyes)
            center_idx = 168
            rotation_center = (
                int(landmarks[center_idx].x * width),
                int(landmarks[center_idx].y * height)
            )
            
            # Normalize landmarks by rotating to horizontal (remove tilt)
            rotated_landmarks = self._rotate_points(processed_landmarks, rotation_center, -tilt_angle)
            
            # Recalculate a vertical midline for the rotated coordinates
            vertical_midline = {
                "top": {"x": rotation_center[0], "y": 0},
                "bottom": {"x": rotation_center[0], "y": height},
                "slope": 0.0,
                "intercept": float(rotation_center[0])
            }
            
            # Calculate symmetry metrics on ROTATED landmarks for vertical accuracy
            eye_symmetry, eye_metrics = self._calculate_enhanced_eye_symmetry(rotated_landmarks, vertical_midline)
            mouth_symmetry, mouth_metrics = self._calculate_enhanced_mouth_symmetry(rotated_landmarks, vertical_midline)
            jaw_symmetry, jaw_metrics = self._calculate_enhanced_jaw_symmetry(rotated_landmarks, vertical_midline)
            eyebrow_symmetry, eyebrow_metrics = self._calculate_eyebrow_symmetry(rotated_landmarks, vertical_midline)
            
            # Calculate overall symmetry score (0-100)
            weights = {
                "eye": 0.35,
                "mouth": 0.30,     # Increased mouth weight
                "jaw": 0.15,
                "eyebrow": 0.20
            }
            
            symmetry_score = (
                eye_symmetry * weights["eye"] + 
                mouth_symmetry * weights["mouth"] + 
                jaw_symmetry * weights["jaw"] + 
                eyebrow_symmetry * weights["eyebrow"]
            ) * 100
            
            # Calculate neurological risk indicators
            neuro_indicators = self._calculate_neurological_indicators(
                eye_metrics, mouth_metrics, jaw_metrics, eyebrow_metrics
            )
            
            # Visualization uses original midline but analyzed scores come from rotated data
            visualization = self._create_visualization(image, processed_landmarks, midline)
            
            return {
                "success": True,
                "symmetry_score": float(symmetry_score),
                "landmarks": processed_landmarks,
                "midline": midline,
                "metrics": {
                    "eye_symmetry": float(eye_symmetry),
                    "mouth_symmetry": float(mouth_symmetry),
                    "jaw_symmetry": float(jaw_symmetry),
                    "eyebrow_symmetry": float(eyebrow_symmetry),
                    "face_tilt": float(tilt_angle),
                    "detailed_metrics": {
                        "eye": eye_metrics,
                        "mouth": mouth_metrics,
                        "jaw": jaw_metrics,
                        "eyebrow": eyebrow_metrics
                    }
                },
                "neurological_indicators": neuro_indicators
            }
            
        except Exception as e:
            logger.error(f"Error in analyze_symmetry: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": f"Analysis failed: {str(e)}"
            }

    def _process_landmarks_3d(self, landmarks, indices, width, height):
        """Convert landmark indices to x,y,z coordinates."""
        return [
            {
                "x": int(landmarks[idx].x * width),
                "y": int(landmarks[idx].y * height),
                "z": landmarks[idx].z
            }
            for idx in indices
        ]

    def _rotate_points(self, landmarks_dict, center, angle_deg):
        """Rotate all landmarks around a center point to normalize tilt."""
        angle_rad = np.radians(angle_deg)
        cos_val = np.cos(angle_rad)
        sin_val = np.sin(angle_rad)
        
        rotated_dict = {}
        for feature, points in landmarks_dict.items():
            rotated_points = []
            for p in points:
                # Relative to center
                x = p["x"] - center[0]
                y = p["y"] - center[1]
                
                # Standard 2D rotation
                nx = x * cos_val - y * sin_val
                ny = x * sin_val + y * cos_val
                
                rotated_points.append({
                    "x": int(nx + center[0]),
                    "y": int(ny + center[1]),
                    "z": p["z"]
                })
            rotated_dict[feature] = rotated_points
        return rotated_dict

    def _calculate_face_midline(self, landmarks, midline_indices, width, height):
        """Calculate the vertical midline of the face."""
        midline_points = [
            (int(landmarks[idx].x * width), int(landmarks[idx].y * height)) 
            for idx in midline_indices
        ]
        
        # Fit a line to midline points
        if len(midline_points) > 1:
            x_coords = np.array([p[0] for p in midline_points])
            y_coords = np.array([p[1] for p in midline_points])
            
            # Use polyfit to get a better vertical line approximation
            coeffs = np.polyfit(y_coords, x_coords, 1)
            slope, intercept = coeffs
            
            # Calculate midline x-coordinate for top and bottom of the face
            y_min = min(y_coords)
            y_max = max(y_coords)
            x_top = int(slope * y_min + intercept)
            x_bottom = int(slope * y_max + intercept)
            
            return {
                "top": {"x": x_top, "y": int(y_min)},
                "bottom": {"x": x_bottom, "y": int(y_max)},
                "slope": float(slope),
                "intercept": float(intercept)
            }
        else:
            # Fallback to center of image
            return {
                "top": {"x": width // 2, "y": 0},
                "bottom": {"x": width // 2, "y": height},
                "slope": 0.0,
                "intercept": width // 2
            }

    def _calculate_enhanced_eye_symmetry(self, landmarks, midline):
        """Calculate comprehensive eye symmetry metrics."""
        left_eye = np.array([(p["x"], p["y"]) for p in landmarks["leftEye"]])
        right_eye = np.array([(p["x"], p["y"]) for p in landmarks["rightEye"]])
        
        # Calculate centroids
        left_centroid = np.mean(left_eye, axis=0)
        right_centroid = np.mean(right_eye, axis=0)
        
        # Calculate eye sizes (area of the convex hull)
        left_size = self._calculate_feature_size(left_eye)
        right_size = self._calculate_feature_size(right_eye)
        
        # Calculate distances from midline
        midline_func = lambda y: midline["slope"] * y + midline["intercept"]
        left_distance = abs(left_centroid[0] - midline_func(left_centroid[1]))
        right_distance = abs(right_centroid[0] - midline_func(right_centroid[1]))
        
        # Calculate vertical alignment
        vertical_alignment = 1 - min(1, abs(left_centroid[1] - right_centroid[1]) / ((left_centroid[1] + right_centroid[1]) / 2) * 5)
        
        # Calculate size symmetry
        size_ratio = min(left_size, right_size) / max(left_size, right_size) if max(left_size, right_size) > 0 else 0
        
        # Calculate distance symmetry
        distance_ratio = min(left_distance, right_distance) / max(left_distance, right_distance) if max(left_distance, right_distance) > 0 else 0
        
        # Combined symmetry score (weighted average)
        eye_symmetry = 0.4 * vertical_alignment + 0.3 * size_ratio + 0.3 * distance_ratio
        
        metrics = {
            "left_eye_position": {"x": float(left_centroid[0]), "y": float(left_centroid[1])},
            "right_eye_position": {"x": float(right_centroid[0]), "y": float(right_centroid[1])},
            "left_eye_size": float(left_size),
            "right_eye_size": float(right_size),
            "distance_from_midline": {
                "left": float(left_distance),
                "right": float(right_distance)
            },
            "vertical_alignment": float(vertical_alignment),
            "size_symmetry": float(size_ratio),
            "distance_symmetry": float(distance_ratio)
        }
        
        return max(0, min(1, eye_symmetry)), metrics

    def _calculate_enhanced_mouth_symmetry(self, landmarks, midline):
        """Calculate comprehensive mouth symmetry metrics."""
        mouth_points = np.array([(p["x"], p["y"]) for p in landmarks["mouth"]])
        centroid = np.mean(mouth_points, axis=0)
        
        # Calculate midline position at mouth height
        midline_x_at_mouth = midline["slope"] * centroid[1] + midline["intercept"]
        
        # Calculate deviation from midline
        deviation = abs(centroid[0] - midline_x_at_mouth)
        normalized_deviation = deviation / (np.max(mouth_points[:, 0]) - np.min(mouth_points[:, 0]))
        
        # Calculate left and right mouth corners
        left_corner_idx = np.argmin(mouth_points[:, 0])
        right_corner_idx = np.argmax(mouth_points[:, 0])
        left_corner = mouth_points[left_corner_idx]
        right_corner = mouth_points[right_corner_idx]
        
        # Calculate vertical alignment of corners
        corner_vertical_diff = abs(left_corner[1] - right_corner[1])
        corner_horizontal_distance = right_corner[0] - left_corner[0]
        corner_alignment = 1 - min(1, corner_vertical_diff / (corner_horizontal_distance / 2))
        
        # Calculate distances from midline to corners
        left_distance = abs(left_corner[0] - midline_x_at_mouth)
        right_distance = abs(right_corner[0] - midline_x_at_mouth)
        
        # Calculate symmetry of distances
        distance_ratio = min(left_distance, right_distance) / max(left_distance, right_distance) if max(left_distance, right_distance) > 0 else 0
        
        # Mouth droop analysis (for neurological indicators like Bell's palsy)
        left_side = mouth_points[mouth_points[:, 0] < centroid[0]]
        right_side = mouth_points[mouth_points[:, 0] > centroid[0]]
        
        if len(left_side) > 0 and len(right_side) > 0:
            left_avg_y = np.mean(left_side[:, 1])
            right_avg_y = np.mean(right_side[:, 1])
            droop_diff = abs(left_avg_y - right_avg_y)
            droop_ratio = droop_diff / max(1, (np.max(mouth_points[:, 1]) - np.min(mouth_points[:, 1])))
        else:
            droop_ratio = 0
        
        # Combined symmetry score (weighted)
        center_weight = 0.4
        corner_weight = 0.4
        droop_weight = 0.2
        
        mouth_symmetry = (
            (1 - normalized_deviation) * center_weight + 
            corner_alignment * corner_weight + 
            (1 - droop_ratio) * droop_weight
        )
        
        metrics = {
            "center": {"x": float(centroid[0]), "y": float(centroid[1])},
            "midline_position": float(midline_x_at_mouth),
            "center_deviation": float(deviation),
            "normalized_deviation": float(normalized_deviation),
            "corner_alignment": float(corner_alignment),
            "corners": {
                "left": {"x": float(left_corner[0]), "y": float(left_corner[1])},
                "right": {"x": float(right_corner[0]), "y": float(right_corner[1])}
            },
            "corner_distances": {
                "left": float(left_distance),
                "right": float(right_distance),
                "ratio": float(distance_ratio)
            },
            "droop_ratio": float(droop_ratio)
        }
        
        return max(0, min(1, mouth_symmetry)), metrics

    def _calculate_enhanced_jaw_symmetry(self, landmarks, midline):
        """Calculate comprehensive jaw symmetry metrics."""
        jaw_points = np.array([(p["x"], p["y"]) for p in landmarks["jawline"]])
        
        # Check if we have enough jaw points for calculation
        if len(jaw_points) < 3:
            # Return default values if not enough points
            return 0, {
                "chin_position": {"x": 0, "y": 0},
                "midline_position": 0,
                "chin_deviation": 0,
                "jaw_angles": {"left": 0, "right": 0, "difference": 0, "symmetry": 0},
                "jaw_lengths": {"left": 0, "right": 0, "ratio": 0}
            }
        
        # Find the chin point (lowest point)
        chin_idx = np.argmax(jaw_points[:, 1])
        chin_point = jaw_points[chin_idx]
        
        # Calculate midline position at chin height
        midline_x_at_chin = midline["slope"] * chin_point[1] + midline["intercept"]
        
        # Calculate chin deviation from midline
        chin_deviation = abs(chin_point[0] - midline_x_at_chin)
        
        # Separate left and right sides of jawline
        # Use the midline function to determine left vs. right
        left_jaw = []
        right_jaw = []
        
        for point in jaw_points:
            midline_x = midline["slope"] * point[1] + midline["intercept"]
            if point[0] < midline_x:
                left_jaw.append(point)
            else:
                right_jaw.append(point)
                
        left_jaw = np.array(left_jaw)
        right_jaw = np.array(right_jaw)
        
        # Calculate jaw angles
        if len(left_jaw) >= 2 and len(right_jaw) >= 2:
            # Get jaw angle points (near the ear and near the chin)
            left_top = left_jaw[np.argmin(left_jaw[:, 1])]
            left_bottom = left_jaw[np.argmax(left_jaw[:, 1])]
            right_top = right_jaw[np.argmin(right_jaw[:, 1])]
            right_bottom = right_jaw[np.argmax(right_jaw[:, 1])]
            
            # Calculate angles
            left_angle = self._calculate_angle(left_top, left_bottom)
            right_angle = self._calculate_angle(right_top, right_bottom)
            
            # Calculate angle difference
            angle_diff = abs(left_angle - right_angle)
            angle_symmetry = 1 - min(1, angle_diff / 45)  # Normalize to [0,1]
        else:
            left_angle = 0
            right_angle = 0
            angle_symmetry = 0
        
        # Calculate jaw length symmetry
        if len(left_jaw) > 0 and len(right_jaw) > 0:
            # Calculate jaw line lengths
            left_length = self._calculate_contour_length(left_jaw)
            right_length = self._calculate_contour_length(right_jaw)
            
            # Calculate length ratio
            length_ratio = min(left_length, right_length) / max(left_length, right_length) if max(left_length, right_length) > 0 else 0
        else:
            left_length = 0
            right_length = 0
            length_ratio = 0
        
        # Combined jaw symmetry score with sanity check to avoid returning 0
        jaw_symmetry = 0.3 * max(0, min(1, 1 - chin_deviation / 50)) + 0.4 * angle_symmetry + 0.3 * length_ratio
        
        # Ensure we're not returning zero when we have valid jaw points
        if jaw_symmetry < 0.05 and len(jaw_points) >= 3:
            jaw_symmetry = 0.05  # Minimum non-zero value
        
        metrics = {
            "chin_position": {"x": float(chin_point[0]), "y": float(chin_point[1])},
            "midline_position": float(midline_x_at_chin),
            "chin_deviation": float(chin_deviation),
            "jaw_angles": {
                "left": float(left_angle),
                "right": float(right_angle),
                "difference": float(abs(left_angle - right_angle)),
                "symmetry": float(angle_symmetry)
            },
            "jaw_lengths": {
                "left": float(left_length),
                "right": float(right_length),
                "ratio": float(length_ratio)
            }
        }
        
        return max(0, min(1, jaw_symmetry)), metrics

    def _calculate_eyebrow_symmetry(self, landmarks, midline):
        """Calculate eyebrow symmetry."""
        left_eyebrow = np.array([(p["x"], p["y"]) for p in landmarks["leftEyebrow"]])
        right_eyebrow = np.array([(p["x"], p["y"]) for p in landmarks["rightEyebrow"]])
        
        # Calculate centroids
        left_centroid = np.mean(left_eyebrow, axis=0) if len(left_eyebrow) > 0 else np.array([0, 0])
        right_centroid = np.mean(right_eyebrow, axis=0) if len(right_eyebrow) > 0 else np.array([0, 0])
        
        # Calculate midline positions
        left_midline_x = midline["slope"] * left_centroid[1] + midline["intercept"]
        right_midline_x = midline["slope"] * right_centroid[1] + midline["intercept"]
        
        # Calculate distances from midline
        left_distance = abs(left_centroid[0] - left_midline_x)
        right_distance = abs(right_centroid[0] - right_midline_x)
        
        # Calculate vertical positions
        vertical_diff = abs(left_centroid[1] - right_centroid[1])
        normalized_vertical_diff = vertical_diff / ((left_centroid[1] + right_centroid[1]) / 2) if (left_centroid[1] + right_centroid[1]) > 0 else 0
        vertical_symmetry = 1 - min(1, normalized_vertical_diff * 5)
        
        # Calculate distance symmetry
        distance_ratio = min(left_distance, right_distance) / max(left_distance, right_distance) if max(left_distance, right_distance) > 0 else 0
        
        # Calculate shapes
        left_height = np.max(left_eyebrow[:, 1]) - np.min(left_eyebrow[:, 1]) if len(left_eyebrow) > 0 else 0
        right_height = np.max(right_eyebrow[:, 1]) - np.min(right_eyebrow[:, 1]) if len(right_eyebrow) > 0 else 0
        
        height_ratio = min(left_height, right_height) / max(left_height, right_height) if max(left_height, right_height) > 0 else 0
        
        # Combined eyebrow symmetry
        eyebrow_symmetry = 0.4 * vertical_symmetry + 0.4 * distance_ratio + 0.2 * height_ratio
        
        metrics = {
            "positions": {
                "left": {"x": float(left_centroid[0]), "y": float(left_centroid[1])},
                "right": {"x": float(right_centroid[0]), "y": float(right_centroid[1])}
            },
            "distance_from_midline": {
                "left": float(left_distance),
                "right": float(right_distance),
                "ratio": float(distance_ratio)
            },
            "vertical_alignment": {
                "difference": float(vertical_diff),
                "symmetry": float(vertical_symmetry)
            },
            "heights": {
                "left": float(left_height),
                "right": float(right_height),
                "ratio": float(height_ratio)
            }
        }
        
        return max(0, min(1, eyebrow_symmetry)), metrics

    def _calculate_feature_size(self, points):
        """Calculate size of a facial feature by its area."""
        if len(points) < 3:
            return 0
        try:
            # Use convex hull to calculate area
            hull = cv2.convexHull(points.astype(np.float32))
            return cv2.contourArea(hull)
        except:
            return 0

    def _calculate_angle(self, p1, p2):
        """Calculate angle between two points (in degrees)."""
        dy = p2[1] - p1[1]
        dx = p2[0] - p1[0]
        return abs(np.degrees(np.arctan2(dy, dx)))

    def _calculate_contour_length(self, points):
        """Calculate length of a contour."""
        if len(points) < 2:
            return 0
        
        length = 0
        for i in range(len(points) - 1):
            length += np.linalg.norm(points[i+1] - points[i])
        return length

    def _calculate_face_tilt(self, landmarks):
        """Calculate face tilt angle based on eye positions."""
        left_eye = np.mean([(p["x"], p["y"]) for p in landmarks["leftEye"]], axis=0)
        right_eye = np.mean([(p["x"], p["y"]) for p in landmarks["rightEye"]], axis=0)
        
        dx = right_eye[0] - left_eye[0]
        dy = right_eye[1] - left_eye[1]
        
        # Calculate angle in degrees
        angle = np.degrees(np.arctan2(dy, dx))
        return angle

    def _calculate_neurological_indicators(self, eye_metrics, mouth_metrics, jaw_metrics, eyebrow_metrics):
        """Calculate potential neurological indicators based on facial asymmetry."""
        indicators = {}
        
        # Bell's palsy indicator (facial nerve paralysis)
        droop_ratio = mouth_metrics["droop_ratio"]
        eye_size_ratio = min(eye_metrics["left_eye_size"], eye_metrics["right_eye_size"]) / max(eye_metrics["left_eye_size"], eye_metrics["right_eye_size"]) if max(eye_metrics["left_eye_size"], eye_metrics["right_eye_size"]) > 0 else 1
        eyebrow_symmetry = eyebrow_metrics["vertical_alignment"]["symmetry"]
        corner_symmetry = mouth_metrics["corner_alignment"]
        
        # Weighted combination for Bell's palsy (droop and closure are key)
        # Increased sensitivity to droop and corner misalignment
        bells_palsy_score = (
            (droop_ratio * 0.45) + 
            ((1 - eye_size_ratio) * 0.25) + 
            ((1 - corner_symmetry) * 0.20) +
            ((1 - eyebrow_symmetry) * 0.10)
        )
        
        bells_palsy_risk = "low"
        if bells_palsy_score > 0.35: # Lowered thresholds
            bells_palsy_risk = "high"
        elif bells_palsy_score > 0.18:
            bells_palsy_risk = "moderate"
            
        indicators["bells_palsy"] = {
            "score": float(bells_palsy_score * 100),
            "risk": bells_palsy_risk
        }
        
        # Stroke indicator (one-sided facial weakness, often spares upper face/eyebrow)
        mouth_deviation = mouth_metrics["normalized_deviation"]
        
        stroke_score = (mouth_deviation * 0.5) + ((1 - eye_size_ratio) * 0.3) + ((1 - corner_symmetry) * 0.2)
        stroke_risk = "low"
        
        if stroke_score > 0.35:
            stroke_risk = "high"
        elif stroke_score > 0.18:
            stroke_risk = "moderate"
            
        indicators["stroke"] = {
            "score": float(stroke_score * 100),
            "risk": stroke_risk
        }
        
        # Parkinson's indicator (reduced facial expressiveness, symmetry usually less affected)
        mouth_symmetry = 1 - mouth_metrics["normalized_deviation"]
        eye_movement = eye_metrics["vertical_alignment"]
        eyebrow_height_ratio = eyebrow_metrics["heights"]["ratio"]
        
        # In Parkinson's, hypomimia (facial masking) is common
        parkinsons_score = (
            (0.4 * (1 - mouth_symmetry)) +  # Reduced mouth movement
            (0.3 * (1 - eye_movement)) +     # Reduced eye expressiveness
            (0.3 * (1 - eyebrow_height_ratio))  # Reduced eyebrow movement
        ) * 0.7
        
        # Proper risk categorization for Parkinson's
        parkinsons_risk = "low"
        if parkinsons_score > 0.4:
            parkinsons_risk = "high"
        elif parkinsons_score > 0.25:
            parkinsons_risk = "moderate"
            
        indicators["parkinsons"] = {
            "score": float(parkinsons_score * 100),
            "risk": parkinsons_risk
        }
        
        # Overall neurological risk - properly calculated from individual risks
        # Use a weighted approach that doesn't override individual assessments
        risk_scores = [
            bells_palsy_score,
            stroke_score,
            parkinsons_score
        ]
        
        # Get the maximum risk score
        overall_score = max(risk_scores)
        
        # Get risk level from score
        overall_risk = "low"
        if overall_score > 0.4:
            overall_risk = "high"
        elif overall_score > 0.25:
            overall_risk = "moderate"
            
        # Cross-check with individual risks - require at least one matching risk level
        if overall_risk == "high" and not any(ind["risk"] == "high" for ind in [indicators["bells_palsy"], indicators["stroke"], indicators["parkinsons"]]):
            # Downgrade if no individual high risks
            overall_risk = "moderate"
        
        indicators["overall"] = {
            "score": float(overall_score * 100),
            "risk": overall_risk
        }
        
        return indicators

    def _create_visualization(self, image, landmarks, midline):
        """Create a visualization of the facial analysis."""
        # This would normally create an annotated image for visualization
        # For now, we'll just return the structure that would be used
        return {
            "has_visualization": True,
            "features": list(landmarks.keys()),
            "midline": {
                "start": {"x": midline["top"]["x"], "y": midline["top"]["y"]},
                "end": {"x": midline["bottom"]["x"], "y": midline["bottom"]["y"]}
            }
        }

    def get_mesh_coordinates(self, image):
        """Get complete facial mesh coordinates for 3D visualization."""
        try:
            # Convert BGR to RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            height, width = image.shape[:2]
            
            # Process the image
            results = self.face_mesh.process(rgb_image)
            
            if not results.multi_face_landmarks:
                return None
                
            landmarks = results.multi_face_landmarks[0].landmark
            
            # Get all 468 landmarks with 3D coordinates
            mesh_points = []
            for i in range(468):  # MediaPipe Face Mesh has 468 landmarks
                if i < len(landmarks):
                    mesh_points.append({
                        "x": landmarks[i].x * width,
                        "y": landmarks[i].y * height,
                        "z": landmarks[i].z
                    })
            
            return {
                "mesh_points": mesh_points,
                "connections": mp.solutions.face_mesh.FACEMESH_TESSELATION
            }
        except Exception as e:
            logger.error(f"Error getting mesh coordinates: {str(e)}")
            return None