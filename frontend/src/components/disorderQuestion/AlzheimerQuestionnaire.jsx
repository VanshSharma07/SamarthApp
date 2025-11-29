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

const YesNoSometimes = ({ name, value, onChange, fontSize, labels = { yes: 'Yes', no: 'No', sometimes: 'Sometimes' } }) => (
  <FormControl component="fieldset" sx={{ my: 1 }}>
    <RadioGroup row name={name} value={value} onChange={(e) => onChange(e.target.value)}>
      <FormControlLabel value="yes" control={<Radio />} label={labels.yes} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
      <FormControlLabel value="no" control={<Radio />} label={labels.no} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
      <FormControlLabel value="sometimes" control={<Radio />} label={labels.sometimes} sx={{ '& .MuiFormControlLabel-label': { fontSize } }} />
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

const AlzheimerQuestionnaire = () => {
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
    // Alzheimer-specific
    memoryRecent: '', // Never/Sometimes/Often
    misplaceItems: '', // Yes/No/Not sure
    findWords: '', // Yes/No/Sometimes
    slowerThinking: '', // Yes/No/Sometimes
    confusedDates: '', // Never/Sometimes/Often
    routineTasks: '' // Yes/No/Sometimes
  });

  const [errors, setErrors] = useState({});

  // font size state persisted to localStorage
  const [fontSizeKey, setFontSizeKey] = useState('medium');
  useEffect(() => {
    try {
      const v = localStorage.getItem('alzheimers_font_size');
      if (v === 'small' || v === 'medium' || v === 'large') setFontSizeKey(v);
    } catch (err) { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem('alzheimers_font_size', fontSizeKey); } catch (err) { /* ignore */ } }, [fontSizeKey]);

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
      const v = localStorage.getItem('alzheimers_language');
      if (v === 'en' || v === 'hi') setLang(v);
    } catch (err) { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem('alzheimers_language', lang); } catch (err) { /* ignore */ } }, [lang]);

  const translations = {
    en: {
      title: "Alzheimer's Questionnaire",
      subtitle: 'Please complete the questionnaire below. Fields marked required must be filled before continuing.',
      fontSizeLabel: 'Font size', small: 'Small', medium: 'Medium', large: 'Large',
      name: 'Name', age: 'Age', sex: 'Sex', sexPlaceholder: 'M / F / Other', dominantHand: 'Dominant Hand', right: 'Right', left: 'Left', contact: 'Contact / Caregiver (if any)',
      knownDiagnosis: 'Any known neurological diagnosis?', longTermMedication: 'On long-term medication?', headInjury: 'Any history of head injury or loss of consciousness?',
      memoryRecent: 'Do you have difficulty remembering recent conversations or events?',
      misplaceItems: 'Do you misplace items more frequently than before?', findWords: 'Do you struggle to find the right words while speaking?',
      slowerThinking: 'Do you feel slower in thinking, planning, or making decisions?', confusedDates: 'Have you felt confused about the day, date, or familiar places?',
      routineTasks: 'Any difficulty managing routine tasks (money, medicines, appliances)?',
      yes: 'Yes', no: 'No', sometimes: 'Sometimes', never: 'Never', notsure: 'Not sure', often: 'Often',
      submit: 'Submit and Continue', back: 'Back'
    },
    hi: {
      title: "अल्ज़ाइमर का प्रश्नावली",
      subtitle: 'कृपया नीचे दिए गए प्रश्नावली को पूरा करें। जिन स्थानों पर ‘‘ चिन्ह है, उन्हें भरना आवश्यक है।*',
      fontSizeLabel: 'फ़ॉन्ट आकार', small: 'छोटा', medium: 'मध्यम', large: 'बड़ा',
      name: 'नाम', age: 'आयु', sex: 'लिंग', sexPlaceholder: 'पुरुष / महिला / अन्य', dominantHand: 'मुख्य हाथ', right: 'दायाँ', left: 'बायाँ', contact: 'संपर्क / देखभालकर्ता (यदि कोई हो)',
      knownDiagnosis: 'क्या आपको किसी तंत्रिका संबंधी (न्यूरोलॉजिकल) बीमारी का पहले से निदान हुआ है?',
      longTermMedication: 'क्या आप लंबे समय से नियमित दवाइयाँ ले रहे हैं?',
      headInjury: 'क्या आपको सिर में चोट लगी है या कभी बेहोशी हुई है?',
      memoryRecent: 'क्या आपको हाल की बातचीत या घटनाएँ याद रखने में कठिनाई होती है?',
      misplaceItems: 'क्या आप पहले की तुलना में चीज़ें ज़्यादा भूल जाते हैं या कहीं रखकर भूल जाते हैं?',
      findWords: 'क्या आपको बोलते समय सही शब्द खोजने में कठिनाई होती है?',
      slowerThinking: 'क्या आपको सोचने, योजना बनाने या निर्णय लेने में धीमापन महसूस होता है?',
      confusedDates: 'क्या आपको दिन, तारीख या परिचित जगहों के बारे में भ्रम महसूस हुआ है?',
      routineTasks: 'क्या आपको रोज़मर्रा के काम जैसे पैसे संभालना, दवाइयाँ लेना या घरेलू उपकरण चलाने में परेशानी होती है?',
      yes: 'हाँ', no: 'नहीं', sometimes: 'कभी-कभी', never: 'कभी नहीं', notsure: 'पता नहीं', often: 'अक्सर',
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
    try {
      localStorage.setItem('alzheimers_questionnaire', JSON.stringify(form));
    } catch (err) {
      console.warn('Failed to save questionnaire locally', err);
    }
    navigate(`/assessment?disorder=alzheimers`);
  };

  // compute progress based on required fields (do not change validation rules)
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
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, px: 2, background: 'linear-gradient(180deg, rgba(252,243,255,0.45), rgba(240,255,250,0.18))', borderRadius: 2 }}>
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
              placeholder={t('sexPlaceholder') || 'M / F / Other'}
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
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('memoryRecent')}</FormLabel>
                <ReadAloudButton text={t('memoryRecent')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <NeverSometimesOften name="memoryRecent" value={form.memoryRecent} onChange={(v) => update('memoryRecent', v)} fontSize={computedFontSize} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('misplaceItems')}</FormLabel>
                <ReadAloudButton text={t('misplaceItems')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <RadioGroup row name="misplaceItems" value={form.misplaceItems} onChange={(e) => update('misplaceItems', e.target.value)}>
                <FormControlLabel value="yes" control={<Radio />} label={t('yes')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="no" control={<Radio />} label={t('no')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
                <FormControlLabel value="notsure" control={<Radio />} label={t('notsure')} sx={{ '& .MuiFormControlLabel-label': { fontSize: computedFontSize } }} />
              </RadioGroup>
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('findWords')}</FormLabel>
                <ReadAloudButton text={t('findWords')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="findWords" value={form.findWords} onChange={(v) => update('findWords', v)} fontSize={computedFontSize} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('slowerThinking')}</FormLabel>
                <ReadAloudButton text={t('slowerThinking')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="slowerThinking" value={form.slowerThinking} onChange={(v) => update('slowerThinking', v)} fontSize={computedFontSize} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('confusedDates')}</FormLabel>
                <ReadAloudButton text={t('confusedDates')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <NeverSometimesOften name="confusedDates" value={form.confusedDates} onChange={(v) => update('confusedDates', v)} fontSize={computedFontSize} />
            </FormControl>

            <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormLabel component="legend" sx={{ fontSize: computedFontSize }}>{t('routineTasks')}</FormLabel>
                <ReadAloudButton text={t('routineTasks')} lang={lang} fontSize={computedFontSize} />
              </Box>
              <YesNoSometimes name="routineTasks" value={form.routineTasks} onChange={(v) => update('routineTasks', v)} fontSize={computedFontSize} />
            </FormControl>
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Button type="submit" variant="contained" disabled={!isFormFilled()}>{t('submit')}</Button>
            <Button variant="outlined" onClick={() => navigate('/select-disorder')}>
              {t('back')}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AlzheimerQuestionnaire;
