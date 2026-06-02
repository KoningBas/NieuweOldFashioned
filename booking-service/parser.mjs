// Subject: "Workshopaanvraag Cocktails & Bites – dinsdag 10 juni 2026 om 19:00"
// The dash is Unicode en-dash U+2013
const SUBJECT_RE = /^Workshopaanvraag (.+?) – (\w+) (\d{1,2}) (\w+) (\d{4}) om (\d{2}:\d{2})$/;

const NL_MONTHS = {
  januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5,
  juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11,
};

function extractField(body, label) {
  const m = body.match(new RegExp(`^${label}: (.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

export function parseBookingEmail(subject, body) {
  const sm = subject.match(SUBJECT_RE);
  if (!sm) return null;

  const [, workshopName, dayLabel, dayStr, monthLabel, yearStr, time] = sm;
  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);
  const monthIndex = NL_MONTHS[monthLabel.toLowerCase()];
  if (monthIndex === undefined) return null;

  const [hours, minutes] = time.split(':').map(Number);
  const eventDate = new Date(year, monthIndex, day, hours, minutes, 0);

  const customerName = extractField(body, 'Naam');
  const customerEmail = extractField(body, 'E-mail');
  const customerPhone = extractField(body, 'Telefoon');
  const personCount = parseInt(extractField(body, 'Aantal personen') || '0', 10);
  const notes = extractField(body, 'Opmerking');

  if (!customerName || !customerEmail || !customerPhone) return null;

  return {
    workshopName,
    customerName,
    customerEmail,
    customerPhone,
    personCount,
    notes,
    eventDate,
    dayLabel,
    dayNumber: day,
    monthLabel,
    year,
    time,
  };
}
