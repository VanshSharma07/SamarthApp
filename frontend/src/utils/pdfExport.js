import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Export AI analysis results to PDF
 * @param {Object} analysisData - The AI analysis data
 * @param {string} patientName - Patient name for the PDF
 * @returns {void} - Triggers a PDF download
 */
export const exportAiAnalysisToPdf = async (analysisData, patientName = 'Patient', returnBuffer = false) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const date = new Date().toLocaleDateString();
    
    // Document title
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text('AI Neurological Assessment Report', pageWidth / 2, 20, { align: 'center' });
    
    // Document metadata
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Patient: ${patientName}`, 20, 30);
    doc.text(`Date: ${date}`, 20, 37);
    doc.text(`Report ID: ${generateReportId()}`, 20, 44);
    
    // Overall assessment
    if (analysisData.overallAssessment) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Overall Assessment', 20, 55);
      
      doc.setFontSize(11);
      const splitText = doc.splitTextToSize(analysisData.overallAssessment, pageWidth - 40);
      doc.text(splitText, 20, 62);
    }
    
    // Conditions section - Parkinson's
    let yPos = doc.previousAutoTable ? doc.previousAutoTable.finalY + 15 : 80;
    addDisorderSection(doc, 'Parkinson\'s Disease Assessment', analysisData.parkinsonsDisease, yPos);
    
    // Conditions section - Alzheimer's
    yPos = doc.previousAutoTable ? doc.previousAutoTable.finalY + 15 : doc.previousAutoTable.finalY + 10;
    addDisorderSection(doc, 'Alzheimer\'s Disease Assessment', analysisData.alzheimersDisease, yPos);
    
    // Conditions section - Epilepsy
    yPos = doc.previousAutoTable ? doc.previousAutoTable.finalY + 15 : doc.previousAutoTable.finalY + 10;
    addDisorderSection(doc, 'Epilepsy Assessment', analysisData.epilepsy, yPos);
    
    // Disclaimer
    yPos = doc.previousAutoTable ? doc.previousAutoTable.finalY + 15 : doc.previousAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    const disclaimer = analysisData.disclaimerNote || 
      "This is an automated AI analysis and should not replace professional medical diagnosis.";
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 40);
    doc.text(splitDisclaimer, 20, yPos);
    
    // Save the document
    if (returnBuffer) {
      const pdfBuffer = doc.output('arraybuffer');
      return pdfBuffer; // Return the buffer for email sending
    } else {
      doc.save(`neurological_assessment_${formatForFilename(patientName)}_${formatDate()}.pdf`);
    }
    
    console.log('AI Analysis PDF generated successfully');
    return true;
  } catch (error) {
    console.error('Error exporting AI analysis to PDF:', error);
    throw error;
  }
};

/**
 * Export assessment data to PDF
 * @param {string} userId - The user ID
 * @param {Object} assessmentData - The assessment data
 * @returns {boolean} - Whether the export was successful
 */
export const exportAssessmentReportToPdf = async (userId, assessmentData, returnBuffer = false) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const date = new Date().toLocaleDateString();
    
    // Document title
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text('Samarth Health Assessment Report', pageWidth / 2, 20, { align: 'center' });
    
    // Document metadata
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Patient ID: ${userId}`, 20, 30);
    doc.text(`Date: ${date}`, 20, 37);
    doc.text(`Report ID: ${generateReportId()}`, 20, 44);
    
    // Summary section
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Assessment Summary', 20, 60);
    
    // Create a summary table
    const tableData = [];
    let yPos = 70;
    
    // Add rows for each assessment type
    Object.entries(assessmentData).forEach(([type, data]) => {
      if (!data) return;
      
      const displayName = getAssessmentDisplayName(type);
      const date = data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'N/A';
      let metrics = 'No metrics available';
      const normalizedType = String(type).trim().toLowerCase();
      
      if (data.metrics) {
        // Format metrics based on assessment type
        switch (normalizedType) {
          case 'tremor':
            metrics = `Severity: ${data.metrics.severity || 'N/A'}, Frequency: ${data.metrics.tremor_frequency || 'N/A'} Hz`;
            break;
          case 'speech':
          case 'speechpattern':
          case 'speech_pattern':
            metrics = `Clarity: ${data.metrics.clarity?.score || 'N/A'}/10, Overall: ${data.metrics.overallScore || 'N/A'}/10`;
            break;
          case 'responsetime':
          case 'response_time':
            metrics = `Avg Response: ${data.metrics.averageResponseTime || 'N/A'} ms`;
            break;
          case 'gaitanalysis': {
            const stability = data.metrics.stability?.score ?? data.metrics.stability ?? data.metrics.overall?.stabilityScore ?? 'N/A';
            const speed = data.metrics.gait?.speed ?? data.metrics.walkingSpeed ?? 'N/A';
            const cadence = data.metrics.gait?.cadence ?? data.metrics.cadence ?? 'N/A';
            metrics = `Stability: ${stability}, Speed: ${speed}, Cadence: ${cadence}`;
            break;
          }
          case 'gait_analysis': {
            const stability = data.metrics.stability?.score ?? data.metrics.stability ?? data.metrics.overall?.stabilityScore ?? 'N/A';
            const speed = data.metrics.gait?.speed ?? data.metrics.walkingSpeed ?? 'N/A';
            const cadence = data.metrics.gait?.cadence ?? data.metrics.cadence ?? 'N/A';
            metrics = `Stability: ${stability}, Speed: ${speed}, Cadence: ${cadence}`;
            break;
          }
          default:
            metrics = 'See details below';
        }
      }
      
      tableData.push([displayName, date, metrics]);
    });
    
    // Draw table if there's data
    if (tableData.length > 0) {
      doc.autoTable({
        startY: yPos,
        head: [['Assessment Type', 'Date', 'Key Metrics']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 51, 102],
          textColor: [255, 255, 255]
        },
        styles: {
          overflow: 'linebreak',
        },
      });
      
      yPos = doc.previousAutoTable.finalY + 20;
    }
    
    // Add detailed sections for each assessment type
    Object.entries(assessmentData).forEach(([type, data]) => {
      if (!data) return;
      
      // Check if we need a new page
      if (yPos > doc.internal.pageSize.getHeight() - 100) {
        doc.addPage();
        yPos = 20;
      }
      
      const displayName = getAssessmentDisplayName(type);
      
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text(`${displayName} Assessment`, 20, yPos);
      
      yPos += 10;
      
      // Add assessment-specific data
      if (data.metrics) {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        // Recursively flatten nested metrics so detailed gait parameters are fully included
        const flattenedMetrics = flattenMetrics(data.metrics);
        const metricsData = flattenedMetrics.map(({ key, value }) => [formatMetricPath(key), value]);
        
        if (metricsData.length > 0) {
          doc.autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: metricsData,
            theme: 'grid',
            headStyles: {
              fillColor: [220, 220, 220],
              textColor: [0, 0, 0]
            },
            styles: {
              overflow: 'linebreak',
            },
          });
          
          yPos = doc.previousAutoTable.finalY + 15;
        }
      }
    });
    
    // Add disclaimer
    if (yPos > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    const disclaimer = "This assessment report is intended for informational purposes only and should not replace professional medical advice. Please consult with a healthcare professional for proper diagnosis and treatment.";
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 40);
    doc.text(splitDisclaimer, 20, doc.internal.pageSize.getHeight() - 30);
    
    // Save the document
    if (returnBuffer) {
      return doc.output('arraybuffer'); // Return buffer instead of downloading
    }
    
    doc.save(`samarth_assessment_report_${userId}_${formatDate()}.pdf`);
    
    console.log('Assessment Report PDF generated successfully');
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

/**
 * Add a disorder assessment section to the PDF
 * @param {Object} doc - jsPDF document instance
 * @param {string} title - Section title
 * @param {Object} data - Disorder data
 * @param {number} yPosition - Y position to start drawing
 */
function addDisorderSection(doc, title, data, yPosition) {
  if (!data) return;
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 20, yPosition);
  
  // Risk level
  const riskLevelText = `Risk Level: ${data.riskLevel?.toUpperCase() || 'Unknown'}`;
  const confidenceText = data.confidence ? `Confidence: ${data.confidence}%` : '';
  
  const tableData = [];
  
  // Add indicators
  if (data.indicators && data.indicators.length > 0) {
    tableData.push(['Indicators']);
    data.indicators.forEach(indicator => {
      tableData.push([`• ${indicator}`]);
    });
  }
  
  // Add recommendations
  if (data.recommendations && data.recommendations.length > 0) {
    tableData.push(['Recommendations']);
    data.recommendations.forEach(rec => {
      tableData.push([`• ${rec}`]);
    });
  }
  
  // Draw table
  doc.autoTable({
    startY: yPosition + 5,
    head: [[`${riskLevelText}    ${confidenceText}`]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: data.riskLevel === 'high' ? [220, 53, 69] : 
                 data.riskLevel === 'moderate' ? [255, 193, 7] : 
                 [25, 135, 84],
      textColor: data.riskLevel === 'moderate' ? [0, 0, 0] : [255, 255, 255]
    },
    styles: {
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 'auto' }
    }
  });
}

/**
 * Get a user-friendly name for an assessment type
 * @param {string} type - The assessment type
 * @returns {string} - The display name
 */
function getAssessmentDisplayName(type) {
  const displayNames = {
    tremor: 'Tremor',
    speech: 'Speech Pattern',
    speechPattern: 'Speech Pattern',
    responseTime: 'Response Time',
    neckMobility: 'Neck Mobility',
    gait: 'Gait Analysis',
    gaitAnalysis: 'Gait Analysis',
    fingerTapping: 'Finger Tapping',
    facialSymmetry: 'Facial Symmetry',
    eyeMovement: 'Eye Movement',
    GAIT_ANALYSIS: 'Gait Analysis',
    SPEECH_PATTERN: 'Speech Pattern',
    RESPONSE_TIME: 'Response Time',
    FINGER_TAPPING: 'Finger Tapping',
    FACIAL_SYMMETRY: 'Facial Symmetry',
    EYE_MOVEMENT: 'Eye Movement',
    NECK_MOBILITY: 'Neck Mobility',
    HYPERVENTILATION_TEST: 'Hyperventilation',
    hyperventilation: 'Hyperventilation',
    stroop: 'Stroop Test',
    wordlist: 'Word List Memory Test',
    word_list: 'Word List Memory Test',
    neurobot: 'Conversational Screening'
  };
  
  return displayNames[type] || type;
}

/**
 * Format metric name for display
 * @param {string} name - The metric name
 * @returns {string} - The formatted name
 */
function formatMetricName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase());
}

function formatMetricPath(path) {
  return path
    .split('.')
    .map(part => part.replace(/\[(\d+)\]/g, ' $1').trim())
    .map(formatMetricName)
    .join(' > ');
}

function flattenMetrics(obj, parentKey = '') {
  const result = [];

  if (obj === null || obj === undefined) {
    return result;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return result;
    }

    const allPrimitive = obj.every(v => v === null || ['string', 'number', 'boolean'].includes(typeof v));
    if (allPrimitive) {
      const joined = obj
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .map(v => String(v))
        .join(', ');
      if (joined) {
        result.push({ key: parentKey || 'value', value: joined });
      }
      return result;
    }

    obj.forEach((item, index) => {
      const arrayKey = parentKey ? `${parentKey}[${index}]` : `[${index}]`;
      result.push(...flattenMetrics(item, arrayKey));
    });
    return result;
  }

  if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      result.push(...flattenMetrics(value, newKey));
    });
    return result;
  }

  const scalar = String(obj).trim();
  if (scalar) {
    result.push({ key: parentKey || 'value', value: scalar });
  }
  return result;
}

// Helper functions
function generateReportId() {
  return 'R' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function formatDate() {
  const date = new Date();
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function formatForFilename(text) {
  return text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
