#!/usr/bin/env node

/**
 * Test script for PDF upload AI analysis flow
 * Tests the backend endpoint and logs the response
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Configuration
const API_URL = 'http://localhost:5000/api';
const TEST_USER_ID = '6794a2a7e3c3b9c5f8e2d1a0'; // Replace with actual test user ID
const TEST_PDF_PATH = './test-report.pdf'; // Path to test PDF (optional)
const TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

async function testPdfUpload() {
  console.log('🧪 Testing PDF Upload AI Analysis Flow');
  console.log('=====================================\n');

  // Check if test PDF exists, if not create a minimal one for testing
  let pdfPath = TEST_PDF_PATH;
  if (!fs.existsSync(pdfPath)) {
    console.log('⚠️  No test PDF found. Creating a minimal test PDF...');
    
    // Create a minimal PDF with some text content
    const pdfContent = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
      0x0a, 0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, // 1 0 obj
      0x0a, 0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, // <</Type
      0x20, 0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, // /Catalo
      0x67, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, // g/Pages
      0x32, 0x20, 0x30, 0x52, 0x3e, 0x3e, 0x0a, 0x65, // 2 0 R>>
      0x6e, 0x64, 0x6f, 0x62, 0x6a, // endobj
    ]);

    // For this test, we'll use text-based content instead
    console.log('📝 Creating test content with medical report data...\n');
    
    // Skip PDF creation and use text content directly
  }

  try {
    // Test 1: Check if user exists and is authenticated
    console.log('1️⃣  Testing authentication...');
    try {
      const authTest = await axios.get(`${API_URL}/assessments/${TEST_USER_ID}/history`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Authentication successful\n');
    } catch (authError) {
      if (authError.response?.status === 401) {
        console.log('⚠️  Authentication failed. Using test token.');
        console.log('   Note: Replace TEST_TOKEN environment variable for actual testing\n');
      } else {
        console.log('⚠️  Could not verify authentication\n');
      }
    }

    // Test 2: Create or use existing test PDF
    console.log('2️⃣  Preparing PDF file...');
    
    // Check if test PDF exists
    if (!fs.existsSync(pdfPath)) {
      console.log('   Creating minimal test PDF for demonstration...');
      // Create a very simple PDF with text
      const simpleTestPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 100 >>
stream
BT
/F1 12 Tf
50 750 Td
(Patient Medical Report: Assessment shows tremor at 12 Hz, gait instability, memory loss, and occasional seizures) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000244 00000 n
0000000330 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
480
%%EOF`;
      
      pdfPath = './test-minimal.pdf';
      fs.writeFileSync(pdfPath, simpleTestPdf);
      console.log(`   ✅ Created test PDF at ${pdfPath}\n`);
    } else {
      console.log(`   ✅ Using existing PDF at ${pdfPath}\n`);
    }

    // Test 3: Upload PDF for analysis
    console.log('3️⃣  Uploading PDF for AI analysis...');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(pdfPath));

    try {
      const response = await axios.post(
        `${API_URL}/assessments/${TEST_USER_ID}/analyze-pdf`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${TOKEN}`
          },
          timeout: 60000
        }
      );

      console.log('✅ PDF upload successful\n');

      // Test 4: Analyze response structure
      console.log('4️⃣  Analyzing AI response structure...\n');
      
      const data = response.data;
      console.log('Response Status:', response.status);
      console.log('Response Keys:', Object.keys(data).join(', '));

      // Check main data structure
      if (data.data) {
        const analysisData = data.data;
        console.log('\n📊 Analysis Data Structure:');
        console.log('   - Parkinson\'s:', {
          risk: analysisData.parkinsonsDisease?.riskLevel,
          indicators: analysisData.parkinsonsDisease?.indicators?.length || 0,
          recommendations: analysisData.parkinsonsDisease?.recommendations?.length || 0
        });
        console.log('   - Alzheimer\'s:', {
          risk: analysisData.alzheimersDisease?.riskLevel,
          indicators: analysisData.alzheimersDisease?.indicators?.length || 0,
          recommendations: analysisData.alzheimersDisease?.recommendations?.length || 0
        });
        console.log('   - Epilepsy:', {
          risk: analysisData.epilepsy?.riskLevel,
          indicators: analysisData.epilepsy?.indicators?.length || 0,
          recommendations: analysisData.epilepsy?.recommendations?.length || 0
        });
        
        console.log('\n📝 Overall Assessment:');
        console.log('   ' + (analysisData.overallAssessment?.substring(0, 100) || 'N/A'));

        if (analysisData.parkinsonsDisease?.indicators?.length > 0) {
          console.log('\n💡 Sample Parkinson\'s Indicators:');
          analysisData.parkinsonsDisease.indicators.slice(0, 2).forEach((ind, i) => {
            console.log(`   ${i + 1}. ${ind}`);
          });
        }
      }

      console.log('\n✅ PDF Analysis Flow Test Completed Successfully!\n');

      // Save response to file for inspection
      const responseFile = './test-pdf-response.json';
      fs.writeFileSync(responseFile, JSON.stringify(response.data, null, 2));
      console.log(`📁 Full response saved to ${responseFile}\n`);

    } catch (uploadError) {
      console.error('❌ PDF Upload Failed');
      if (uploadError.response) {
        console.error('Status:', uploadError.response.status);
        console.error('Error:', uploadError.response.data);
      } else {
        console.error('Error:', uploadError.message);
      }
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
console.log('\n🚀 Starting PDF Upload AI Analysis Tests...\n');
testPdfUpload().then(() => {
  console.log('✨ All tests completed!\n');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
