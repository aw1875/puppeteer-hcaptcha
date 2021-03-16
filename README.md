## hCaptcha solver for puppeteer

A library to solve hcaptcha challenges that are automated within puppeteer

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
    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        headless: false,    // Can be headless but for example sake we want to show the browser
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

    const page = await browser.newPage();
    await page.goto('URL OF PAGE WITH CAPTCHA ON IT')
    await page.setDefaultNavigationTimeout(0);

    await hcaptcha(browser, page);

    // The captcha has been solved and can be submitted now.
    // This should be the last function on your page if you
    // required to fill out other information on the page so 
    // We don't have to worry about the response token expiring
})();
```

## Credits

- Thanks to [Futei](https://github.com/Futei/SineCaptcha), [JimmyLaurent](https://github.com/JimmyLaurent/hcaptcha-solver/), [Nayde](https://github.com/nayde-fr), and [DinoHorvat](https://github.com/dinohorvat)