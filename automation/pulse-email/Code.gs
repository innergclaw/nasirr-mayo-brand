// INNERG PULSE one-time code mailer.
// Deploy steps live in pulse/SETUP.md. This script does not send membership or trial mail.

function doPost(event) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const payload = JSON.parse(event && event.postData && event.postData.contents || '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (!expectedSecret || payload.secret !== expectedSecret) throw new Error('Unauthorized request.');
    if (payload.messageType !== 'pulse_code') throw new Error('Unsupported message.');

    const email = cleanEmail_(payload.email);
    const code = cleanCode_(payload.code);
    const unsubscribeUrl = cleanUnsubscribe_(payload.unsubscribeUrl);
    const subject = String(payload.subject || '');
    const text = String(payload.text || '');
    const html = String(payload.html || '');
    if (!email || !code || !unsubscribeUrl) throw new Error('A valid pulse message is required.');
    if (subject !== 'Your INNERG PULSE code') throw new Error('Unexpected subject.');
    if (text.indexOf(code) === -1 || text.indexOf(unsubscribeUrl) === -1) throw new Error('Incomplete message.');
    if (text.indexOf('This is news, not financial advice.') === -1) throw new Error('Incomplete message.');
    if (text.indexOf('Your email is only used for INNERG PULSE.') === -1) throw new Error('Incomplete message.');
    if (html.length > 20000 || html.toLowerCase().indexOf('<script') !== -1) throw new Error('Rejected markup.');
    if (html.indexOf(code) === -1 || html.indexOf(unsubscribeUrl) === -1) throw new Error('Incomplete message.');

    if (Session.getEffectiveUser().getEmail() !== 'ownyourwebsmm@gmail.com') throw new Error('Wrong sender account.');
    locked = lock.tryLock(10000);
    if (!locked) throw new Error('Delivery busy. Retry later.');
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily sending quota reached.');

    const properties = PropertiesService.getScriptProperties();
    const key = 'pulse:' + email + ':' + code;
    const prior = properties.getProperty(key);
    if (prior === 'sent') return json_({ ok: true, duplicate: true });
    if (prior === 'sending') throw new Error('Delivery uncertain. Review before retrying.');

    properties.setProperty(key, 'sending');
    MailApp.sendEmail(email, subject, text, {
      name: 'INNERG PULSE',
      htmlBody: html,
      replyTo: Session.getEffectiveUser().getEmail()
    });
    properties.setProperty(key, 'sent');
    return json_({ ok: true });
  } catch (error) {
    console.error('Pulse code delivery failed');
    return json_({ ok: false, error: String(error && error.message || error) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function cleanEmail_(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) && email.length <= 254 ? email : '';
}

function cleanCode_(value) {
  const code = String(value || '').trim();
  return /^[0-9]{6}$/.test(code) ? code : '';
}

function cleanUnsubscribe_(value) {
  const url = String(value || '').trim();
  return /^https:\/\/nasirr\.innergintel\.org\/pulse\/unsubscribe\/\?token=[a-f0-9]{64}$/.test(url) ? url : '';
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
