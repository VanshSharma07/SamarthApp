import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';

export const generateReport = async (assessmentData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: 'Samarth Neuromotor Assessment Report',
          Author: 'Samarth Health'
        },
        // Add bufferPages to allow page references
        bufferPages: true
      });
      
      // Stream to create PDF buffer
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // Add template and styles
      addReportHeader(doc, assessmentData.userId);
      addReportStyles(doc);
      
      // Front page
      addCoverPage(doc, assessmentData.userId);
      
      // Add summary section
      doc.addPage();
      addSummarySection(doc, assessmentData);
      
      // Add individual assessment sections
      if (assessmentData.tremor) {
        doc.addPage();
        addTremorSection(doc, assessmentData.tremor);
      }
      
      if (assessmentData.speech) {
        doc.addPage();
        addSpeechSection(doc, assessmentData.speech);
      }
      
      if (assessmentData.responseTime) {
        doc.addPage();
        addResponseTimeSection(doc, assessmentData.responseTime);
      }
      
      if (assessmentData.neckMobility) {
        doc.addPage();
        addNeckMobilitySection(doc, assessmentData.neckMobility);
      }
      
      if (assessmentData.gait) {
        doc.addPage();
        addGaitSection(doc, assessmentData.gait);
      }
      
      if (assessmentData.fingerTapping) {
        doc.addPage();
        addFingerTappingSection(doc, assessmentData.fingerTapping);
      }
      
      if (assessmentData.facialSymmetry) {
        doc.addPage();
        addFacialSymmetrySection(doc, assessmentData.facialSymmetry);
      }
      
      if (assessmentData.eyeMovement) {
        doc.addPage();
        addEyeMovementSection(doc, assessmentData.eyeMovement);
      }
      
      // Final recommendation section
      doc.addPage();
      addRecommendationSection(doc);
      
      // Now that all pages are added, add the table of contents
      doc.switchToPage(1); // After cover page
      addTableOfContents(doc, assessmentData);
      
      // Add footer to all pages
      addFooter(doc);
      
      // Finalize the PDF
      doc.end();
    } catch (error) {
      console.error('Error generating PDF report:', error);
      reject(error);
    }
  });
};

// Helper function to add report header
function addReportHeader(doc, userId) {
  // Add logo if available
  try {
    const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 100 });
    }
  } catch (error) {
    console.error('Error adding logo:', error);
  }
  
  doc.fontSize(10)
     .fillColor('#888888')
     .text('SAMARTH HEALTH', 50, 45, { align: 'right' })
     .text(`Report ID: ${userId?.substring(0, 8) || 'N/A'}`, { align: 'right' })
     .text(`Generated: ${format(new Date(), 'PPpp')}`, { align: 'right' });
}

// Helper function to add styling
function addReportStyles(doc) {
  // Define commonly used styles
  doc.font('Helvetica');
  
  // Add any other styling configurations
}

// Helper function for cover page
function addCoverPage(doc, userId) {
  const centerY = doc.page.height / 2 - 100;
  
  doc.fontSize(30)
     .fillColor('#333333')
     .text('Neuromotor Assessment Report', { align: 'center' });
  
  doc.moveDown(2);
  
  doc.fontSize(16)
     .fillColor('#555555')
     .text(`Patient ID: ${userId || 'N/A'}`, { align: 'center' });
  
  doc.moveDown();
  
  doc.fontSize(14)
     .fillColor('#777777')
     .text(`Generated on ${format(new Date(), 'PPP')}`, { align: 'center' });
  
  doc.moveDown(8);
  
  doc.fontSize(12)
     .fillColor('#888888')
     .text('CONFIDENTIAL MEDICAL INFORMATION', { align: 'center' });
  
  doc.moveDown(0.5);
  
  doc.text('For review by healthcare professionals', { align: 'center' });
}

// Helper function to add table of contents - Fixed to avoid page reference issues
function addTableOfContents(doc, assessmentData) {
  doc.fontSize(18)
     .fillColor('#333333')
     .text('Table of Contents', { underline: true });
  
  doc.moveDown();
  
  // Instead of using links that require page references,
  // just list the contents as plain text
  doc.fontSize(12)
     .fillColor('#555555')
     .text(`1. Summary Assessment`);
  
  let sectionNumber = 2;
  
  if (assessmentData.tremor) {
    doc.text(`${sectionNumber++}. Tremor Assessment`);
  }
  
  if (assessmentData.speech) {
    doc.text(`${sectionNumber++}. Speech Pattern Assessment`);
  }
  
  if (assessmentData.responseTime) {
    doc.text(`${sectionNumber++}. Response Time Assessment`);
  }
  
  if (assessmentData.neckMobility) {
    doc.text(`${sectionNumber++}. Neck Mobility Assessment`);
  }
  
  if (assessmentData.gait) {
    doc.text(`${sectionNumber++}. Gait Analysis`);
  }
  
  if (assessmentData.fingerTapping) {
    doc.text(`${sectionNumber++}. Finger Tapping Assessment`);
  }
  
  if (assessmentData.facialSymmetry) {
    doc.text(`${sectionNumber++}. Facial Symmetry Assessment`);
  }
  
  if (assessmentData.eyeMovement) {
    doc.text(`${sectionNumber++}. Eye Movement Assessment`);
  }
  
  doc.text(`${sectionNumber}. Recommendations`);
}

// Helper function to add summary section
function addSummarySection(doc, assessmentData) {
  doc.fontSize(20)
     .fillColor('#333333')
     .text('Summary Assessment', { underline: true });
  
  doc.moveDown();
  
  doc.fontSize(12)
     .fillColor('#555555')
     .text('This report summarizes the results of multiple neuromotor assessments conducted using the Samarth Health platform. Below is an overview of the key findings.');
  
  doc.moveDown(2);
  
  // Create a summary table with key metrics from each assessment
  doc.fontSize(14)
     .fillColor('#333333')
     .text('Assessment Overview');
  
  doc.moveDown();
  
  // Table headers
  const tableTop = doc.y;
  const tableLeft = 50;
  const colWidth = (doc.page.width - 100) / 3;
  
  doc.fontSize(10)
     .fillColor('#FFFFFF')
     .rect(tableLeft, tableTop, colWidth * 3, 20)
     .fill('#333333');
  
  doc.fillColor('#FFFFFF')
     .text('Assessment Type', tableLeft + 5, tableTop + 5, { width: colWidth - 10 })
     .text('Date', tableLeft + colWidth + 5, tableTop + 5, { width: colWidth - 10 })
     .text('Key Metrics', tableLeft + colWidth * 2 + 5, tableTop + 5, { width: colWidth - 10 });
  
  // Table rows
  let rowTop = tableTop + 20;
  
  // Helper function to add a table row
  function addTableRow(type, date, metrics) {
    // Background color alternation
    if ((rowTop - tableTop) / 20 % 2 === 1) {
      doc.fillColor('#F5F5F5')
         .rect(tableLeft, rowTop, colWidth * 3, 20)
         .fill();
    }
    
    doc.fillColor('#333333')
       .text(type, tableLeft + 5, rowTop + 5, { width: colWidth - 10 })
       .text(date, tableLeft + colWidth + 5, rowTop + 5, { width: colWidth - 10 })
       .text(metrics, tableLeft + colWidth * 2 + 5, rowTop + 5, { width: colWidth - 10 });
    
    rowTop += 20;
  }
  
  // Add rows for each assessment
  if (assessmentData.tremor) {
    const date = format(new Date(assessmentData.tremor.timestamp), 'PP');
    const metrics = `Severity: ${assessmentData.tremor.metrics.severity || 'N/A'}, Frequency: ${assessmentData.tremor.metrics.tremor_frequency || 'N/A'} Hz`;
    addTableRow('Tremor Assessment', date, metrics);
  }
  
  if (assessmentData.speech) {
    const date = format(new Date(assessmentData.speech.timestamp), 'PP');
    const metrics = `Clarity: ${assessmentData.speech.metrics.clarity?.score || 'N/A'}/10, Overall: ${assessmentData.speech.metrics.overallScore || 'N/A'}/10`;
    addTableRow('Speech Pattern', date, metrics);
  }
  
  if (assessmentData.responseTime) {
    const date = format(new Date(assessmentData.responseTime.timestamp), 'PP');
    const metrics = `Avg Response: ${assessmentData.responseTime.metrics.averageResponseTime || 'N/A'}`;
    addTableRow('Response Time', date, metrics);
  }
  
  if (assessmentData.neckMobility) {
    const date = format(new Date(assessmentData.neckMobility.timestamp), 'PP');
    const metrics = `Mobility Score: ${assessmentData.neckMobility.metrics.overall?.mobilityScore || 'N/A'}/10`;
    addTableRow('Neck Mobility', date, metrics);
  }
  
  if (assessmentData.gait) {
    const date = format(new Date(assessmentData.gait.timestamp), 'PP');
    const metrics = `Stability: ${assessmentData.gait.metrics.stability?.score || 'N/A'}/10`;
    addTableRow('Gait Analysis', date, metrics);
  }
  
  if (assessmentData.fingerTapping) {
    const date = format(new Date(assessmentData.fingerTapping.timestamp), 'PP');
    const metrics = `Overall Score: ${assessmentData.fingerTapping.metrics.overallScore || 'N/A'}/10`;
    addTableRow('Finger Tapping', date, metrics);
  }
  
  if (assessmentData.facialSymmetry) {
    const date = format(new Date(assessmentData.facialSymmetry.timestamp), 'PP');
    const metrics = `Symmetry Score: ${assessmentData.facialSymmetry.symmetry_score || 'N/A'}/100`;
    addTableRow('Facial Symmetry', date, metrics);
  }
  
  if (assessmentData.eyeMovement) {
    const date = format(new Date(assessmentData.eyeMovement.timestamp), 'PP');
    const metrics = `Composite Score: ${assessmentData.eyeMovement.metrics.overall?.compositeScore || 'N/A'}/10`;
    addTableRow('Eye Movement', date, metrics);
  }
  
  // Draw table border
  doc.rect(tableLeft, tableTop, colWidth * 3, rowTop - tableTop)
     .stroke();
  
  doc.moveDown(4);
  
  // Additional notes
  doc.fontSize(12)
     .fillColor('#555555')
     .text('This summary provides a high-level overview of the assessment results. Detailed metrics and analysis for each assessment can be found in the subsequent sections of this report.');
}

// Simplified implementation of assessment sections
function addTremorSection(doc, tremorData) {
  doc.fontSize(20)
     .fillColor('#333333')
     .text('Tremor Assessment', { underline: true });
  
  doc.moveDown();
  
  doc.fontSize(12)
     .fillColor('#555555')
     .text(`Assessment completed on ${format(new Date(tremorData.timestamp), 'PPpp')}`);
  
  doc.moveDown();
  
  // Add basic metrics without complex tables
  doc.fontSize(14)
     .fillColor('#333333')
     .text('Tremor Metrics:');
  
  doc.moveDown();
  
  doc.fontSize(12)
     .fillColor('#555555')
     .text(`Tremor Frequency: ${tremorData.metrics.tremor_frequency || 'N/A'} Hz`)
     .text(`Tremor Amplitude: ${tremorData.metrics.tremor_amplitude || 'N/A'}`)
     .text(`Tremor Type: ${tremorData.metrics.tremor_type || 'N/A'}`)
     .text(`Severity: ${tremorData.metrics.severity || 'N/A'}`)
     .text(`Overall Score: ${tremorData.metrics.overall?.tremorScore || 'N/A'}/10`);
}

function addSpeechSection(doc, speechData) {
  doc.fontSize(20)
     .fillColor('#333333')
     .text('Speech Pattern Assessment', { underline: true });
  
  doc.moveDown();
  
  doc.fontSize(12)
     .fillColor('#555555')
     .text(`Assessment completed on ${format(new Date(speechData.timestamp), 'PPpp')}`);
  
  doc.moveDown();
  
  // Add basic speech metrics
  doc.fontSize(14)
     .fillColor('#333333')
     .text('Speech Metrics:');
  
  doc.moveDown();
  
  doc.fontSize(12)
     .fillColor('#555555')
     .text(`Clarity: ${speechData.metrics.clarity?.score || 'N/A'}/10`)
     .text(`Words Per Minute: ${speechData.metrics.speechRate?.wordsPerMinute || 'N/A'}`)
     .text(`Volume Control: ${speechData.metrics.volumeControl?.score || 'N/A'}/10`)
     .text(`Overall Score: ${speechData.metrics.overallScore || 'N/A'}/10`);
}

// Simple implementations of other section functions
function addResponseTimeSection(doc, responseTimeData) {
  doc.fontSize(20)
     .fillColor('#333333')
     .text('Response Time Assessment', { underline: true });
  // Basic response time information...
  doc.text(`Average Response Time: ${responseTimeData?.metrics?.averageResponseTime || 'N/A'}`);
}

function addNeckMobilitySection(doc, data) {
  doc.fontSize(20)
     .fillColor('#333333')
     .text('Neck Mobility Assessment', { underline: true });
  // Basic neck mobility information...
}

function addGaitSection(doc, data) {
  doc.fontSize(20)
     .fillColor('#333333')
     .text('Gait Analysis Assessment', { underline: true });

  doc.moveDown();
  doc.fontSize(12)
    .fillColor('#555555')
    .text(`Assessment completed on ${data?.timestamp ? format(new Date(data.timestamp), 'PPpp') : 'N/A'}`);

  doc.moveDown();
  doc.fontSize(14)
    .fillColor('#333333')
    .text('Detailed Gait Metrics:');

  doc.moveDown();
  const gaitMetrics = flattenObject(data?.metrics || {});

  if (gaitMetrics.length === 0) {
   doc.fontSize(12)
     .fillColor('#555555')
     .text('No gait metrics available.');
   return;
  }

  gaitMetrics.forEach((item) => {
   if (doc.y > doc.page.height - 70) {
    doc.addPage();
    doc.fontSize(14)
      .fillColor('#333333')
      .text('Detailed Gait Metrics (continued):');
    doc.moveDown();
   }

   doc.fontSize(11)
     .fillColor('#555555')
     .text(`${formatMetricPath(item.key)}: ${item.value}`);
  });
}

function addFingerTappingSection(doc, data) {
  doc.fontSize(20)
     .fillColor('#333333')
     .text('Finger Tapping Assessment', { underline: true });
  // Basic finger tapping information...
}

function addFacialSymmetrySection(doc, data) {
  doc.fontSize(20)
     .fillColor('#333333')
     .text('Facial Symmetry Assessment', { underline: true });
  // Basic facial symmetry information...
}

function addEyeMovementSection(doc, data) {
  doc.fontSize(20)
     .fillColor('#333333')
     .text('Eye Movement Assessment', { underline: true });
  // Basic eye movement information...
}

// Helper function for metrics tables
function drawMetricsTable(doc, metrics) {
  const startY = doc.y;
  const tableLeft = 100;
  
  // Draw metrics in a two column format
  metrics.forEach((metric, index) => {
    const y = startY + index * 25;
    
    // Label on the left
    doc.fontSize(10)
       .fillColor('#333333')
       .text(metric.label, 50, y, { width: tableLeft - 60 });
    
    // Value on the right
    doc.fontSize(10)
       .fillColor('#555555')
       .text(metric.value?.toString() || 'N/A', tableLeft, y);
  });
  
  // Move document position for subsequent content
  doc.moveDown(metrics.length + 1);
}

function addRecommendationSection(doc) {
  doc.fontSize(18)
     .fillColor('#333333')
     .text('Recommendations', { underline: true });
  
  doc.moveDown();
  
  doc.fontSize(12)
     .fillColor('#555555')
     .text('Based on the assessment results, the following recommendations are provided:');
  
  doc.moveDown();
  
  // Use simple bullet points instead of list method to avoid errors
  doc.text('• Continue to monitor neuromotor function with regular assessments');
  doc.text('• Discuss these results with your healthcare provider');
  doc.text('• Follow up on any significant changes in assessment scores');
  doc.text('• Consider reviewing the detailed metrics for each assessment type');
  
  doc.moveDown();
  
  doc.fontSize(10)
     .fillColor('#888888')
     .text('DISCLAIMER: This report is generated based on assessment data and is intended for informational purposes only. It does not constitute medical advice and should not be used to diagnose or treat any medical condition. Always consult with a qualified healthcare provider regarding any health concerns.');
}

function addFooter(doc) {
  const pageCount = doc.bufferedPageRange().count;
  
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    
    const pageBottom = doc.page.height - 50;
    
    doc.fontSize(8)
       .fillColor('#888888')
       .text(
          `Page ${i + 1} of ${pageCount} | Generated: ${new Date().toLocaleString()} | Samarth Health Assessment Report`,
          50,
          pageBottom,
          { align: 'center' }
       );
  }
}

function flattenObject(input, parentKey = '') {
  const rows = [];

  if (input === null || input === undefined) {
    return rows;
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return rows;
    }

    const allPrimitive = input.every(v => v === null || ['string', 'number', 'boolean'].includes(typeof v));
    if (allPrimitive) {
      const joined = input
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .map(v => String(v))
        .join(', ');
      if (joined) {
        rows.push({ key: parentKey || 'value', value: joined });
      }
      return rows;
    }

    input.forEach((item, index) => {
      const nextKey = parentKey ? `${parentKey}[${index}]` : `[${index}]`;
      rows.push(...flattenObject(item, nextKey));
    });
    return rows;
  }

  if (typeof input === 'object') {
    Object.entries(input).forEach(([key, value]) => {
      const nextKey = parentKey ? `${parentKey}.${key}` : key;
      rows.push(...flattenObject(value, nextKey));
    });
    return rows;
  }

  const scalar = String(input).trim();
  if (scalar) {
    rows.push({ key: parentKey || 'value', value: scalar });
  }
  return rows;
}

function formatMetricPath(metricPath) {
  return metricPath
    .split('.')
    .map(part => part.replace(/\[(\d+)\]/g, ' $1').trim())
    .map(part => part.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()))
    .join(' > ');
}
