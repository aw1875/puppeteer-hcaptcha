// Require our hcaptchaToken method
const { hcaptchaToken } = require('puppeteer-hcaptcha');

(async () => {
  // Create Start Time
  const startTime = Date.now();

  // Call hcaptchaToken method passing in your url
  let token = await hcaptchaToken('URL OF PAGE WITH CAPTCHA ON IT');

  // Get End Time
  const endTime = Date.now();

  // Log timed result to console
  console.log(`Completed in ${(endTime - startTime) / 1000} seconds`);

  // P0_eyJ0eXAiOiJ...
  console.log(token);
})();