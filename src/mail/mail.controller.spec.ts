import { NotFoundException } from '@nestjs/common';

import { MailController } from './mail.controller';

describe('MailController', () => {
  const mail = { sendTestEmail: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('sends a test message in development', async () => {
    const config = { get: jest.fn(() => 'development') };
    const controller = new MailController(config as never, mail as never);
    mail.sendTestEmail.mockResolvedValue(undefined);

    await expect(
      controller.sendTestEmail({ email: 'Test@Example.com' }),
    ).resolves.toEqual({ message: 'Test email sent to test@example.com.' });
    expect(mail.sendTestEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('is unavailable outside development', async () => {
    const config = { get: jest.fn(() => 'production') };
    const controller = new MailController(config as never, mail as never);

    await expect(
      controller.sendTestEmail({ email: 'test@example.com' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mail.sendTestEmail).not.toHaveBeenCalled();
  });
});
