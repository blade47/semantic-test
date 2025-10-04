import { Block } from '../../../src/core/Block.js';

/**
 * Example Custom Block: EmailSender
 *
 * Demonstrates how to create a block that sends emails.
 * Could be adapted for SendGrid, Mailgun, AWS SES, etc.
 */
export class EmailSender extends Block {
  static get inputs() {
    return {
      required: ['to', 'subject', 'body'],
      optional: ['from', 'cc', 'bcc', 'attachments']
    };
  }

  static get outputs() {
    return {
      produces: ['messageId', 'sent', 'error']
    };
  }

  async process(inputs, _context) {
    const {
      to: _to,
      subject: _subject,
      body: _body,
      from: _from = 'noreply@example.com',
      cc: _cc,
      bcc: _bcc,
      attachments: _attachments
    } = inputs;

    // Simulate async operation
    await Promise.resolve();

    try {
      // Example implementation using nodemailer or similar
      // const transporter = context.get('emailTransporter');
      // const result = await transporter.sendMail({
      //   from,
      //   to,
      //   subject,
      //   html: body,
      //   cc,
      //   bcc,
      //   attachments
      // });

      // Mock implementation
      const messageId = `<${Date.now()}@example.com>`;

      return {
        messageId,
        sent: true
      };
    } catch (error) {
      return {
        sent: false,
        error: error.message
      };
    }
  }
}
