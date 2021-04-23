## hCaptcha solver for puppeteer

A library to solve hcaptcha challenges that are automated within puppeteer. You can automatically set response values where they should be so the only thing left for you is submitting the page or you can get the response token. Average response time is 2-12 seconds (if Google isn't rate limiting for too many requests, otherwise it can take much longer or possibly fail).

<img src="images/demo.gif" height="250px"/>

## Install

```bash
npm i puppeteer-hcaptcha
```

## Usage

```javascript
await hcaptcha(page, client);
```
- `page` - Puppeteer Page Type
- `client` - Google Vision ImageAnnotatorClient Type

```javascript
await hcaptchaToken(url, client)
```
- `url` - `string`: url of page with captcha on it
- `client` - Google Vision ImageAnnotatorClient Type

### Automatically set respone value ([see demo](https://github.com/aw1875/puppeteer-hcaptcha/blob/master/demos/solve.js))

```javascript
// Require puppeteer extra, puppeteer stealth, google vision
const puppeteer = require('puppeteer-extra')
const pluginStealth = require('puppeteer-extra-plugin-stealth')
const vision = require("@google-cloud/vision");

// Require our hcaptcha method
const { hcaptcha } = require('puppeteer-hcaptcha');

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
          "--disable-features=site-per-process"
        ],
      });

    // Get browser pages
    const [page] = await browser.pages();

    // Send page to your url
    await page.goto('URL OF PAGE WITH CAPTCHA ON IT')

    // Remove the page's default timeout function
    await page.setDefaultNavigationTimeout(0);

    // Call hcaptcha method passing in our page and google vision client
    await hcaptcha(page, client);

    // Your page is ready to submit. Captcha solving should be the last function on your page so we don't have to worry about the response token expiring.
})();
```

### Return response token only ([see demo](https://github.com/aw1875/puppeteer-hcaptcha/blob/master/demos/token.js))
```javascript
// Require puppeteer extra, puppeteer stealth, google vision
const puppeteer = require('puppeteer-extra')
const pluginStealth = require('puppeteer-extra-plugin-stealth')
const vision = require("@google-cloud/vision");

// Require our hcaptchaToken method
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
```

## Credits

- Thanks to [Futei](https://github.com/Futei/SineCaptcha), [JimmyLaurent](https://github.com/JimmyLaurent/hcaptcha-solver/), [Nayde](https://github.com/nayde-fr), [DinoHorvat](https://github.com/dinohorvat), and [Tal](https://github.com/JustTalDevelops/)

## Changelog

### 3.0.2 (April 23, 2021)
- Reverted changes made in v3.0.1
- Created temporary fix for HSJ requests while I look into a proper solution

### 3.0.1 (April 22, 2021)
- Pushed a fix for when the response token is received from the initial request

### 3.0.0 (April 4, 2021)
- Big changes to solving logic to follow changes that hCaptcha has made to their requests.

### 2.0.2 - 2.0.3 (April 2, 2021)
- Made changes to requests based on changes hCaptcha made. Added list of User Agents so that they are randomized on request (seems to speed up response time generally)

- Fixed issue finding useragents file

### 2.0.1 (March 28, 2021)
- Fixed issues with cloudflare sites not returning solved token (see [#2](https://github.com/aw1875/puppeteer-hcaptcha/issues/2)).

### 2.0.0 (March 23, 2021)

- Added Google Vision for image recognition to speed up the process
- Added ability to solve captcha on a page or just return the response token
- Massive shoutout goes to [Tal](https://github.com/JustTalDevelops/) for all the help implementing Google Vision
  - The idea to do this came from him. He has a super quick solver for [GoLang](https://github.com/JustTalDevelops/hcaptcha-solver-go) if you are looking for that. He also added a [REST API Version](https://github.com/JustTalDevelops/hcaptcha-solver-api) of his solver that can definitely be useful if you don't know anything about GoLang

### 1.0.1 - 1.0.2 (March 16, 2021)

- Small updates to README documentation

### 1.0.0 (March 16, 2021)

- Initial release
- Huge shoutout to these people for the release of this package
    - [Futei](https://github.com/Futei/SineCaptcha) - Initial project
    - [JimmyLaurent](https://github.com/JimmyLaurent/hcaptcha-solver/) - Initial Node Module
    - [Nayde](https://github.com/nayde-fr) - The idea of porting functionality to be usable through puppeteer
    - [DinoHorvat](https://github.com/dinohorvat) - Help with response token issue (workaround was found out before release)

## Known Issues
```bash
UnhandledPromiseRejectionWarning: Error: 13 INTERNAL: Received RST_STREAM with code 2 triggered by internal client error: read ECONNRESET
```
Stems from Google Vision API. Occurs when too many requests are sent to Google Vision within a small time period.