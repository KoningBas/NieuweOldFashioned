import { google } from 'googleapis';

async function ensureLabel(gmail, name) {
  const list = await gmail.users.labels.list({ userId: 'me' });
  const existing = list.data.labels.find(l => l.name === name);
  if (existing) return existing.id;
  const created = await gmail.users.labels.create({ userId: 'me', requestBody: { name } });
  return created.data.id;
}

export async function getGmailClient(auth) {
  return google.gmail({ version: 'v1', auth });
}

export async function fetchUnprocessedBookings(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const processedLabel = process.env.PROCESSED_LABEL_NAME || 'Workshop/Verwerkt';

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `subject:Workshopaanvraag -label:"${processedLabel}" in:inbox`,
    maxResults: 50,
  });

  const messages = res.data.messages || [];
  // oldest first
  return messages.reverse();
}

export async function fetchMessageDetails(auth, messageId) {
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const msg = res.data;

  const headers = msg.payload.headers || [];
  const subject = headers.find(h => h.name === 'Subject')?.value || '';

  let body = '';
  const parts = msg.payload.parts || [];
  const textPart = parts.find(p => p.mimeType === 'text/plain');
  if (textPart?.body?.data) {
    body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
  } else if (msg.payload.body?.data) {
    body = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
  }

  return { messageId, subject, body };
}

export async function markAsProcessed(auth, messageId) {
  const gmail = google.gmail({ version: 'v1', auth });
  const processedLabelName = process.env.PROCESSED_LABEL_NAME || 'Workshop/Verwerkt';
  const errorLabelName = process.env.ERROR_LABEL_NAME || 'Workshop/Fout';
  const processedLabelId = await ensureLabel(gmail, processedLabelName);

  const list = await gmail.users.labels.list({ userId: 'me' });
  const errorLabel = list.data.labels.find(l => l.name === errorLabelName);
  const removeIds = ['INBOX'];
  if (errorLabel) removeIds.push(errorLabel.id);

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { addLabelIds: [processedLabelId], removeLabelIds: removeIds },
  });
}

export async function markAsError(auth, messageId) {
  const gmail = google.gmail({ version: 'v1', auth });
  const errorLabelName = process.env.ERROR_LABEL_NAME || 'Workshop/Fout';
  const errorLabelId = await ensureLabel(gmail, errorLabelName);

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { addLabelIds: [errorLabelId] },
  });
}
