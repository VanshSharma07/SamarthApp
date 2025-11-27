import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sends a report email with PDF attachment using Nodemailer
 */
export const sendReportEmail = async (req, res) => {
  try {
    const { recipientEmail, pdfData, reportType, patientName } = req.body;
    
    // Check if email configuration exists
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({
        success: false,
        message: 'Email configuration is missing'
      });
    }
    
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
    }
    
    if (!pdfData) {
      return res.status(400).json({
        success: false,
        message: 'PDF data is required'
      });
    }
    
    // Create a transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail', // e.g., 'gmail', 'outlook', etc.
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    // Define email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Samarth Health" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `Samarth Health ${reportType || 'Assessment'} Report`,
      text: `Please find attached the ${reportType || 'assessment'} report from Samarth Health for ${patientName || 'the patient'}.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Samarth Health Report</h2>
          <p>Dear Guardian,</p>
          <p>Please find attached the ${reportType || 'assessment'} report from Samarth Health for ${patientName || 'the patient'}.</p>
          <p>This report contains important information about recent neuromotor assessments performed.</p>
          <p>Thank you for using Samarth Health.</p>
          <p>Regards,<br>The Samarth Health Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `samarth-${reportType.toLowerCase().replace(/\s/g, '-')}-report.pdf`,
          content: pdfData,
          encoding: 'base64',
          contentType: 'application/pdf'
        }
      ]
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent: %s', info.messageId);

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message || 'Unknown error'
    });
  }
};