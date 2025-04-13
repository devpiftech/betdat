const templates = {
  welcome_email: (data: any) => `
    <h1>Welcome to WayneWagers, ${data.username}!</h1>
    <p>Thank you for joining our community. Get ready to experience the thrill of casino gaming with both regular coins and WayneBucks!</p>
    <p>Your account has been credited with:</p>
    <ul>
      <li>$10.00 in Regular Coins</li>
      <li>$2.00 in WayneBucks</li>
    </ul>
    <p>Start playing now: <a href="${data.loginUrl}">Login to WayneWagers</a></p>
  `,

  referral_reward: (data: any) => `
    <h1>${data.isReferrer ? 'Referral Reward Credited!' : 'Welcome Bonus Credited!'}</h1>
    <p>${data.isReferrer 
      ? 'Your friend has joined WayneWagers using your referral code.' 
      : 'Welcome to WayneWagers! You\'ve been referred by a friend.'}</p>
    <p>Your account has been credited with:</p>
    <ul>
      <li>$${(data.regular_amount / 100).toFixed(2)} in Regular Coins</li>
      <li>$${(data.sweeps_amount / 100).toFixed(2)} in WayneBucks</li>
    </ul>
  `,

  cashback_credited: (data: any) => `
    <h1>Daily Cashback Credited</h1>
    <p>Your cashback for ${data.date} has been credited to your account:</p>
    <ul>
      <li>$${(data.regular_amount / 100).toFixed(2)} in Regular Coins</li>
      <li>$${(data.sweeps_amount / 100).toFixed(2)} in WayneBucks</li>
    </ul>
    <p>Keep playing to earn more rewards!</p>
  `
};

export async function renderTemplate(template: string, data: any): Promise<string> {
  const templateFn = templates[template];
  if (!templateFn) {
    throw new Error(`Template ${template} not found`);
  }

  const content = templateFn(data);
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WayneWagers</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #1d4ed8;
            margin-bottom: 24px;
          }
          a {
            color: #2563eb;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: white;
            border-radius: 6px;
            text-decoration: none;
            margin-top: 24px;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;
}