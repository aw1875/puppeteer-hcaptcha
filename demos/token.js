// Require puppeteer extra, puppeteer stealth, google vision
const puppeteer = require('puppeteer-extra')
const pluginStealth = require('puppeteer-extra-plugin-stealth')
const vision = require("@google-cloud/vision");

// Require our hcaptcha method
const { hcaptchaToken } = require('puppeteer-hcaptcha');

// Instantiate a new Google Vision Client
// This is important so make sure keyFilename points to your credentials
// Our solver method will be using this to speed up the process
const client = new vision.ImageAnnotatorClient({
  keyFilename: "YOUR GOOGLE CREDENTIALS",
});

// Tell puppeteer to use puppeteer stealth
puppeteer.use(pluginStealth());

(async () => {
    // Call hcaptcha method passing in url and google vision client
    let token = await hcaptchaToken('URL OF PAGE WITH CAPTCHA ON IT', client);

    // W0_eyJ0eXAiOiJ...
    console.log(token);
})();