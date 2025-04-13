import { supabase } from '../supabase';

class EmailService {
  private readonly FROM_EMAIL = 'noreply@waynewagers.com';
  private readonly TEMPLATES = {
    welcome: 'welcome_email',
    referral_reward: 'referral_reward',
    cashback_credited: 'cashback_credited'
  };

  async sendWelcomeEmail(userId: string, username: string) {
    const settings = await this.getEmailSettings();
    if (!settings.welcome_enabled) return;

    await this.sendEmail(userId, {
      template: this.TEMPLATES.welcome,
      subject: 'Welcome to WayneWagers!',
      data: {
        username,
        loginUrl: `${window.location.origin}/login`
      }
    });
  }

  async sendReferralRewardEmail(
    userId: string,
    amount: { regular: number; sweeps: number },
    isReferrer: boolean
  ) {
    const settings = await this.getEmailSettings();
    if (!settings.referral_enabled) return;

    await this.sendEmail(userId, {
      template: this.TEMPLATES.referral_reward,
      subject: isReferrer ? 'Your Referral Reward is Here!' : 'Welcome Bonus Credited',
      data: {
        regular_amount: amount.regular,
        sweeps_amount: amount.sweeps,
        isReferrer
      }
    });
  }

  async sendCashbackEmail(
    userId: string,
    amount: { regular: number; sweeps: number }
  ) {
    const settings = await this.getEmailSettings();
    if (!settings.cashback_enabled) return;

    await this.sendEmail(userId, {
      template: this.TEMPLATES.cashback_credited,
      subject: 'Daily Cashback Credited',
      data: {
        regular_amount: amount.regular,
        sweeps_amount: amount.sweeps,
        date: new Date().toLocaleDateString()
      }
    });
  }

  private async sendEmail(userId: string, {
    template,
    subject,
    data
  }: {
    template: string;
    subject: string;
    data: any;
  }) {
    try {
      // Get user's email
      const { data: user } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (!user?.email) return;

      // Send email using Supabase Edge Functions
      await supabase.functions.invoke('send-email', {
        body: {
          to: user.email,
          from: this.FROM_EMAIL,
          subject,
          template,
          data
        }
      });

      // Log email sent
      await supabase
        .from('email_logs')
        .insert([{
          user_id: userId,
          template,
          subject,
          data
        }]);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  private async getEmailSettings() {
    const { data } = await supabase
      .from('system_settings')
      .select('email_notifications')
      .single();

    return data?.email_notifications || {
      welcome_enabled: true,
      referral_enabled: true,
      cashback_enabled: true
    };
  }
}

export const emailService = new EmailService();