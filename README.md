## hCaptcha solver for puppeteer

A library to solve hcaptcha challenges that are automated within puppeteer. Automatically sets response values where they should be so the only thing left for you is submitting the page!

## Install

```bash
npm i puppeteer-hcaptcha
```

## Quick Example

```js
const puppeteer = require('puppeteer-extra')
const pluginStealth = require('puppeteer-extra-plugin-stealth')
const hcaptcha = require('puppeteer-hcaptcha');

puppeteer.use(pluginStealth());

(async () => {
    const browser = await puppeteer.launch({            // Instantiate a new browser object
        ignoreHTTPSErrors: true,                        // Ignore errors assocaited to https
        headless: false,                                // Can be headless but for example sake we want to show the browser
        args: [                                         // Set your desired arguements for your puppeteer browser
          `--window-size=600,1000`,
          "--window-position=000,000",
          "--disable-dev-shm-usage",
          "--no-sandbox",
          '--user-data-dir="/tmp/chromium"',
          "--disable-web-security",
          "--disable-features=site-per-process"
        ],
      });

    const page = await browser.newPage();               // Create new page in your browser
    await page.goto('URL OF PAGE WITH CAPTCHA ON IT')   // Set url for your page to go to
    await page.setDefaultNavigationTimeout(0);          // Remove the page's default timeout function

    await hcaptcha(browser, page);                      // Call the hcaptcha function with your browser and page passed through

    // Your page is ready to submit. Captcha solving should be the last function on your page so we don't have to worry about the response token expiring.
})();
```

## Credits

- Thanks to [Futei](https://github.com/Futei/SineCaptcha), [JimmyLaurent](https://github.com/JimmyLaurent/hcaptcha-solver/), [Nayde](https://github.com/nayde-fr), and [DinoHorvat](https://github.com/dinohorvat)

## Changelog

### 1.0.1 - 1.0.2 (March 16, 2021)

- Small updates to README documentation

### 1.0.0 (March 16, 2021)

- Initial release
- Huge shoutout to these people for the release of this package
    - [Futei](https://github.com/Futei/SineCaptcha) - Initial project
    - [JimmyLaurent](https://github.com/JimmyLaurent/hcaptcha-solver/) - Initial Node Module
    - [Nayde](https://github.com/nayde-fr) - The idea of porting functionality to be usable through puppeteer
    - [DinoHorvat](https://github.com/dinohorvat) - Help with response token issue (workaround was found out before release)