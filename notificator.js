const cron = require('node-cron');
const { createNotificationEmbed, sendNotification: sendNotificationHelper } = require('./notification_message');
const dotenv = require('dotenv');
dotenv.config();

const NOTIFICATIONS_CHANNEL = process.env.NOTIFICATIONS_CHANNEL;
const NOTIFICATIONS_CRON_SCHEDULE = process.env.NOTIFICATIONS_CRON_SCHEDULE;
const MIN_MESSAGES = parseInt(process.env.MIN_MESSAGES || '10', 10);
const COOLDOWN_MINUTES = parseInt(process.env.COOLDOWN_MINUTES || '15', 10);

let userMessageCount = 0;
let lastNotificationTime = 0;
let cooldownTimeout = null;
let firstNotificationSent = false;

function resetCounter() {
    userMessageCount = 0;
}

async function sendNotification(client) {
    if (!NOTIFICATIONS_CHANNEL) return;
    const channel = await client.channels.fetch(NOTIFICATIONS_CHANNEL).catch(() => null);
    if (!channel || !channel.isTextBased()) {
        console.log('[NOTIFICATOR][DEBUG] Notification NOT sent: channel not found or not text-based.');
        return;
    }
    const embed = createNotificationEmbed();
    if (typeof sendNotificationHelper === 'function') {
        await sendNotificationHelper(channel, embed);
    } else {
        try {
            await channel.send({ embeds: [embed] });
            console.log('[NOTIFICATOR][DEBUG] Notification sent to channel:', NOTIFICATIONS_CHANNEL);
        } catch (err) {
            console.error('[NOTIFICATOR][ERROR] Failed to send notification:', err);
        }
    }
    lastNotificationTime = Date.now();
    resetCounter();
    console.log('[NOTIFICATOR][DEBUG] Notification sent to channel:', NOTIFICATIONS_CHANNEL);
}

async function tryNotify(client) {
    if (!firstNotificationSent) {
        console.log('[NOTIFICATOR][DEBUG] First notification after launch, sending immediately.');
        await sendNotification(client);
        firstNotificationSent = true;
        return;
    }
    if (userMessageCount >= MIN_MESSAGES) {
        console.log('[NOTIFICATOR][DEBUG] Enough user messages (', userMessageCount, '), sending notification.');
        await sendNotification(client);
    } else {
        console.log('[NOTIFICATOR][DEBUG] Not enough user messages (', userMessageCount, '), scheduling cooldown retry in', COOLDOWN_MINUTES, 'minutes.');
        // Wait for cooldown and check again
        if (cooldownTimeout) clearTimeout(cooldownTimeout);
        cooldownTimeout = setTimeout(() => {
            console.log('[NOTIFICATOR][DEBUG] Cooldown expired, retrying notification check.');
            tryNotify(client);
        }, COOLDOWN_MINUTES * 60 * 1000, client);
    }
}

function init(client) {
    if (!NOTIFICATIONS_CHANNEL || !NOTIFICATIONS_CRON_SCHEDULE) return;
    console.log('[NOTIFICATOR][DEBUG] Schedule:', NOTIFICATIONS_CRON_SCHEDULE);
    // Listen for user messages
    client.on('messageCreate', (message) => {
        if (message.author.bot) return;
        if (message.channelId !== NOTIFICATIONS_CHANNEL) return;
        userMessageCount++;
    });
    // Schedule notification
    cron.schedule(NOTIFICATIONS_CRON_SCHEDULE, () => {
        console.log('[NOTIFICATOR][DEBUG] Cron triggered, checking if notification should be sent.');
        tryNotify(client);
    });
}

module.exports = { init }; 