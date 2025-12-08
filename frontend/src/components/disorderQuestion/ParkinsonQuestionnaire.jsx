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
  FormHelperText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ReadAloudButton from './ReadAloudButton';
import ProgressBar from './ProgressBar';
import { Snackbar, Alert, CircularProgress } from '@mui/material';

const YesNoSometimes = ({ name, value, onChange, fontSize, labels = { yes: 'Yes', no: 'No', sometimes: 'Sometimes' } }) => (
  <FormControl component="fieldset" sx={{ my: 1 }}>
    <RadioGroup row name={name} value={value} onChange={(e) => onChange(e.target.value)}>
      <FormControlLabel value="yes" control={<Radio />} label={labels.yes} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
      <FormControlLabel value="no" control={<Radio />} label={labels.no} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
      <FormControlLabel value="sometimes" control={<Radio />} label={labels.sometimes} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
    </RadioGroup>
  </FormControl>
);

const ParkinsonQuestionnaire = () => {
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
    // Parkinson's core questions
    tremorAtRest: '',
    movementsSlower: '',
    stiffness: '',
    fineTasksDifficulty: '',
    walkingUnsteady: '',
    balanceIssues: '',
    voiceChange: ''
  });

  // font size state (small | medium | large) persisted to localStorage
  const [fontSizeKey, setFontSizeKey] = useState('medium');
  useEffect(() => {
    try {
      const v = localStorage.getItem('parkinsons_font_size');
      if (v === 'small' || v === 'medium' || v === 'large') setFontSizeKey(v);
    } catch (err) {
      // ignore
    }
  }, []);
  useEffect(() => {
    try { localStorage.setItem('parkinsons_font_size', fontSizeKey); } catch (err) { /* ignore */ }
  }, [fontSizeKey]);

  const sizeMap = {
    small: '0.9rem',
    medium: '1rem',
    large: '1.3rem'
  };
  const computedFontSize = sizeMap[fontSizeKey] || sizeMap.medium;

  // language state (en | hi) persisted to localStorage
  const [lang, setLang] = useState('en');
  useEffect(() => {
    try {
      const v = localStorage.getItem('parkinsons_language');
      if (v === 'en' || v === 'hi') setLang(v);
    } catch (err) { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem('parkinsons_language', lang); } catch (err) { /* ignore */ } }, [lang]);

  const translations = {
    en: {
      title: "Parkinson's Questionnaire",
      subtitle: 'Please complete the mandatory information and answer the screening questions below.',
      fontSizeLabel: 'Font size', small: 'Small', medium: 'Medium', large: 'Large',
      name: 'Name', age: 'Age', sex: 'Sex', dominantHand: 'Dominant Hand', right: 'Right', left: 'Left', contact: 'Contact / Caregiver (if any)',
      knownDiagnosis: 'Any known neurological diagnosis? *', longTermMedication: 'On long-term medication? *', headInjury: 'Any history of head injury or loss of consciousness? *',
      tremorAtRest: 'Have you noticed shaking or trembling of your hands while resting?', movementsSlower: 'Do your movements feel slower than before?', stiffness: 'Do you feel stiffness in your arms or legs affecting movement?', fineTasksDifficulty: 'Any difficulty with fine tasks like writing or buttoning clothes?', walkingUnsteady: 'Have you felt unsteady, taken smaller steps, or dragged your feet recently?',
      balanceIssues: 'Have you experienced any near-falls or balance issues?', voiceChange: 'Has your voice become softer or more monotone over time?',
      never: 'Never', sometimes: 'Sometimes', often: 'Often', yes: 'Yes', no: 'No', notsure: 'Not sure',
      submit: 'Submit and Continue', back: 'Back'
    },
    hi: {
      title: 'पार्किनसन का प्रश्नावली',
      subtitle: 'कृपया नीचे दी गई अनिवार्य जानकारी भरें और स्क्रीनिंग से जुड़े प्रश्नों के उत्तर दें।',
      fontSizeLabel: 'फ़ॉन्ट आकार', small: 'छोटा', medium: 'मध्यम', large: 'बड़ा',
      name: 'नाम', age: 'आयु', sex: 'लिंग', dominantHand: 'मुख्य हाथ', right: 'दायाँ', left: 'बायाँ', contact: 'संपर्क / देखभालकर्ता (यदि कोई हो)',
      knownDiagnosis: 'क्या आपको किसी ज्ञात तंत्रिका संबंधी (न्यूरोलॉजिकल) समस्या का निदान हुआ है?', longTermMedication: 'क्या आप लंबे समय से दवाइयाँ ले रहे हैं?', headInjury: 'क्या आपको सिर में चोट लगी है या कभी बेहोशी हुई है?',
      tremorAtRest: 'क्या आपने आराम करते समय हाथों में कंपकंपी या कंपन महसूस किया है?', movementsSlower: 'क्या आपकी हरकतें पहले से धीमी महसूस होती हैं?', stiffness: 'क्या आपके हाथों या पैरों में जकड़न महसूस होती है जो हरकत को प्रभावित करती है?', fineTasksDifficulty: 'क्या आपको लिखने, बटन लगाने या ऐसे छोटे कामों में परेशानी होती है?',
      walkingUnsteady: 'क्या हाल ही में चलने में लड़खड़ाहट, छोटे कदम पड़ना या पैर घसीटते हुए चलने जैसी समस्या हुई है?',
      balanceIssues: 'क्या आपको संतुलन बिगड़ने या लगभग गिरने जैसी स्थिति का अनुभव हुआ है?', voiceChange: 'क्या आपकी आवाज़ समय के साथ धीमी या एक-सा सुर (एक-रंगी) हो गई है?',
      never: 'कभी नहीं', sometimes: 'कभी-कभी', often: 'अक्सर', yes: 'हाँ', no: 'नहीं', notsure: 'पता नहीं',
      submit: 'जमा करें और आगे बढ़ें', back: ' वापस'
    }
  };

  const t = (key) => (translations[lang] && translations[lang][key]) || translations.en[key] || key;

  const update = (key, value) => setForm((s) => ({ ...s, [key]: value }));

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });

  const DEBUG = (import.meta.env && import.meta.env.VITE_DEBUG === 'true') || false;

  const validateField = (key, value) => {
    let msg = '';
    if (['name', 'age', 'sex', 'dominantHand', 'contact', 'knownDiagnosis', 'longTermMedication', 'headInjury'].includes(key)) {
      if (value === '' || value === null || typeof value === 'undefined') {
        msg = 'This field is required';
      }
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

  const isFormValid = () => {
    const requiredKeys = ['name','age','sex','dominantHand','contact','knownDiagnosis','longTermMedication','headInjury'];
    let ok = true;
    requiredKeys.forEach(k => {
      const valid = validateField(k, form[k]);
      if (!valid) ok = false;
    });
    return ok;
  };

  // compute progress based on required fields (do not change validation)
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

  // Non-mutating quick check used for disabling the submit button
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
          disorderType: 'parkinsons',
          title: "Parkinson's questionnaire",
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
          // still save locally as fallback
          try { localStorage.setItem('parkinsons_questionnaire', JSON.stringify(form)); } catch (err) {}
          navigate(`/assessment?disorder=parkinsons`);
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('Failed to save questionnaire', err);
          setSnack({ open: true, message: 'Failed to save questionnaire (saved locally)', severity: 'error' });
          try { localStorage.setItem('parkinsons_questionnaire', JSON.stringify(form)); } catch (err2) {}
          navigate(`/assessment?disorder=parkinsons`);
          return;
        }

        // persist a marker so the Assessment page knows the questionnaire was completed
        const savedResp = await res.json().catch(() => null);
        try {
          localStorage.setItem('parkinsons_questionnaire', JSON.stringify({ saved: true, savedAt: Date.now(), backend: savedResp }));
        } catch (e) {
          console.warn('Failed to persist parkinsons_questionnaire flag locally', e);
        }
        setSnack({ open: true, message: 'Questionnaire saved', severity: 'success' });
        // success
        navigate(`/assessment?disorder=parkinsons`);
      } catch (err) {
        console.error('Submit error', err);
        setSnack({ open: true, message: 'Submit failed — saved locally', severity: 'error' });
        try { localStorage.setItem('parkinsons_questionnaire', JSON.stringify(form)); } catch (e) {}
        navigate(`/assessment?disorder=parkinsons`);
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
    try { localStorage.setItem('parkinsons_questionnaire_skipped', 'true'); } catch (e) {}
    navigate(`/assessment?disorder=parkinsons`);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, px: 2, background: 'linear-gradient(180deg, rgba(236,251,255,0.4), rgba(255,244,250,0.25))', borderRadius: 2 }}>
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
        {/* Font size selector (left) and language toggle (right) inside the questionnaire container */}
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
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('dominantHand')}{' *'}</FormLabel>
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

          <Divider sx={{ my: 1 }} />

          <Grid item xs={12}>
            <FormControl component="fieldset" error={Boolean(errors.knownDiagnosis)} fullWidth>
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
            <FormControl component="fieldset" error={Boolean(errors.longTermMedication)} fullWidth>
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
            <FormControl component="fieldset" error={Boolean(errors.headInjury)} fullWidth>
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
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('tremorAtRest')}</FormLabel>
                <ReadAloudButton text={t('tremorAtRest')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="tremorAtRest" value={form.tremorAtRest} onChange={(v) => update('tremorAtRest', v)} fontSize={computedFontSize} labels={{ yes: t('yes'), no: t('no'), sometimes: t('sometimes') }} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('movementsSlower')}</FormLabel>
                <ReadAloudButton text={t('movementsSlower')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="movementsSlower" value={form.movementsSlower} onChange={(v) => update('movementsSlower', v)} fontSize={computedFontSize} labels={{ yes: t('yes'), no: t('no'), sometimes: t('sometimes') }} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('stiffness')}</FormLabel>
                <ReadAloudButton text={t('stiffness')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="stiffness" value={form.stiffness} onChange={(v) => update('stiffness', v)} fontSize={computedFontSize} labels={{ yes: t('yes'), no: t('no'), sometimes: t('sometimes') }} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('fineTasksDifficulty')}</FormLabel>
                <ReadAloudButton text={t('fineTasksDifficulty')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="fineTasksDifficulty" value={form.fineTasksDifficulty} onChange={(v) => update('fineTasksDifficulty', v)} fontSize={computedFontSize} labels={{ yes: t('yes'), no: t('no'), sometimes: t('sometimes') }} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('walkingUnsteady')}</FormLabel>
                <ReadAloudButton text={t('walkingUnsteady')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="walkingUnsteady" value={form.walkingUnsteady} onChange={(v) => update('walkingUnsteady', v)} fontSize={computedFontSize} labels={{ yes: t('yes'), no: t('no'), sometimes: t('sometimes') }} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('balanceIssues')}</FormLabel>
                <ReadAloudButton text={t('balanceIssues')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <RadioGroup row name="balanceIssues" value={form.balanceIssues} onChange={(e) => update('balanceIssues', e.target.value)}>
                <FormControlLabel value="never" control={<Radio />} label={t('never')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="sometimes" control={<Radio />} label={t('sometimes')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="often" control={<Radio />} label={t('often')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              </RadioGroup>
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('voiceChange')}</FormLabel>
                <ReadAloudButton text={t('voiceChange')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <RadioGroup row name="voiceChange" value={form.voiceChange} onChange={(e) => update('voiceChange', e.target.value)}>
                <FormControlLabel value="yes" control={<Radio />} label={t('yes')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="no" control={<Radio />} label={t('no')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="notsure" control={<Radio />} label={t('notsure')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              </RadioGroup>
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

export default ParkinsonQuestionnaire;
