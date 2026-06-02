import { google } from 'googleapis';

function buildMime({ to, from, subject, bodyText }) {
  const lines = [
    `From: The Old Fashioned <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    bodyText,
  ];
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

export async function sendConfirmationEmail(auth, parsed) {
  const gmail = google.gmail({ version: 'v1', auth });
  const from = process.env.GOOGLE_ACCOUNT_EMAIL || 'Theqingzakelijk@gmail.com';

  const subject = `Bevestiging workshopaanvraag – ${parsed.workshopName}`;

  const bodyText = `Beste ${parsed.customerName},

Bedankt voor je aanvraag! We hebben je reservering ontvangen en zullen
zo snel mogelijk contact met je opnemen ter bevestiging.

Jouw aanvraagdetails:

  Workshop:         ${parsed.workshopName}
  Datum:            ${parsed.dayLabel} ${parsed.dayNumber} ${parsed.monthLabel} ${parsed.year}
  Tijdstip:         ${parsed.time}
  Aantal personen:  ${parsed.personCount}

Heb je vragen? Stuur ons een mail via ${from}.

Tot ziens bij The Old Fashioned!

Hartelijke groeten,
The Old Fashioned Workshop Team`;

  const raw = buildMime({ to: parsed.customerEmail, from, subject, bodyText });

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return res.data;
}
