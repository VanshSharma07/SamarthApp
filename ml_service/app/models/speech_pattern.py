import numpy as np
import librosa
import logging
from scipy.signal import savgol_filter
from collections import deque
from scipy.stats import kurtosis, skew
import soundfile as sf

logger = logging.getLogger(__name__)

class SpeechPatternAnalyzer:
    def __init__(self):
        # Add this to your existing constants
        self.AUDIO = {
            'SAMPLE_RATE': 44100,
            'HOP_LENGTH': 512,
            'WIN_LENGTH': 2048,
            'N_FFT': 2048
        }
        
        # Constants for speech analysis
        self.PITCH_RANGE = {
            'MIN': 50,  # Hz
            'MAX': 500  # Hz
        }
        
        self.VOLUME_RANGE = {
            'MIN': -90, # dB
            'MAX': -10  # dB
        }
        
        self.FLUENCY = {
            'MIN_PAUSE': 0.2,    # seconds
            'MAX_PAUSE': 2.0,    # seconds
            'TARGET_RATE': 150   # words per minute
        }
        
        self.ARTICULATION = {
            'CLARITY_THRESHOLD': 0.75,
            'PRECISION_THRESHOLD': 0.8
        }
        
        # Neurological indicators thresholds
        self.NEURO_THRESHOLDS = {
            'DYSPROSODY': 0.7,            # Threshold for abnormal prosody
            'ARTICULATION_DIFF': 0.65,    # Threshold for articulation difficulties
            'RHYTHM_ABNORMAL': 0.6,       # Threshold for abnormal rhythm
            'VOICE_QUALITY_ISSUES': 0.7,  # Threshold for voice quality issues
            'BREATHING_PATTERN': 0.65,    # Threshold for abnormal breathing
        }

    def analyze_speech_pattern(self, audio_data):
        """Main analysis function for speech patterns."""
        try:
            # Try loading with soundfile first
            try:
                y, sr = sf.read(audio_data)
                # Convert to stereo if mono
                if len(y.shape) > 1:
                    y = np.mean(y, axis=1)
            except Exception as e:
                logger.warning(f"SoundFile failed, falling back to librosa: {str(e)}")
                y, sr = librosa.load(audio_data, sr=44100, mono=True)
            
            # Normalize audio to prevent clipping
            max_val = np.max(np.abs(y))
            if max_val > 0:
                y = y / max_val
            
            # Apply noise reduction filter
            y = librosa.effects.trim(y, top_db=40)[0]
            
            # Extract basic features
            pitch_features = self._analyze_pitch(y, sr)
            volume_features = self._analyze_volume(y)
            rhythm_features = self._analyze_rhythm(y, sr)
            fluency_features = self._analyze_fluency(y, sr)
            articulation_features = self._analyze_articulation(y, sr)
            voice_features = self._analyze_voice_quality_librosa(y, sr)
            
            # Extract neurological indicators
            neuro_indicators = self._analyze_neurological_indicators(
                pitch_features, volume_features, rhythm_features, 
                fluency_features, articulation_features, voice_features
            )
            
            # Calculate disorder risk scores
            disorder_risks = self._calculate_disorder_risk_scores(
                pitch_features, volume_features, rhythm_features,
                fluency_features, articulation_features, voice_features, neuro_indicators
            )
            
            # Extract time series data for visualization
            duration = len(y) / sr
            time_series = self._extract_time_series_data(y, sr)
            
            # Calculate final metrics
            metrics = self._calculate_metrics(
                pitch_features, volume_features, rhythm_features,
                fluency_features, articulation_features, voice_features,
                neuro_indicators, disorder_risks, duration, time_series
            )
            
            # Simplify metrics for frontend consumption
            metrics = {
                'clarity': metrics.get('clarity', {}).get('score', 0) / 100,
                'speech_rate': metrics.get('speechRate', {}).get('wordsPerMinute', 0),
                'volume_control': volume_features.get('variation', 0),
                'pitch_stability': pitch_features.get('stability', 0),
                'articulation': {
                    'precision': articulation_features.get('precision', 0),
                    'vowel_formation': articulation_features.get('vowel_formation', 0),
                    'consonant_precision': articulation_features.get('consonant_precision', 0),
                    'slurred_speech': articulation_features.get('slurred_speech', 0)
                },
                'emotion': {
                    'confidence': self._calculate_confidence_score(volume_features, pitch_features),
                    'hesitation': self._calculate_hesitation_score(fluency_features),
                    'stress': self._calculate_stress_score(pitch_features, volume_features),
                    'monotony': 1.0 - pitch_features.get('variability', 0)
                },
                'fluency': {
                    'fluency_score': fluency_features.get('fluency_score', 0),
                    'words_per_minute': fluency_features.get('words_per_minute', 0),
                    'pause_rate': fluency_features.get('pause_rate', 0)
                },
                'timeSeries': time_series.get('emotion', {})
            }
            
            return {
                "success": True,
                "metrics": metrics
            }
            
        except Exception as e:
            logger.error(f"Speech analysis error: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def _analyze_pitch(self, y, sr):
        """Analyze pitch variations and patterns."""
        try:
            # Use consistent parameters
            pitches, magnitudes = librosa.piptrack(
                y=y, 
                sr=sr,
                hop_length=self.AUDIO['HOP_LENGTH'],
                n_fft=self.AUDIO['N_FFT']
            )
            pitch_values = []
            
            # Get the most prominent pitch for each frame
            for t in range(pitches.shape[1]):
                index = magnitudes[:,t].argmax()
                pitch_values.append(pitches[index,t])
            
            pitch_values = np.array(pitch_values)
            pitch_values = pitch_values[pitch_values > 0]
            
            if len(pitch_values) == 0:
                return {
                    'mean': 0,
                    'std': 0,
                    'stability': 0,
                    'variability': 0
                }
            
            return {
                'mean': float(np.mean(pitch_values)),
                'std': float(np.std(pitch_values)),
                'stability': float(1 - (np.std(pitch_values) / np.mean(pitch_values)) if np.mean(pitch_values) > 0 else 0),
                'variability': float(np.std(pitch_values) / np.mean(pitch_values) if np.mean(pitch_values) > 0 else 0)
            }
        except Exception as e:
            logger.error(f"Error analyzing pitch: {str(e)}")
            return {
                'mean': 0,
                'std': 0,
                'stability': 0,
                'variability': 0
            }

    def _analyze_volume(self, y):
        """Analyze volume patterns."""
        try:
            rms = librosa.feature.rms(y=y)[0]
            db = librosa.amplitude_to_db(rms)
            
            # Calculate basic volume metrics
            mean_db = np.mean(db)
            std_db = np.std(db)
            
            # Calculate volume variation
            db_range = np.max(db) - np.min(db)
            variation = std_db / db_range if db_range > 0 else 0
            
            return {
                'mean': float(mean_db),
                'std': float(std_db),
                'variation': float(variation),
                'range': {
                    'min': float(np.min(db)),
                    'max': float(np.max(db))
                }
            }
        except Exception as e:
            logger.error(f"Error analyzing volume: {str(e)}")
            return {
                'mean': 0,
                'std': 0,
                'variation': 0,
                'range': {'min': 0, 'max': 0}
            }

    def _analyze_rhythm(self, y, sr):
        """Analyze speech rhythm and timing patterns."""
        try:
            # Use energy-based syllable detection
            # Get the amplitude envelope
            hop_length = 512
            frame_length = 2048
            
            # Calculate RMS energy for each frame
            rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
            
            # Find peaks in the energy envelope to detect syllables
            # Use a simpler peak detection method
            peaks = []
            threshold = 0.5 * np.mean(rms)  # Adaptive threshold
            for i in range(1, len(rms)-1):
                if rms[i] > threshold and rms[i] > rms[i-1] and rms[i] > rms[i+1]:
                    peaks.append(i)
            
            # Calculate syllables per second
            duration = len(y) / sr
            syllable_count = len(peaks)
            syllables_per_second = syllable_count / duration if duration > 0 else 0
            
            # Estimate words per minute (assuming average of 1.5 syllables per word)
            words_per_minute = (syllable_count / 1.5) * (60 / duration) if duration > 0 else 0
            
            # Calculate rhythm regularity
            if len(peaks) > 1:
                peak_intervals = np.diff([p * hop_length / sr for p in peaks])
                rhythm_regularity = 1 - (np.std(peak_intervals) / np.mean(peak_intervals)) if np.mean(peak_intervals) > 0 else 0
            else:
                rhythm_regularity = 0
                
            return {
                'tempo': float(syllables_per_second * 60),  # Convert to per minute
                'beat_consistency': float(1 - rhythm_regularity),
                'rhythm_regularity': float(rhythm_regularity),
                'syllables_per_second': float(syllables_per_second),
                'syllable_count': int(syllable_count),
                'words_per_minute': float(words_per_minute),
                'rhythm_variability': float(1 - rhythm_regularity)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing rhythm: {str(e)}")
            return {
                'tempo': 0,
                'beat_consistency': 0,
                'rhythm_regularity': 0,
                'syllables_per_second': 0,
                'syllable_count': 0,
                'words_per_minute': 0,
                'rhythm_variability': 0
            }

    def _analyze_fluency(self, y, sr):
        """Analyze speech fluency patterns with neuromotor focus."""
        try:
            # Get onsets for pause detection
            oenv = librosa.onset.onset_strength(y=y, sr=sr)
            onset_frames = librosa.onset.onset_detect(onset_envelope=oenv, backtrack=False)
            onset_times = librosa.frames_to_time(onset_frames, sr=sr)
            
            # Calculate pauses between onsets
            if len(onset_times) > 1:
                pause_durations = np.diff(onset_times)
                
                # Identify long pauses (potential hesitations)
                long_pauses = pause_durations[pause_durations > self.FLUENCY['MIN_PAUSE']]
                
                # Calculate words per minute (approximation)
                duration_minutes = len(y) / sr / 60
                word_count = max(len(onset_frames) // 2, 1)  # Rough approximation: 2 syllables per word
                words_per_minute = word_count / duration_minutes if duration_minutes > 0 else 0
                
                # Calculate variability in pause duration (for neuromotor assessment)
                pause_variability = np.std(pause_durations) / np.mean(pause_durations) if np.mean(pause_durations) > 0 else 0
                
                # Detect palilalia (repetitive speech) - approximation using repeated acoustic patterns
                palilalia_score = 0
                try:
                    # Simple autocorrelation to detect repetitions
                    if len(y) > sr:  # At least 1 sec
                        # Downsample for efficiency
                        hop_length = 512
                        y_env = librosa.feature.rms(y=y, hop_length=hop_length)[0]
                        # Get autocorrelation
                        corr = np.correlate(y_env, y_env, mode='full')
                        corr = corr[len(corr)//2:]  # Take only positive lags
                        # Normalize
                        if corr[0] > 0:
                            corr = corr / corr[0]
                        # Look for peaks that indicate repetitions (exclude zero lag)
                        peaks = librosa.util.peak_pick(
                            corr[1:],
                            pre_max=1,
                            post_max=1,
                            pre_avg=1,
                            post_avg=1,
                            delta=0.5,
                            wait=0.2
                        )
                        if len(peaks) > 0:
                            # Use strongest peak value as a palilalia score
                            palilalia_score = max(0, np.max(corr[peaks+1]) - 0.5) * 2  # Scale to [0,1]
                except Exception as ex:
                    logger.warning(f"Could not calculate palilalia score: {str(ex)}")
                
                return {
                    'average_pause_duration': float(np.mean(pause_durations)),
                    'pause_rate': float(len(pause_durations) / (len(y) / sr)),
                    'long_pause_count': int(len(long_pauses)),
                    'words_per_minute': float(words_per_minute),
                    'word_count': int(word_count),
                    'fluency_score': float(np.clip(1 - (np.mean(pause_durations) / self.FLUENCY['MAX_PAUSE']), 0, 1)),
                    'pause_variability': float(pause_variability),
                    'palilalia_score': float(palilalia_score)
                }
            else:
                return {
                    'average_pause_duration': 0.0,
                    'pause_rate': 0.0,
                    'long_pause_count': 0,
                    'words_per_minute': 0.0,
                    'word_count': 0,
                    'fluency_score': 0.0,
                    'pause_variability': 0.0,
                    'palilalia_score': 0.0
                }
        except Exception as e:
            logger.error(f"Error analyzing fluency: {str(e)}")
            return {
                'average_pause_duration': 0.0,
                'pause_rate': 0.0,
                'long_pause_count': 0,
                'words_per_minute': 0.0,
                'word_count': 0,
                'fluency_score': 0.0,
                'pause_variability': 0.0,
                'palilalia_score': 0.0
            }

    def _analyze_articulation(self, y, sr):
        """Analyze speech articulation using librosa."""
        try:
            # Extract MFCC features for articulation analysis
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            
            # Calculate articulation metrics
            clarity = np.mean(np.std(mfccs, axis=1))
            precision = np.mean(np.abs(np.diff(mfccs, axis=1)))
            
            # Calculate consonant precision (higher frequency components)
            spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            consonant_precision = np.mean(spectral_centroid) / (sr/4)
            
            # Calculate vowel formation using formant-like features
            vowel_formation = 0.0
            try:
                # Use first few MFCCs as formant approximation
                formant_mfccs = mfccs[:3, :]  # First 3 MFCCs
                
                # Calculate stability of these pseudo-formants
                formant_stability = []
                for i in range(formant_mfccs.shape[0]):
                    values = formant_mfccs[i]
                    if len(values) > 0:
                        stability = 1 - (np.std(values) / (np.mean(np.abs(values)) + 1e-6))
                        formant_stability.append(stability)
                
                vowel_formation = np.mean(formant_stability) if formant_stability else 0.0
                
            except Exception as e:
                logger.warning(f"Could not calculate vowel formation: {str(e)}")
                vowel_formation = 0.0
            
            return {
                'precision': float(np.clip(precision / 10, 0, 1)),
                'formation': float(np.clip(clarity / 20, 0, 1)),
                'consonant_precision': float(np.clip(consonant_precision, 0, 1)),
                'vowel_formation': float(np.clip(vowel_formation, 0, 1)),
                'slurred_speech': float(1 - np.clip(precision / 15, 0, 1))
            }
            
        except Exception as e:
            logger.error(f"Error analyzing articulation: {str(e)}")
            return {
                'precision': 0.0,
                'formation': 0.0,
                'consonant_precision': 0.0,
                'vowel_formation': 0.0,
                'slurred_speech': 0.0
            }

    def _analyze_voice_quality_librosa(self, y, sr):
        """Analyze voice quality using librosa instead of parselmouth."""
        try:
            # Spectral features for voice quality
            spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            
            # Calculate breathiness using spectral flatness
            breathiness = np.mean(librosa.feature.spectral_flatness(y=y)[0])
            
            # Calculate harmonics using harmonic component
            harmonics = librosa.effects.harmonic(y)
            harmonic_ratio = np.mean(np.abs(harmonics)) / (np.mean(np.abs(y)) + 1e-8)
            
            return {
                'breathiness': float(breathiness),
                'harmonics_to_noise': float(harmonic_ratio),
                'voice_quality_score': float(np.clip(1 - breathiness, 0, 1))
            }
        except Exception as e:
            logger.error(f"Error analyzing voice quality: {str(e)}")
            return {
                'breathiness': 0,
                'harmonics_to_noise': 0,
                'voice_quality_score': 0
            }

    def _calculate_disorder_risk_scores(self, pitch, volume, rhythm, fluency, articulation, voice, neuro_indicators):
        """Calculate risk scores for specific neuromotor disorders."""
        try:
            # Calculate Parkinson's-related speech features
            parkinsons_score = np.mean([
                pitch.get('jitter', 0) * 5,  # Increased jitter weight
                voice.get('voice_tremor', 0),
                voice.get('breathiness', 0),
                volume.get('shimmer', 0) * 5,  # Increased shimmer weight
                1 - volume.get('voiced_unvoiced_ratio', 1),  # Lower VU ratio indicates hypophonia
                volume.get('amplitude_decay', 0),  # Volume decay indicator
                rhythm.get('acceleration', 0) * 0.5,  # Speech festination indicator
                articulation.get('slurred_speech', 0) * 0.5  # Slurred speech
            ])
            
            # Calculate ALS/MND-related speech features
            als_score = np.mean([
                articulation.get('slurred_speech', 0),
                1 - articulation.get('consonant_precision', 1),
                voice.get('breathiness', 0),
                neuro_indicators.get('breathingPatterns', 0),
                neuro_indicators.get('articulationDifficulty', 0)
            ])
            
            # Calculate ataxic dysarthria features (e.g., cerebellar disorders)
            ataxic_score = np.mean([
                rhythm.get('rhythm_variability', 0),
                neuro_indicators.get('abnormalRhythm', 0),
                articulation.get('slurred_speech', 0) * 0.5,
                pitch.get('variability', 0) * 0.75
            ])
            
            # Calculate essential tremor speech features
            essential_tremor_score = np.mean([
                pitch.get('tremor', 0),
                voice.get('voice_tremor', 0),
                rhythm.get('rhythm_variability', 0) * 0.5,
                pitch.get('jitter', 0) * 2
            ])
            
            # Calculate spastic dysarthria features (e.g., multiple sclerosis, stroke)
            spastic_score = np.mean([
                1 - articulation.get('vowel_formation', 1),
                1 - rhythm.get('rhythm_regularity', 1),
                fluency.get('pause_variability', 0),
                voice.get('nasality', 0) * 0.5,  # Excess nasality may indicate weakness 
                neuro_indicators.get('voiceQualityIssues', 0)
            ])
            
            # Return normalized scores
            return {
                'parkinsons': float(np.clip(parkinsons_score, 0, 1)),
                'als': float(np.clip(als_score, 0, 1)),
                'ataxic': float(np.clip(ataxic_score, 0, 1)),
                'essential_tremor': float(np.clip(essential_tremor_score, 0, 1)),
                'spastic': float(np.clip(spastic_score, 0, 1))
            }
        except Exception as e:
            logger.error(f"Error calculating disorder risk scores: {str(e)}")
            return {
                'parkinsons': 0,
                'als': 0,
                'ataxic': 0,
                'essential_tremor': 0,
                'spastic': 0
            }

    def _extract_time_series_data(self, y, sr):
        """Extract time series data for visualization and detailed analysis."""
        try:
            # Time axis
            duration = len(y) / sr
            times = np.linspace(0, duration, num=min(500, len(y)))
            
            # For consistent sizing, resample all features to fixed length
            target_len = len(times)
            
            # Extract pitch contour using librosa
            pitch_data = []
            try:
                pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
                pitch_values = []
                for t in range(pitches.shape[1]):
                    index = magnitudes[:,t].argmax()
                    pitch_values.append(pitches[index,t])
                
                pitch_times = np.linspace(0, duration, len(pitch_values))
                pitch_data = np.interp(times, pitch_times, pitch_values, left=0, right=0)
            except Exception as e:
                logger.warning(f"Could not extract pitch contour: {str(e)}")
                pitch_data = np.zeros(target_len)
            
            # Extract intensity contour
            volume_data = []
            try:
                rms = librosa.feature.rms(y=y)[0]
                rms_times = np.linspace(0, duration, len(rms))
                volume_data = np.interp(times, rms_times, librosa.amplitude_to_db(rms), left=-80, right=-80)
            except Exception as e:
                logger.warning(f"Could not extract volume contour: {str(e)}")
                volume_data = np.zeros(target_len)
            
            # Extract speech segments
            segments = []
            try:
                # Simple energy-based segmentation
                rms = librosa.feature.rms(y=y)[0]
                threshold = 0.1 * np.max(rms)
                is_speech = rms > threshold
                
                # Find speech segment boundaries
                changes = np.diff(is_speech.astype(int))
                onsets = np.where(changes > 0)[0]
                offsets = np.where(changes < 0)[0]
                
                # Ensure we have matching onsets and offsets
                if len(onsets) > len(offsets):
                    offsets = np.append(offsets, len(is_speech)-1)
                elif len(offsets) > len(onsets):
                    onsets = np.insert(onsets, 0, 0)
                
                # Convert to time
                for i in range(min(len(onsets), len(offsets))):
                    onset_time = librosa.frames_to_time(onsets[i], sr=sr)
                    offset_time = librosa.frames_to_time(offsets[i], sr=sr)
                    if offset_time > onset_time:
                        segments.append({
                            'start': float(onset_time),
                            'end': float(offset_time),
                            'type': 'speech'
                        })
            except Exception as e:
                logger.warning(f"Could not extract speech segments: {str(e)}")
            
            # Extract formants using MFCC as approximation
            formants = []
            try:
                mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=3)
                formant_times = np.linspace(0, duration, mfccs.shape[1])
                
                for i in range(mfccs.shape[0]):
                    formants.append(np.interp(times, formant_times, mfccs[i], left=0, right=0).tolist())
                    
            except Exception as e:
                logger.warning(f"Could not extract formants: {str(e)}")
            
            # Extract emotional markers
            emotion = {
                'confidence': self._extract_confidence_time_series(y, sr, times),
                'stress': self._extract_stress_time_series(y, sr, times),
                'hesitation': self._extract_hesitation_time_series(y, sr, times)
            }
            
            return {
                'pitchData': pitch_data.tolist() if isinstance(pitch_data, np.ndarray) else [],
                'volumeData': volume_data.tolist() if isinstance(volume_data, np.ndarray) else [],
                'formants': formants,
                'emotion': emotion,
                'timestamps': times.tolist(),
                'speechSegments': segments
            }
        except Exception as e:
            logger.error(f"Error extracting time series data: {str(e)}")
            return {
                'pitchData': [],
                'volumeData': [],
                'formants': [],
                'emotion': {
                    'confidence': [],
                    'stress': [],
                    'hesitation': []
                },
                'timestamps': [],
                'speechSegments': []
            }

    def _extract_confidence_time_series(self, y, sr, times):
        """Extract confidence scores over time."""
        try:
            # Use volume as a proxy for confidence
            rms = librosa.feature.rms(y=y)[0]
            rms_times = np.linspace(0, len(y)/sr, len(rms))
            
            # Normalize RMS values
            normalized_rms = (rms - np.min(rms)) / (np.max(rms) - np.min(rms) + 1e-10)
            
            # Interpolate to match times array
            confidence_values = np.interp(times, rms_times, normalized_rms, left=0, right=0)
            
            return confidence_values.tolist()
        except Exception as e:
            logger.warning(f"Could not extract confidence time series: {str(e)}")
            return [0] * len(times)
    
    def _extract_stress_time_series(self, y, sr, times):
        """Extract stress indicators over time using librosa."""
        try:
            window_length = int(sr * 0.2)  # 200ms windows
            hop_length = int(sr * 0.05)  # 50ms hops
            
            stress_values = []
            for i in range(0, len(y) - window_length, hop_length):
                window = y[i:i+window_length]
                
                # Calculate local pitch variability using librosa
                pitches, magnitudes = librosa.piptrack(y=window, sr=sr)
                pitch_values = []
                for t in range(pitches.shape[1]):
                    index = magnitudes[:,t].argmax()
                    pitch_values.append(pitches[index,t])
                
                pitch_values = np.array(pitch_values)
                pitch_values = pitch_values[pitch_values > 0]
                
                if len(pitch_values) > 1:
                    pitch_var = np.std(pitch_values) / np.mean(pitch_values)
                else:
                    pitch_var = 0
                
                # Calculate local volume variability
                rms = librosa.feature.rms(y=window)[0]
                if len(rms) > 1:
                    vol_var = np.std(rms) / np.mean(rms)
                else:
                    vol_var = 0
                
                # Combine indicators with weights
                stress = 0.6 * pitch_var + 0.4 * vol_var
                stress_values.append(np.clip(stress, 0, 1))
            
            # Get time points for stress values
            stress_times = np.linspace(0, len(y)/sr, len(stress_values))
            
            # Interpolate to match times array
            stress_series = np.interp(times, stress_times, stress_values, left=0, right=0)
            
            return stress_series.tolist()
        except Exception as e:
            logger.warning(f"Could not extract stress time series: {str(e)}")
            return [0] * len(times)
    
    def _extract_hesitation_time_series(self, y, sr, times):
        """Extract hesitation indicators over time."""
        try:
            # Calculate energy envelope
            rms = librosa.feature.rms(y=y)[0]
            rms_times = np.linspace(0, len(y)/sr, len(rms))
            
            # Detect potential hesitations (low energy regions between speech)
            threshold = 0.2 * np.max(rms)
            is_speech = rms > threshold
            
            # Calculate hesitation measure
            hesitation = np.zeros_like(rms)
            for i in range(1, len(is_speech)-1):
                if is_speech[i-1] and not is_speech[i] and is_speech[i+1]:
                    # This is a brief pause between speech - likely hesitation
                    hesitation[i] = 1.0
            
            # Smooth the hesitation measure
            hesitation = np.convolve(hesitation, np.ones(3)/3, mode='same')
            
            # Interpolate to match times array
            hesitation_series = np.interp(times, rms_times, hesitation, left=0, right=0)
            
            return hesitation_series.tolist()
        except Exception as e:
            logger.warning(f"Could not extract hesitation time series: {str(e)}")
            return [0] * len(times)

    def _analyze_neurological_indicators(self, pitch, volume, rhythm, fluency, articulation, voice):
        """Identify potential neurological indicators in speech patterns."""
        try:
            # Calculate dysprosody score (abnormal prosody)
            # Indicators: abnormal pitch variation, rhythm irregularity
            dysprosody = np.mean([
                1 - pitch.get('stability', 0),
                pitch.get('jitter', 0) * 10,  # Scale jitter
                1 - rhythm.get('rhythm_regularity', 0),
                abs(rhythm.get('syllables_per_second', 0) - 4) / 4  # Deviation from normal rate
            ])
            
            # Calculate articulation difficulty score
            # Indicators: poor consonant precision, unstable formants
            articulation_difficulty = np.mean([
                1 - articulation.get('consonant_precision', 0),
                1 - articulation.get('vowel_formation', 0),
                1 - articulation.get('precision', 0)
            ])
            
            # Calculate abnormal rhythm score
            # Indicators: irregular pausing, abnormal rate
            abnormal_rhythm = np.mean([
                1 - rhythm.get('rhythm_regularity', 0),
                min(1.0, fluency.get('average_pause_duration', 0) / 1.0),
                abs(fluency.get('words_per_minute', 0) - 150) / 150  # Deviation from normal rate
            ])
            
            # Calculate voice quality issues score
            # Indicators: breathiness, abnormal HNR
            voice_quality_issues = np.mean([
                voice.get('breathiness', 0),
                1 - min(1.0, voice.get('harmonics_to_noise', 0) / 20)
            ])
            
            # Calculate breathing pattern abnormality
            # Indicators: irregular pausing, breathiness
            breathing_patterns = np.mean([
                voice.get('breathiness', 0),
                min(1.0, fluency.get('pause_rate', 0))
            ])
            
            return {
                'dysprosody': float(np.clip(dysprosody, 0, 1)),
                'articulationDifficulty': float(np.clip(articulation_difficulty, 0, 1)),
                'abnormalRhythm': float(np.clip(abnormal_rhythm, 0, 1)),
                'voiceQualityIssues': float(np.clip(voice_quality_issues, 0, 1)),
                'breathingPatterns': float(np.clip(breathing_patterns, 0, 1))
            }
        except Exception as e:
            logger.error(f"Error calculating neurological indicators: {str(e)}")
            return {
                'dysprosody': 0,
                'articulationDifficulty': 0,
                'abnormalRhythm': 0,
                'voiceQualityIssues': 0,
                'breathingPatterns': 0
            }
    
    def _calculate_metrics(self, pitch, volume, rhythm, fluency, articulation, voice, neuro_indicators, disorder_risks, duration, time_series):
        """Calculate overall speech metrics matching MongoDB schema structure."""
        try:
            # Calculate clarity score
            clarity_score = np.mean([
                articulation.get('precision', 0),
                articulation.get('formation', 0),
                articulation.get('consonant_precision', 0),
                articulation.get('vowel_formation', 0)
            ]) * 100
            
            # Calculate overall speech metrics
            metrics = {
                'clarity': {
                    'score': float(clarity_score),
                    'confidence': float(100 - neuro_indicators.get('articulationDifficulty', 0) * 100)
                },
                'speechRate': {
                    'wordsPerMinute': float(fluency.get('words_per_minute', 0)),
                    'syllablesPerSecond': float(rhythm.get('syllables_per_second', 0))
                },
                'volumeControl': {
                    'meanVolume': float(volume.get('mean', 0)),
                    'volumeVariation': float(volume.get('variation', 0))
                },
                'duration': float(duration),
                'articulation': {
                    'consonantPrecision': float(articulation.get('consonant_precision', 0)),
                    'vowelFormation': float(articulation.get('vowel_formation', 0))
                },
                'emotion': {
                    'confidence': float(self._calculate_confidence_score(volume, pitch)),
                    'hesitation': float(self._calculate_hesitation_score(fluency)),
                    'stress': float(self._calculate_stress_score(pitch, volume))
                },
                'pitchStability': float(pitch.get('stability', 0)),
                'overallScore': float(self._calculate_overall_score(clarity_score, fluency, volume, pitch)),
                'neurologicalIndicators': neuro_indicators,
                'disorderRiskScores': disorder_risks,
                'timeSeries': time_series
            }
            
            return metrics
        except Exception as e:
            logger.error(f"Error calculating metrics: {str(e)}")
            return {}

    def _calculate_confidence_score(self, volume, pitch):
        """Calculate confidence score from speech patterns."""
        try:
            # Get volume and pitch metrics
            mean_volume = volume.get('mean', -90)  # Get mean volume in dB
            volume_variation = volume.get('variation', 0)
            pitch_stability = pitch.get('stability', 0)
            
            # Normalize volume (from dB scale to 0-1)
            normalized_volume = (mean_volume - self.VOLUME_RANGE['MIN']) / (self.VOLUME_RANGE['MAX'] - self.VOLUME_RANGE['MIN'])
            normalized_volume = np.clip(normalized_volume, 0, 1)
            
            # Calculate confidence components
            volume_confidence = normalized_volume * 0.4  # Weight: 40%
            stability_confidence = pitch_stability * 0.4  # Weight: 40%
            variability_confidence = (1 - volume_variation) * 0.2  # Weight: 20%
            
            # Combined confidence score
            confidence_score = volume_confidence + stability_confidence + variability_confidence
            
            return float(np.clip(confidence_score, 0, 1))
        except Exception as e:
            logger.error(f"Error calculating confidence score: {str(e)}")
            return 0.5  # Return moderate confidence as fallback

    def _calculate_hesitation_score(self, fluency):
        """Calculate hesitation score from speech patterns."""
        try:
            # Calculate hesitation based on pause patterns
            pause_rate = fluency.get('pause_rate', 0)
            avg_pause = fluency.get('average_pause_duration', 0)
            
            # Normalize pause metrics
            normalized_rate = min(1.0, pause_rate / 2.0)  # assume 2 pauses/sec is high
            normalized_duration = min(1.0, avg_pause / self.FLUENCY['MAX_PAUSE'])
            
            # Combined score (higher score means more hesitation)
            hesitation_score = (normalized_rate + normalized_duration) / 2
            return float(np.clip(hesitation_score, 0, 1))
        except Exception as e:
            logger.error(f"Error calculating hesitation score: {str(e)}")
            return 0.0

    def _calculate_stress_score(self, pitch, volume):
        """Calculate stress indicators in speech."""
        try:
            # Use pitch and volume variability as stress indicators
            pitch_variability = pitch.get('std', 0)
            volume_variability = volume.get('std', 0)
            
            # Normalize metrics
            norm_pitch = min(1.0, pitch_variability / 50)  # assume 50Hz std is high
            norm_volume = min(1.0, volume_variability / 20)  # assume 20dB std is high
            
            # Combined score (higher score means more stress)
            stress_score = (norm_pitch + norm_volume) / 2
            return float(np.clip(stress_score, 0, 1))
        except Exception as e:
            logger.error(f"Error calculating stress score: {str(e)}")
            return 0.0

    def _calculate_overall_score(self, clarity_score, fluency, volume, pitch):
        """Calculate overall speech quality score."""
        scores = [
            clarity_score,
            fluency.get('words_per_minute', 0) / self.FLUENCY['TARGET_RATE'],
            1.0 - min(1.0, volume.get('std', 0) / 20),
            self._calculate_confidence_score(volume, pitch)
        ]
        return float(np.mean(scores) * 100)

    def _calculate_clarity(self, y, sr):
        """Calculate speech clarity score."""
        try:
            # Extract MFCC features
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            
            # Calculate spectral contrast
            contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
            
            # Calculate clarity metrics
            mfcc_std = np.std(mfccs, axis=1)
            mfcc_clarity = np.mean(mfcc_std)
            
            # Spectral contrast mean
            contrast_clarity = np.mean(contrast)
            
            # Zero crossing rate
            zcr = librosa.feature.zero_crossing_rate(y)[0]
            zcr_clarity = np.mean(zcr)
            
            # Calculate spectral rolloff
            rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            rolloff_clarity = np.mean(rolloff) / (sr/2)  # Normalize by Nyquist frequency
            
            # Calculate temporal envelope
            env = np.abs(librosa.feature.rms(y=y)[0])
            env_clarity = np.std(env) / (np.mean(env) + 1e-6)
            
            # New weights and normalization factors
            clarity_components = {
                'mfcc': np.clip(mfcc_clarity / 15, 0, 1),      # MFCC variation
                'contrast': np.clip(contrast_clarity / 30, 0, 1),  # Spectral contrast
                'zcr': np.clip(zcr_clarity * 50, 0, 1),        # Consonant strength
                'rolloff': rolloff_clarity,                     # High frequency content
                'envelope': np.clip(env_clarity, 0, 1)          # Amplitude modulation
            }
            
            # Weighted combination
            weights = {
                'mfcc': 0.3,
                'contrast': 0.25,
                'zcr': 0.2,
                'rolloff': 0.15,
                'envelope': 0.1
            }
            
            clarity_score = sum(
                clarity_components[comp] * weights[comp]
                for comp in clarity_components
            )
            
            # Apply progressive scaling (make it harder to get very high scores)
            clarity_score = np.power(clarity_score, 1.2)
            
            # Final normalization
            clarity_score = np.clip(clarity_score, 0, 1)
            
            # Debug logging
            logger.debug(f"Clarity components: {clarity_components}")
            logger.debug(f"Final clarity score: {clarity_score}")
            
            return float(clarity_score)
        
        except Exception as e:
            logger.error(f"Error calculating clarity: {str(e)}")
            return 0.0