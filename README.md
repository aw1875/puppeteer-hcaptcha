## hCaptcha solver for puppeteer

A library to solve hcaptcha challenges that are automated within puppeteer. You can automatically set response values where they should be so the only thing left for you is submitting the page or you can get the response token. Average response time is 2-12 seconds (if Google isn't rate limiting for too many requests, otherwise it can take much longer or possibly fail).

## Usage

```javascript
await hcaptcha(page, client);
```

-   `url` [&lt;string&gt;](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) - URL of page with captcha on it
-   `client` [&lt;ImageAnnotatorClient&gt;](https://cloud.google.com/vision/docs/libraries#client-libraries-install-nodejs) - URL of page with captcha on it

```javascript
await hcaptchaToken(url, client);
```

-   `url` [&lt;string&gt;](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) - URL of page with captcha on it
-   `client` [&lt;ImageAnnotatorClient&gt;](https://cloud.google.com/vision/docs/libraries#client-libraries-install-nodejs) - URL of page with captcha on it

### Automatically set respone value

```javascript
// Require puppeteer extra, puppeteer stealth, google vision
const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
const vision = require("@google-cloud/vision");

// Require our hcaptcha method
const { hcaptcha } = require("./hcaptcha");

// Instantiate a new Google Vision Client
// This is important so make sure keyFilename points to your credentials
// Our solver method will be using this to speed up the process
const client = new vision.ImageAnnotatorClient({
    keyFilename: "YOUR GOOGLE CREDENTIALS",
});

// Tell puppeteer to use puppeteer stealth
puppeteer.use(pluginStealth());

(async () => {
    // Instantiate a new browser object
    // Ignore errors associated to https
    // Can be headless but for example sake we want to show the browser
    // Set your desired arguments for your puppeteer browser
    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        headless: false,
        args: [
            `--window-size=600,1000`,
            "--window-position=000,000",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            '--user-data-dir="/tmp/chromium"',
            "--disable-web-security",
            "--disable-features=site-per-process",
        ],
    });

    // Get browser pages
    const [page] = await browser.pages();

    // Send page to your url
    await page.goto("URL OF PAGE WITH CAPTCHA ON IT");

    // Remove the page's default timeout function
    await page.setDefaultNavigationTimeout(0);

    // Call hcaptcha method passing in our page and google vision client
    await hcaptcha(page, client);

    // Your page is ready to submit. Captcha solving should be the last function on your page so we don't have to worry about the response token expiring.
})();
```

### Return response token only

```javascript
// Require puppeteer extra, puppeteer stealth, google vision
const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
const vision = require("@google-cloud/vision");

// Require our hcaptchaToken method
const { hcaptchaToken } = require("./hcaptcha");

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
    let token = await hcaptchaToken("URL OF PAGE WITH CAPTCHA ON IT", client);

    // W0_eyJ0eXAiOiJ...
    console.log(token);
})();
```

## Known Issues

```bash
UnhandledPromiseRejectionWarning: Error: 13 INTERNAL: Received RST_STREAM with code 2 triggered by internal client error: read ECONNRESET
```

Stems from Google Vision API. Occurs when too many requests are sent to Google Vision within a small time period.
