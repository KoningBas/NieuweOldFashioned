import { getOAuthClient } from './auth.mjs';
import { loadState, saveState } from './state.mjs';
import { fetchUnprocessedBookings, fetchMessageDetails, markAsProcessed, markAsError } from './gmail.mjs';
import { createCalendarEvent, getCalendarEvent } from './calendar.mjs';
import { sendConfirmationEmail } from './mailer.mjs';
import { parseBookingEmail } from './parser.mjs';
import { logger } from './logger.mjs';

export async function run() {
  const auth = getOAuthClient();
  const results = { processed: [], errors: [], skipped: 0, lastEventVerified: null };

  // Step 1: verify last calendar event still exists
  const state = loadState();
  if (state.lastCalendarEventId) {
    const event = await getCalendarEvent(auth, state.lastCalendarEventId);
    if (event) {
      results.lastEventVerified = { name: state.lastCustomerName, workshop: state.lastWorkshopName };
      logger.info('Laatste calendar event geverifieerd', { eventId: state.lastCalendarEventId, customer: state.lastCustomerName });
    } else {
      results.lastEventVerified = null;
      logger.warn('Laatste calendar event niet gevonden in agenda', { eventId: state.lastCalendarEventId });
      saveState({ lastCalendarEventId: null });
    }
  }

  // Step 2: fetch unprocessed booking emails
  let messages;
  try {
    messages = await fetchUnprocessedBookings(auth);
  } catch (err) {
    logger.error('Fout bij ophalen emails', { error: err.message });
    throw err;
  }

  if (messages.length === 0) {
    logger.info('Geen nieuwe boekingen gevonden');
    return { ...results, processed: [], errors: [], skipped: 0 };
  }

  // Step 3: process each booking sequentially
  for (const msg of messages) {
    let parsed = null;
    let calendarEvent = null;

    try {
      const { messageId, subject, body } = await fetchMessageDetails(auth, msg.id);
      parsed = parseBookingEmail(subject, body);

      if (!parsed) {
        results.skipped++;
        logger.info('Email overgeslagen (geen boekingsformaat)', { messageId, subject });
        await markAsProcessed(auth, msg.id);
        continue;
      }

      // Create calendar event
      calendarEvent = await createCalendarEvent(auth, parsed);
      logger.info('Calendar event aangemaakt', { customer: parsed.customerName, workshop: parsed.workshopName, eventId: calendarEvent.id });
    } catch (err) {
      logger.error('Fout bij aanmaken calendar event', { error: err.message, messageId: msg.id });
      await markAsError(auth, msg.id).catch(() => {});
      results.errors.push({ messageId: msg.id, error: err.message });
      continue;
    }

    // Send confirmation email (non-fatal if it fails)
    try {
      await sendConfirmationEmail(auth, parsed);
      logger.info('Bevestigingsmail verstuurd', { to: parsed.customerEmail });
    } catch (err) {
      logger.error('Fout bij versturen bevestigingsmail', { error: err.message, to: parsed.customerEmail });
      results.errors.push({ step: 'email', customer: parsed.customerName, error: err.message });
    }

    // Mark as processed and update state
    await markAsProcessed(auth, msg.id).catch(err => logger.warn('Fout bij labelen', { error: err.message }));
    saveState({
      lastProcessedMessageId: msg.id,
      lastCalendarEventId: calendarEvent.id,
      lastProcessedAt: new Date().toISOString(),
      lastCustomerName: parsed.customerName,
      lastWorkshopName: parsed.workshopName,
    });

    results.processed.push({
      customer: parsed.customerName,
      workshop: parsed.workshopName,
      date: `${parsed.dayLabel} ${parsed.dayNumber} ${parsed.monthLabel} ${parsed.year} om ${parsed.time}`,
    });
  }

  return results;
}
