const HOME_URL = 'https://nasirr.innergintel.org/innerg-id/';

function doPost(event) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const payload = JSON.parse(event && event.postData && event.postData.contents || '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');

    if (!expectedSecret || payload.secret !== expectedSecret) {
      throw new Error('Unauthorized request.');
    }

    const email = cleanEmail_(payload.email);
    const memberId = cleanText_(payload.memberId, 40);
    const firstName = cleanText_(payload.firstName, 60) || 'member';

    if (!email || !memberId) {
      throw new Error('A valid email and member ID are required.');
    }

    if (Session.getEffectiveUser().getEmail() !== 'ownyourwebsmm@gmail.com') throw new Error('Wrong sender account.');
    locked = lock.tryLock(10000);
    if (!locked) throw new Error('Delivery busy. Retry later.');
    const key = 'welcome:' + memberId;
    const properties = PropertiesService.getScriptProperties();
    const prior = properties.getProperty(key);
    if (prior === 'sent') return json_({ ok: true, duplicate: true });
    if (prior === 'sending') throw new Error('Delivery uncertain. Review before retrying.');
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily sending quota reached.');

    const subject = 'Your INNERG ID is active: ' + memberId;
    const plainText = [
      'Welcome home, ' + firstName + '.',
      '',
      'Your INNERG ID is active.',
      'Member ID: ' + memberId,
      '',
      'Your ID opens the INNERG member hub, Research Desk, market watchlist, Media Hub, and Discord community.',
      '',
      'Open your INNERG ID: ' + HOME_URL,
      '',
      'Your access stays active while your membership is active.',
      'If you need help, reply to this email.',
      '',
      'Nasirr G. Mayo',
      'Founder, INNERG INTEL',
      'Sent by OwnYourWeb'
    ].join('\n');

    properties.setProperty(key, 'sending');
    MailApp.sendEmail(email, subject, plainText, {
      name: 'OwnYourWeb for INNERG INTEL',
      htmlBody: buildHtml_(firstName, memberId),
      replyTo: Session.getEffectiveUser().getEmail()
    });
    properties.setProperty(key, 'sent');

    return json_({ ok: true });
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: String(error && error.message || error) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function sendLiveTest() {
  if (Session.getEffectiveUser().getEmail() !== 'ownyourwebsmm@gmail.com') throw new Error('Wrong sender account.');
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('live-test-sent')) throw new Error('Test already sent.');
  MailApp.sendEmail('nasgfx215@gmail.com', '[TEST] Welcome home to INNERG',
    'This is a test of the INNERG welcome email. No membership or payment was created. Open your hub: ' + HOME_URL,
    { name: 'OwnYourWeb for INNERG INTEL', htmlBody: '<p>TEST EMAIL: no membership or payment was created.</p>' + buildHtml_('Nasirr', 'TEST PREVIEW'), replyTo: 'ownyourwebsmm@gmail.com' });
  properties.setProperty('live-test-sent', new Date().toISOString());
  console.log('Live test accepted by Google for nasgfx215@gmail.com');
}

function buildHtml_(firstName, memberId) {
  const safeName = escapeHtml_(firstName);
  const safeId = escapeHtml_(memberId);
  return '<div style="margin:0;background:#090a08;padding:32px 16px;color:#f7f2e8;font-family:Arial,sans-serif">' +
    '<div style="max-width:600px;margin:0 auto;border:1px solid #34372f;border-radius:24px;overflow:hidden;background:#11130f">' +
      '<div style="padding:20px 28px;border-bottom:1px solid #34372f;font-size:12px;font-weight:700;letter-spacing:.18em;color:#c7ff27">INNERG INTEL</div>' +
      '<div style="padding:36px 28px">' +
        '<p style="margin:0 0 12px;color:#a7aa9f;font-size:14px">WELCOME HOME, ' + safeName.toUpperCase() + '.</p>' +
        '<h1 style="margin:0 0 20px;font-size:36px;line-height:1.05;color:#f7f2e8">Your INNERG ID is active.</h1>' +
        '<div style="margin:24px 0;padding:22px;border-radius:16px;background:#f7f2e8;color:#090a08">' +
          '<div style="font-size:11px;font-weight:700;letter-spacing:.16em;color:#66695f">MEMBER ID</div>' +
          '<div style="margin-top:8px;font-size:25px;font-weight:800;letter-spacing:.04em">' + safeId + '</div>' +
        '</div>' +
        '<p style="margin:0 0 24px;color:#d4d6ce;font-size:16px;line-height:1.6">Your ID opens the INNERG member hub, Research Desk, market watchlist, Media Hub, and Discord community.</p>' +
        '<a href="' + HOME_URL + '" style="display:inline-block;padding:15px 22px;border-radius:999px;background:#c7ff27;color:#090a08;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:.1em">OPEN YOUR INNERG ID</a>' +
        '<p style="margin:26px 0 0;color:#8f9387;font-size:13px;line-height:1.55">Your access stays active while your membership is active. If you need help, reply to this email.</p>' +
      '</div>' +
      '<div style="padding:20px 28px;border-top:1px solid #34372f;color:#8f9387;font-size:12px;line-height:1.5">Nasirr G. Mayo<br>Founder, INNERG INTEL<br>Sent by OwnYourWeb</div>' +
    '</div>' +
  '</div>';
}

function cleanEmail_(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : '';
}

function cleanText_(value, maxLength) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function escapeHtml_(value) {
  return String(value).replace(/[&<>"']/g, function(character) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
  });
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
