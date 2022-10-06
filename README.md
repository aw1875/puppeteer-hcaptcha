## hCaptcha solver for puppeteer

#### ⚠️ Important ⚠️

I'm currently searching for a better TFJS model as it seems the coco-ssd model thats currently being used is struggling with hCaptchas images more frequently as they are now blurred a little. If you have any suggestions please create a new issue with the TFJS recommendation template so I can take a look. Thanks!

---

Most recent updates to the code can be found on the [typescript](https://github.com/aw1875/puppeteer-hcaptcha/tree/typescript) branch.

---

A library to solve hcaptcha challenges that are automated within puppeteer. You can automatically set response values where they should be so the only thing left for you is submitting the page or you can get the response token. Average response time is rougly 13 - 20 seconds with TensorFlow's Image Recognition.

<img src="images/demo.gif" height="400px"/>

### If you like this project feel free to donate!

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/donate/?hosted_button_id=YM522XYP26LWU)

## Install

```bash
npm i puppeteer-hcaptcha
```

## Usage

```javascript
await hcaptcha(page);
```

-   `page` [&lt;Page&gt;](https://pptr.dev/#?product=Puppeteer&version=v12.0.1&show=api-class-page) - Puppeteer Page Instance

```javascript
await hcaptchaToken(url);
```

-   `url` [&lt;string&gt;](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) - URL of page with captcha on it

### Automatically set respone value ([see demo](https://github.com/aw1875/puppeteer-hcaptcha/blob/master/demos/solve.js))

```javascript
// Require puppeteer extra and puppeteer stealth
const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");

// Require our hcaptcha method
const { hcaptcha } = require("puppeteer-hcaptcha");

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

    // Call hcaptcha method passing in our page
    await hcaptcha(page);

    // Your page is ready to submit.
    // Captcha solving should be the last function on your page so we
    // don't have to worry about the response token expiring.
    /**
     * Example:
     * await page.click("loginDiv > loginBtn");
     */
})();
```

### Return response token only ([see demo](https://github.com/aw1875/puppeteer-hcaptcha/blob/master/demos/token.js))

```javascript
// Require our hcaptchaToken method
const { hcaptchaToken } = require("puppeteer-hcaptcha");

(async () => {
    // Create Start Time
    const startTime = Date.now();

    // Call hcaptchaToken method passing in your url
    let token = await hcaptchaToken("URL OF PAGE WITH CAPTCHA ON IT");

    // Get End Time
    const endTime = Date.now();

    // Log timed result to console
    console.log(`Completed in ${(endTime - startTime) / 1000} seconds`);

    // P0_eyJ0eXAiOiJ...
    console.log(token);
})();
```

## Credits

-   Thanks to [Futei](https://github.com/Futei/SineCaptcha), [JimmyLaurent](https://github.com/JimmyLaurent/hcaptcha-solver/), [Nayde](https://github.com/nayde-fr), [DinoHorvat](https://github.com/dinohorvat), and [Tal](https://github.com/JustTalDevelops/)

## Changelog

### 4.1.6 (July 27, 2022)

-   Small modifications to the code to handle websites that are switching away from the `newassets` subdomain. Thanks to [mikedidomizio](https://github.com/mikedidomizio) for making the changes ([#65](https://github.com/aw1875/puppeteer-hcaptcha/pull/65))

### 4.1.5 (Febuary 15, 2021)

-   Modified package to work with forked version of ghost-cursor (@aw1875/ghost-cursor)
-   Exposed `solveCaptcha` function from merged PR

### 4.1.4 (December 27, 2021)

-   Made small change to request as potential fix for [#27](https://github.com/aw1875/puppeteer-hcaptcha/issues/27) and [#30](https://github.com/aw1875/puppeteer-hcaptcha/issues/30)
-   Cleaned up documentation within code

### 4.1.3 (December 22, 2021)

-   Temporary inclusion of my forked version of [ghost-cursor](https://github.com/Xetera/ghost-cursor) until PR is accepted.
-   Should fix issue requests as timestamps are required to be associated with mouse movements send with requests.

### 4.1.2 (December 16, 2021)

-   Fixed asset url to reflect new hCaptcha asset url

### 4.1.1 (December 14, 2021)

-   Fixed code inconsistency

### 4.1.0 (December 14, 2021)

-   Setup TensorFlow tasks to run in parallel using `Promise.All` which seems to have drastically improved speeds solving [#23](https://github.com/aw1875/puppeteer-hcaptcha/issues/23)
-   Test results seem to mostly be between the 13 - 16 second range (with a few outliers between 19 - 20)
-   Will continue looking into ways to get back to the old speeds from using Google Cloud Vision
    -   Looking into the potential of using C++ or C# as a backend for true threading with the help of [edge-js](https://github.com/agracio/edge-js) or something similar

### 4.0.1 (December 8, 2021)

-   Fixed issue where `useragents.json` file couldn't be found

### 4.0.0 (December 8, 2021)

-   Removed Google Cloud Vision from dependencies
-   Integrated TensorFlow Image Recognition instead
-   Created fix for checking answer requests failing
-   Cleaned up functions
-   Documented all functions within code

### 3.0.6 (December 7, 2021)

-   Removed setting the `g-recaptcha-response` as hCaptcha no longer requires this

### 3.0.5 (December 7, 2021)

-   Added functions to dynamically get HSW/HSL version for getting tasklist
-   Updated headers to properly request for tokens

### 3.0.4 (April 30, 2021)

-   Added fix for cloudflare sites with regards to HSJ request checks

### 3.0.3 (April 29, 2021)

-   Fixed issue finding useragents file

### 3.0.2 (April 23, 2021)

-   Reverted changes made in v3.0.1
-   Created temporary fix for HSJ requests while I look into a proper solution

### 3.0.1 (April 22, 2021)

-   Pushed a fix for when the response token is received from the initial request

### 3.0.0 (April 4, 2021)

-   Big changes to solving logic to follow changes that hCaptcha has made to their requests.

### 2.0.2 - 2.0.3 (April 2, 2021)

-   Made changes to requests based on changes hCaptcha made. Added list of User Agents so that they are randomized on request (seems to speed up response time generally)

-   Fixed issue finding useragents file

### 2.0.1 (March 28, 2021)

-   Fixed issues with cloudflare sites not returning solved token (see [#2](https://github.com/aw1875/puppeteer-hcaptcha/issues/2)).

### 2.0.0 (March 23, 2021)

-   Added Google Vision for image recognition to speed up the process
-   Added ability to solve captcha on a page or just return the response token
-   Massive shoutout goes to [Tal](https://github.com/JustTalDevelops/) for all the help implementing Google Vision
    -   The idea to do this came from him. He has a super quick solver for [GoLang](https://github.com/JustTalDevelops/hcaptcha-solver-go) if you are looking for that. He also added a [REST API Version](https://github.com/JustTalDevelops/hcaptcha-solver-api) of his solver that can definitely be useful if you don't know anything about GoLang

### 1.0.1 - 1.0.2 (March 16, 2021)

-   Small updates to README documentation

### 1.0.0 (March 16, 2021)

-   Initial release
-   Huge shoutout to these people for the release of this package
    -   [Futei](https://github.com/Futei/SineCaptcha) - Initial project
    -   [JimmyLaurent](https://github.com/JimmyLaurent/hcaptcha-solver/) - Initial Node Module
    -   [Nayde](https://github.com/nayde-fr) - The idea of porting functionality to be usable through puppeteer
    -   [DinoHorvat](https://github.com/dinohorvat) - Help with response token issue (workaround was found out before release)

## Known Issues

```bash
I tensorflow/core/platform/cpu_feature_guard.cc:142] This TensorFlow binary is optimized with oneAPI Deep Neural Network Library (oneDNN) to use the following CPU instructions in performance-critical operations:  AVX2
To enable them in other operations, rebuild TensorFlow with the appropriate compiler flags.
```

Stems from TensorFlow. Not entirely sure how to fix this but it doesn't impact the solver.
