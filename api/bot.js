// api/bot.js
// Using built-in fetch (Node 18+) - no external dependencies needed

// Bot configuration
const BOT_TOKEN = '7773106747:AAG7vM6GazCa_AaTacRJ9SZSoUGEtAUsgQw';
const BOT_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Utility function to check if URL is valid
function isValidUrl(string) {
    try {
        new URL(string);
        return string.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)(\?.*)?$/i) || 
               string.includes('imgur.com') || 
               string.includes('image') ||
               string.includes('photo') ||
               string.includes('pic');
    } catch (_) {
        return false;
    }
}

// Send message to Telegram
async function sendMessage(chatId, text) {
    try {
        const response = await fetch(`${BOT_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Send message error:', error);
        return { ok: false, error: error.message };
    }
}

// Send photo to Telegram
async function sendPhoto(chatId, photoUrl, caption = '') {
    try {
        const response = await fetch(`${BOT_URL}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                photo: photoUrl,
                caption: caption
            })
        });
        
        const result = await response.json();
        if (!result.ok) {
            // If photo fails, try as document
            return await sendDocument(chatId, photoUrl, caption);
        }
        return result;
    } catch (error) {
        console.error('Send photo error:', error);
        return await sendMessage(chatId, `❌ Failed to send image: ${error.message}`);
    }
}

// Send document (fallback for images)
async function sendDocument(chatId, documentUrl, caption = '') {
    try {
        const response = await fetch(`${BOT_URL}/sendDocument`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                document: documentUrl,
                caption: caption || '📸 Image sent as document'
            })
        });
        
        const result = await response.json();
        if (!result.ok) {
            return await sendMessage(chatId, `❌ Could not send image. Please check the URL: ${documentUrl}`);
        }
        return result;
    } catch (error) {
        console.error('Send document error:', error);
        return await sendMessage(chatId, `❌ Failed to send image: ${error.message}`);
    }
}

// Process incoming message
async function processMessage(message) {
    const text = message.text?.trim();
    const chatId = message.chat.id;
    const username = message.from.username || message.from.first_name || 'User';

    if (!text) return { ok: true };

    console.log(`📨 Message from @${username}: ${text}`);

    // Handle /start command
    if (text === '/start') {
        const welcomeMessage = `🤖 <b>Welcome to Image Link Bot!</b>

👋 Hi there! I can help you fetch and send images from URLs.

<b>📋 How to use:</b>
• Send me: <code>/link [image_url]</code>
• I'll fetch and send the image back to you!

<b>💡 Example:</b>
<code>/link https://example.com/image.jpg</code>

<b>✨ Supported formats:</b>
JPG, PNG, GIF, WebP, BMP, SVG and more!

Ready to get started? Send me an image link! 🚀`;

        return await sendMessage(chatId, welcomeMessage);
    }

    // Handle /link command
    if (text.startsWith('/link ')) {
        const imageUrl = text.substring(6).trim();
        
        if (!imageUrl) {
            return await sendMessage(chatId, `❌ <b>No URL provided!</b>

Please use: <code>/link [image_url]</code>

Example: <code>/link https://example.com/image.jpg</code>`);
        }

        if (!isValidUrl(imageUrl)) {
            return await sendMessage(chatId, `❌ <b>Invalid URL!</b>

Please provide a valid image URL.

<b>Examples:</b>
• <code>/link https://example.com/image.jpg</code>
• <code>/link https://imgur.com/abc123.png</code>`);
        }

        // Send processing message
        await sendMessage(chatId, `🔄 <b>Processing image...</b>\n\n📷 URL: <code>${imageUrl}</code>`);

        // Send the image
        console.log(`🖼️ Fetching image: ${imageUrl}`);
        const result = await sendPhoto(chatId, imageUrl, '✅ <b>Image sent successfully!</b>');
        
        if (result && result.ok) {
            console.log(`✅ Image sent successfully to ${username}`);
        }
        return result;
    }

    // Handle /help command
    if (text === '/help') {
        const helpMessage = `🆘 <b>Help - Image Link Bot</b>

<b>📋 Available Commands:</b>
• <code>/start</code> - Welcome message
• <code>/help</code> - Show this help
• <code>/link [url]</code> - Fetch and send image

<b>💡 Usage Example:</b>
<code>/link https://example.com/photo.jpg</code>

<b>✅ Supported Sites:</b>
• Direct image links (.jpg, .png, etc.)
• Imgur links
• Most image hosting services

<b>❓ Need support?</b>
Just send me an image URL with /link command!`;

        return await sendMessage(chatId, helpMessage);
    }

    // Handle unknown commands
    if (text.startsWith('/')) {
        return await sendMessage(chatId, `❓ <b>Unknown command!</b>

<b>Available commands:</b>
• <code>/start</code> - Get started
• <code>/help</code> - Show help
• <code>/link [url]</code> - Send image from URL

Try: <code>/help</code> for more information.`);
    }

    // Handle regular messages
    return await sendMessage(chatId, `💬 <b>Hi there!</b>

To send an image, use:
<code>/link [image_url]</code>

Or type <code>/help</code> for more commands.`);
}

// Main handler function for Vercel
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'GET') {
        // Health check
        return res.status(200).json({
            status: 'Bot is running! 🤖',
            timestamp: new Date().toISOString(),
            message: 'Telegram Image Bot is active and ready to receive webhooks.'
        });
    }

    if (req.method === 'POST') {
        try {
            const update = req.body;
            
            if (update.message) {
                const result = await processMessage(update.message);
                console.log('Process result:', result);
            }

            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error('❌ Webhook error:', error);
            return res.status(500).json({ 
                ok: false, 
                error: error.message 
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};