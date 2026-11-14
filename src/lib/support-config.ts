export const SUPPORT_CONFIG = {
  appName: 'SonicForge AI',
  supportEmail: 'ronakbairagi83@gmail.com',
  supportPhone: '9051905871',
  supportPhoneDisplay: '+91 9051905871',
  defaultSubject: 'SonicForge AI Support Request',
};

export interface SupportEmailContext {
  category?: string;
  affectedFeature?: string;
  whatTryingToDo?: string;
  whatHappened?: string;
  errorMessage?: string;
  stepsToReproduce?: string;
  additionalInfo?: string;
  userId?: string;
}

export function buildSupportEmailBody(context?: SupportEmailContext): string {
  const browserInfo = typeof navigator !== 'undefined' ? `${navigator.userAgent}` : 'Web Browser';
  const timestamp = new Date().toLocaleString('en-US', { timeZoneName: 'short' });

  return [
    'Hello SonicForge AI Support,',
    '',
    'I need assistance with SonicForge AI.',
    '',
    `Issue category: ${context?.category || 'General Inquiry'}`,
    `Affected feature: ${context?.affectedFeature || 'Music Studio / SFX Studio'}`,
    `What I was trying to do: ${context?.whatTryingToDo || '[Describe your goal]'}`,
    `What happened: ${context?.whatHappened || '[Describe the issue]'}`,
    `Error message, if any: ${context?.errorMessage || 'None / Not applicable'}`,
    `Steps to reproduce: ${context?.stepsToReproduce || '1. Open studio\n2. Configure parameters\n3. Click Generate'}`,
    `Additional information: ${context?.additionalInfo || 'N/A'}${context?.userId ? `\nUser ID: ${context.userId}` : ''}`,
    `Device and browser: ${browserInfo}`,
    `Approximate time of issue: ${timestamp}`,
    '',
    'Thank you for your assistance.',
  ].join('\n');
}

/**
 * Generates direct Gmail compose URL with mailto fallback
 */
export function getEmailSupportUrls(context?: SupportEmailContext) {
  const subject = SUPPORT_CONFIG.defaultSubject;
  const body = buildSupportEmailBody(context);

  // Gmail Web direct compose URL
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    SUPPORT_CONFIG.supportEmail
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Universal mailto URL
  const mailtoUrl = `mailto:${SUPPORT_CONFIG.supportEmail}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return { gmailComposeUrl, mailtoUrl, subject, body };
}

