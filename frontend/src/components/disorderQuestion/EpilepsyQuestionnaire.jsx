import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider,
  Grid,
  FormHelperText,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ReadAloudButton from './ReadAloudButton';
import ProgressBar from './ProgressBar';

const YesNoSometimes = ({ name, value, onChange, fontSize, labels = { yes: 'Yes', no: 'No', notsure: 'Not sure' } }) => (
  <FormControl component="fieldset" sx={{ my: 1 }}>
    <RadioGroup row name={name} value={value} onChange={(e) => onChange(e.target.value)}>
      <FormControlLabel value="yes" control={<Radio />} label={labels.yes} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
      <FormControlLabel value="no" control={<Radio />} label={labels.no} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
      <FormControlLabel value="notsure" control={<Radio />} label={labels.notsure} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
    </RadioGroup>
  </FormControl>
);

const YesNo = ({ name, value, onChange, fontSize, labels = { yes: 'Yes', no: 'No' } }) => (
  <FormControl component="fieldset" sx={{ my: 1 }}>
    <RadioGroup row name={name} value={value} onChange={(e) => onChange(e.target.value)}>
      <FormControlLabel value="yes" control={<Radio />} label={labels.yes} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
      <FormControlLabel value="no" control={<Radio />} label={labels.no} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
    </RadioGroup>
  </FormControl>
);

const NeverSometimesOften = ({ name, value, onChange, fontSize, labels = { never: 'Never', sometimes: 'Sometimes', often: 'Often' } }) => (
  <FormControl component="fieldset" sx={{ my: 1 }}>
    <RadioGroup row name={name} value={value} onChange={(e) => onChange(e.target.value)}>
      <FormControlLabel value="never" control={<Radio />} label={labels.never} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
      <FormControlLabel value="sometimes" control={<Radio />} label={labels.sometimes} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
      <FormControlLabel value="often" control={<Radio />} label={labels.often} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
    </RadioGroup>
  </FormControl>
);

const EpilepsyQuestionnaire = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    age: '',
    sex: '',
    dominantHand: '',
    contact: '',
    knownDiagnosis: '',
    longTermMedication: '',
    headInjury: '',
    // Epilepsy-specific
    lostAwareness: '',
    observedStaring: '',
    unusualSensations: '',
    motorActivityReported: '',
    postEpisodeSymptoms: '',
    priorSeizureDiagnosis: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });

  const DEBUG = (import.meta.env && import.meta.env.VITE_DEBUG === 'true') || false;

  // font size state persisted to localStorage
  const [fontSizeKey, setFontSizeKey] = useState('medium');
  useEffect(() => {
    try {
      const v = localStorage.getItem('epilepsy_font_size');
      if (v === 'small' || v === 'medium' || v === 'large') setFontSizeKey(v);
    } catch (err) { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem('epilepsy_font_size', fontSizeKey); } catch (err) { /* ignore */ } }, [fontSizeKey]);

  const sizeMap = {
    small: '0.9rem',
    medium: '1rem',
    large: '1.3rem'
  };
  const computedFontSize = sizeMap[fontSizeKey] || sizeMap.medium;

  // language state persisted to localStorage
  const [lang, setLang] = useState('en');
  useEffect(() => {
    try {
      const v = localStorage.getItem('epilepsy_language');
      if (v === 'en' || v === 'hi') setLang(v);
    } catch (err) { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem('epilepsy_language', lang); } catch (err) { /* ignore */ } }, [lang]);

  const translations = {
    en: {
      title: 'Epilepsy Questionnaire',
      subtitle: 'Please complete the questionnaire below. Required fields must be filled before continuing.',
      fontSizeLabel: 'Font size', small: 'Small', medium: 'Medium', large: 'Large',
      name: 'Name', age: 'Age', sex: 'Sex', dominantHand: 'Dominant Hand', right: 'Right', left: 'Left', contact: 'Contact / Caregiver (if any)',
      knownDiagnosis: 'Any known neurological diagnosis?', longTermMedication: 'On long-term medication?', headInjury: 'Any history of head injury or loss of consciousness?',
      lostAwareness: "Have you experienced brief periods where you lost awareness or can't recall what happened?",
      observedStaring: 'Has anyone observed you staring blankly or becoming unresponsive?',
      unusualSensations: 'Do you sometimes experience unusual sensations like odd smells/tastes, sudden fear, tingling, visual changes, or a rising feeling inside?',
      motorActivityReported: 'Has anyone reported jerking, stiffening, or repetitive movements during such events?',
      postEpisodeSymptoms: 'Do you feel extremely tired, disoriented, or get headaches after such episodes?',
      priorSeizureDiagnosis: 'Have you ever been told you had a seizure, fainting spell, or blackout?',
      yes: 'Yes', no: 'No', notsure: 'Not sure', never: 'Never', sometimes: 'Sometimes', often: 'Often',
      submit: 'Submit and Continue', back: 'Back'
    },
    hi: {
      title: 'मिर्गी (एपिलेप्सी) प्रश्नावली',
      subtitle: 'कृपया नीचे दिए गए प्रश्नावली को पूरा करें। जिन स्थानों पर ‘‘ चिन्ह है, उन्हें भरना आवश्यक है।*',
      fontSizeLabel: 'फ़ॉन्ट आकार', small: 'छोटा', medium: 'मध्यम', large: 'बड़ा',
      name: 'नाम', age: 'आयु', sex: 'लिंग', dominantHand: 'मुख्य हाथ', right: 'दायाँ', left: 'बायाँ', contact: 'संपर्क / देखभालकर्ता (यदि कोई हो)',
      knownDiagnosis: 'क्या आपको किसी तंत्रिका संबंधी (न्यूरोलॉजिकल) बीमारी का पहले से निदान हुआ है?', longTermMedication: 'क्या आप लंबे समय से नियमित दवाइयाँ ले रहे हैं?', headInjury: 'क्या आपको सिर में चोट लगी है या कभी बेहोशी हुई है?',
      lostAwareness: 'क्या आपने कभी ऐसे छोटे समय के एपिसोड अनुभव किए हैं जब आपको होश न रहा हो या आपको याद न हो कि क्या हुआ था?',
      observedStaring: 'क्या किसी ने आपको खाली निगाहों से देखते हुए या प्रतिक्रिया न देते हुए देखा है?',
      unusualSensations: 'क्या आपको कभी-कभी अजीब संवेदनाएँ होती हैं जैसे अजीब गंध/स्वाद, अचानक डर लगना, झुनझुनी, आँखों के आगे बदलाव, या अंदर से उठता हुआ अजीब-सा एहसास?',
      motorActivityReported: 'क्या किसी ने ऐसे एपिसोड के दौरान आपके झटके आने, शरीर सख्त होने, या बार-बार होने वाली हरकतों के बारे में बताया है?',
      postEpisodeSymptoms: 'क्या ऐसे एपिसोड के बाद आपको बहुत थकान, भ्रम, या सिरदर्द महसूस होता है?',
      priorSeizureDiagnosis: 'क्या कभी किसी ने आपको बताया है कि आपको दौरा पड़ा था, बेहोशी आई थी, या ब्लैकआउट हुआ था?',
      yes: 'हाँ', no: 'नहीं', notsure: 'पता नहीं', never: 'कभी नहीं', sometimes: 'कभी-कभी', often: 'अक्सर',
      submit: 'जमा करें और आगे बढ़ें', back: 'वापस'
    }
  };
  const t = (key) => (translations[lang] && translations[lang][key]) || translations.en[key] || key;

  const update = (key, value) => setForm((s) => ({ ...s, [key]: value }));

  const validateField = (key, value) => {
    let msg = '';
    const requiredKeys = ['name','age','sex','dominantHand','contact','knownDiagnosis','longTermMedication','headInjury'];
    if (requiredKeys.includes(key)) {
      if (value === '' || value === null || typeof value === 'undefined') msg = 'This field is required';
    }
    if (key === 'age' && value !== '') {
      const n = Number(value);
      if (Number.isNaN(n) || n < 1) msg = 'Enter a valid age (1 or older)';
    }
    setErrors((e) => ({ ...e, [key]: msg }));
    return msg === '';
  };

  // Ensure contact is digits-only and max 10 digits
  const handleContactChange = (e) => {
    const raw = e.target.value || '';
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    update('contact', digits);
    validateField('contact', digits);
  };

  const isFormFilled = () => {
    const requiredKeys = ['name','age','sex','dominantHand','contact','knownDiagnosis','longTermMedication','headInjury'];
    for (const k of requiredKeys) {
      const v = form[k];
      if (v === '' || v === null || typeof v === 'undefined') return false;
      if (k === 'age') {
        const n = Number(v);
        if (Number.isNaN(n) || n < 1) return false;
      }
    }
    return true;
  };

  const isFormValid = () => {
    const requiredKeys = ['name','age','sex','dominantHand','contact','knownDiagnosis','longTermMedication','headInjury'];
    let ok = true;
    requiredKeys.forEach(k => {
      const valid = validateField(k, form[k]);
      if (!valid) ok = false;
    });
    return ok;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid()) return;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        const responses = Object.keys(form).map((k) => ({ questionId: k, questionText: t(k) || k, answer: form[k] }));

        const payload = {
          userId: userId || undefined,
          username: localStorage.getItem('userName') || undefined,
          disorderType: 'epilepsy',
          title: 'Epilepsy questionnaire',
          responses,
          metadata: { source: 'frontend', formVersion: 'v1' }
        };

        const res = await fetch('http://localhost:5000/api/disorders/questionnaire', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });

        if (res.status === 401) {
          setSnack({ open: true, message: 'Please login to save questionnaire', severity: 'warning' });
          try { localStorage.setItem('epilepsy_questionnaire', JSON.stringify(form)); } catch (err) {}
          navigate(`/assessment?disorder=epilepsy`);
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Failed to save questionnaire', err);
          setSnack({ open: true, message: 'Failed to save questionnaire (saved locally)', severity: 'error' });
          try { localStorage.setItem('epilepsy_questionnaire', JSON.stringify(form)); } catch (err2) {}
          navigate(`/assessment?disorder=epilepsy`);
          return;
        }

        // persist a marker so the Assessment page knows the questionnaire was completed
        const savedResp = await res.json().catch(() => null);
        try {
          localStorage.setItem('epilepsy_questionnaire', JSON.stringify({ saved: true, savedAt: Date.now(), backend: savedResp }));
        } catch (e) {
          console.warn('Failed to persist epilepsy_questionnaire flag locally', e);
        }
        setSnack({ open: true, message: 'Questionnaire saved', severity: 'success' });
        navigate(`/assessment?disorder=epilepsy`);
      } catch (err) {
        console.error('Submit error', err);
        setSnack({ open: true, message: 'Submit failed — saved locally', severity: 'error' });
        try { localStorage.setItem('epilepsy_questionnaire', JSON.stringify(form)); } catch (e) {}
        navigate(`/assessment?disorder=epilepsy`);
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleCloseSnack = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnack((s) => ({ ...s, open: false }));
  };

  const handleSkip = () => {
    try { localStorage.setItem('epilepsy_questionnaire_skipped', 'true'); } catch (e) {}
    navigate(`/assessment?disorder=epilepsy`);
  };

  // compute progress based on required fields (keeps validation unchanged)
  const requiredKeys = ['name','age','sex','dominantHand','contact','knownDiagnosis','longTermMedication','headInjury'];
  const filledCount = requiredKeys.reduce((acc, k) => {
    const v = form[k];
    if (k === 'age') {
      const n = Number(v);
      return acc + (v !== '' && !Number.isNaN(n) && n >= 1 ? 1 : 0);
    }
    return acc + (v !== '' && v !== null && typeof v !== 'undefined' ? 1 : 0);
  }, 0);
  const progressPercent = Math.round((filledCount / requiredKeys.length) * 100);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, px: 2, background: 'linear-gradient(180deg, rgba(249,255,241,0.45), rgba(255,245,252,0.25))', borderRadius: 2 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>{t('title')}</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>{t('subtitle')}</Typography>

      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(16,24,40,0.04)',
          boxShadow: '0 8px 24px rgba(16,24,40,0.06)',
          backdropFilter: 'saturate(150%) blur(6px)'
        }}
        elevation={6}
        component="form"
        onSubmit={handleSubmit}
      >
        <ProgressBar percent={progressPercent} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <FormControl component="fieldset" sx={{ mr: 2 }}>
            <FormLabel component="legend" sx={{ fontSize: computedFontSize, mb: 0.5 }}>{t('fontSizeLabel')}</FormLabel>
            <RadioGroup row value={fontSizeKey} onChange={(e) => setFontSizeKey(e.target.value)} aria-label="font-size">
              <FormControlLabel value="small" control={<Radio />} label={t('small')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              <FormControlLabel value="medium" control={<Radio />} label={t('medium')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              <FormControlLabel value="large" control={<Radio />} label={t('large')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset">
            <RadioGroup row value={lang} onChange={(e) => setLang(e.target.value)} aria-label="language">
              <FormControlLabel value="en" control={<Radio />} label="English" sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              <FormControlLabel value="hi" control={<Radio />} label="हिन्दी" sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
            </RadioGroup>
          </FormControl>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label={t('name')}
              value={form.name}
              onChange={(e) => { update('name', e.target.value); validateField('name', e.target.value); }}
              required
              fullWidth
              error={Boolean(errors.name)}
              helperText={errors.name}
              InputLabelProps={{ sx: { fontSize: computedFontSize } }}
              sx={{ '& .MuiInputBase-input': { fontSize: computedFontSize }, '& .MuiInputBase-input::placeholder': { fontSize: computedFontSize } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label={t('age')}
              type="number"
              value={form.age}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') { update('age',''); validateField('age',''); return; }
                const n = Number(v);
                if (Number.isNaN(n)) { update('age', v); validateField('age', v); return; }
                const final = n < 1 ? 1 : n;
                update('age', final);
                validateField('age', final);
              }}
              inputProps={{ min: 1 }}
              required
              fullWidth
              error={Boolean(errors.age)}
              helperText={errors.age}
              InputLabelProps={{ sx: { fontSize: computedFontSize } }}
              sx={{ '& .MuiInputBase-input': { fontSize: computedFontSize } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label={t('sex')}
              value={form.sex}
              onChange={(e) => { update('sex', e.target.value); validateField('sex', e.target.value); }}
              placeholder="M / F / Other"
              required
              fullWidth
              error={Boolean(errors.sex)}
              helperText={errors.sex}
              InputLabelProps={{ sx: { fontSize: computedFontSize } }}
              sx={{ '& .MuiInputBase-input': { fontSize: computedFontSize }, '& .MuiInputBase-input::placeholder': { fontSize: computedFontSize } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl component="fieldset" error={Boolean(errors.dominantHand)} fullWidth>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('dominantHand')} {' *'}</FormLabel>
                <ReadAloudButton text={t('dominantHand')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <RadioGroup row value={form.dominantHand} onChange={(e) => { update('dominantHand', e.target.value); validateField('dominantHand', e.target.value); }} aria-label="dominant-hand">
                <FormControlLabel value="Right" control={<Radio />} label={t('right')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="Left" control={<Radio />} label={t('left')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              </RadioGroup>
              <FormHelperText sx={{ fontSize: computedFontSize }}>{errors.dominantHand}</FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label={t('contact')}
              value={form.contact}
              onChange={handleContactChange}
              required
              fullWidth
              error={Boolean(errors.contact)}
              helperText={errors.contact}
              InputLabelProps={{ sx: { fontSize: computedFontSize } }}
              inputProps={{ inputMode: 'numeric', pattern: '\\d*', maxLength: 10 }}
              sx={{ '& .MuiInputBase-input': { fontSize: computedFontSize }, '& .MuiInputBase-input::placeholder': { fontSize: computedFontSize } }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl component="fieldset" required aria-required="true" error={Boolean(errors.knownDiagnosis)} fullWidth>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('knownDiagnosis')}</FormLabel>
                <ReadAloudButton text={t('knownDiagnosis')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <RadioGroup row value={form.knownDiagnosis} onChange={(e) => { update('knownDiagnosis', e.target.value); validateField('knownDiagnosis', e.target.value); }}>
                <FormControlLabel value="yes" control={<Radio />} label={t('yes')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="no" control={<Radio />} label={t('no')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="notsure" control={<Radio />} label={t('notsure')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              </RadioGroup>
              <FormHelperText sx={{ fontSize: computedFontSize }}>{errors.knownDiagnosis}</FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl component="fieldset" required aria-required="true" error={Boolean(errors.longTermMedication)} fullWidth>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('longTermMedication')}</FormLabel>
                <ReadAloudButton text={t('longTermMedication')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <RadioGroup row value={form.longTermMedication} onChange={(e) => { update('longTermMedication', e.target.value); validateField('longTermMedication', e.target.value); }}>
                <FormControlLabel value="yes" control={<Radio />} label={t('yes')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="no" control={<Radio />} label={t('no')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              </RadioGroup>
              <FormHelperText sx={{ fontSize: computedFontSize }}>{errors.longTermMedication}</FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl component="fieldset" required aria-required="true" error={Boolean(errors.headInjury)} fullWidth>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('headInjury')}</FormLabel>
                <ReadAloudButton text={t('headInjury')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <RadioGroup row value={form.headInjury} onChange={(e) => { update('headInjury', e.target.value); validateField('headInjury', e.target.value); }}>
                <FormControlLabel value="yes" control={<Radio />} label={t('yes')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="no" control={<Radio />} label={t('no')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="notsure" control={<Radio />} label={t('notsure')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              </RadioGroup>
              <FormHelperText sx={{ fontSize: computedFontSize }}>{errors.headInjury}</FormHelperText>
            </FormControl>
          </Grid>

          <Divider sx={{ my: 1 }} />

          <Grid item xs={12}>
            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('lostAwareness')}</FormLabel>
                <ReadAloudButton text={t('lostAwareness')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="lostAwareness" value={form.lostAwareness} onChange={(v) => update('lostAwareness', v)} fontSize={computedFontSize} labels={{ yes: t('yes'), no: t('no'), notsure: t('notsure') }} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('observedStaring')}</FormLabel>
                <ReadAloudButton text={t('observedStaring')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="observedStaring" value={form.observedStaring} onChange={(v) => update('observedStaring', v)} fontSize={computedFontSize} labels={{ yes: t('yes'), no: t('no'), notsure: t('notsure') }} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('unusualSensations')}</FormLabel>
                <ReadAloudButton text={t('unusualSensations')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <RadioGroup row name="unusualSensations" value={form.unusualSensations} onChange={(e) => update('unusualSensations', e.target.value)}>
                <FormControlLabel value="yes" control={<Radio />} label={t('yes')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="no" control={<Radio />} label={t('no')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="notsure" control={<Radio />} label={t('notsure')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              </RadioGroup>
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('motorActivityReported')}</FormLabel>
                <ReadAloudButton text={t('motorActivityReported')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="motorActivityReported" value={form.motorActivityReported} onChange={(v) => update('motorActivityReported', v)} fontSize={computedFontSize} labels={{ yes: t('yes'), no: t('no'), notsure: t('notsure') }} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('postEpisodeSymptoms')}</FormLabel>
                <ReadAloudButton text={t('postEpisodeSymptoms')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <NeverSometimesOften name="postEpisodeSymptoms" value={form.postEpisodeSymptoms} onChange={(v) => update('postEpisodeSymptoms', v)} fontSize={computedFontSize} labels={{ never: t('never'), sometimes: t('sometimes'), often: t('often') }} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('priorSeizureDiagnosis')}</FormLabel>
                <ReadAloudButton text={t('priorSeizureDiagnosis')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="priorSeizureDiagnosis" value={form.priorSeizureDiagnosis} onChange={(v) => update('priorSeizureDiagnosis', v)} fontSize={computedFontSize} labels={{ yes: t('yes'), no: t('no'), notsure: t('notsure') }} />
            </FormControl>
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
            <Button type="submit" variant="contained" disabled={!isFormFilled() || loading} startIcon={loading ? <CircularProgress size={18} /> : null}>
              {loading ? 'Submitting...' : t('submit')}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/select-disorder')}>{t('back')}</Button>
            {DEBUG && (
              <Button variant="text" color="warning" onClick={handleSkip} sx={{ ml: 1 }}>
                Skip (debug)
              </Button>
            )}
          </Grid>
          <Snackbar open={snack.open} autoHideDuration={4000} onClose={handleCloseSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <Alert onClose={handleCloseSnack} severity={snack.severity} sx={{ width: '100%' }}>
              {snack.message}
            </Alert>
          </Snackbar>
        </Grid>
      </Paper>
    </Box>
  );
};

export default EpilepsyQuestionnaire;
