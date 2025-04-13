import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';
import { renderTemplate } from '../lib/templates.ts';

const SMTP_CONFIG = {
  hostname: Deno.env.get('SMTP_HOST') || '',
  port: parseInt(Deno.env.get('SMTP_PORT') || '587'),
  username: Deno.env.get('SMTP_USER') || '',
  password: Deno.env.get('SMTP_PASS') || '',
};

serve(async (req) => {
  try {
    const { to, from, subject, template, data } = await req.json();

    // Validate inputs
    if (!to || !from || !subject || !template || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    // Render email template
    const html = await renderTemplate(template, data);

    // Send email
    const client = new SmtpClient();
    await client.connectTLS(SMTP_CONFIG);
    await client.send({
      from,
      to,
      subject,
      content: html,
      html: true
    });
    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});