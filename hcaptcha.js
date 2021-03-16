const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
const request = require("request-promise-native");
const axios = require("axios");
const {
  rdn,
  randomTrueFalse,
  uuid,
  getMouseMovements,
} = require("./src/utils");

puppeteer.use(pluginStealth());

async function getHSW(host, sitekey) {
  let response = (
    await axios.get(
      `https://hcaptcha.com/checksiteconfig?host=${host}&sitekey=${sitekey}&sc=1&swa=1`
    )
  ).data;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      '--user-data-dir="/tmp/chromium"',
      "--disable-web-security",
      "--disable-features=site-per-process",
    ],
  });

  const [page] = await browser.pages();
  await page.addScriptTag({
    url: "https://assets.hcaptcha.com/c/0f75558d/hsw.js",
  });

  let hswResponse = await page.evaluate(
    (response) => hsw(response.c.req),
    response
  );
  browser.close();

  return [hswResponse, response["c"]];
}

async function tryToSolve(sitekey, host, headers) {
  // Get our hsw response as a variable so we can post for our response token
  let hswResponse = await getHSW(host, sitekey);

  let timestamp = Date.now() + rdn(30, 120);
  response = await request({
    method: "post",
    headers,
    json: true,
    url: "https://hcaptcha.com/getcaptcha",
    form: {
      sitekey,
      host,
      n: hswResponse[0],
      c: JSON.stringify(hswResponse[1]),
      motionData: {
        st: timestamp,
        dct: timestamp,
        mm: getMouseMovements(timestamp),
      },
    },
  });

  if (response.generated_pass_UUID) {
    return response.generated_pass_UUID;
  }

  const key = response.key;
  const tasks = response.tasklist;
  const job = response.request_type;
  timestamp = Date.now() + rdn(30, 120);
  const answers = tasks.reduce(
    (accum, t) => ({ ...accum, [t.task_key]: randomTrueFalse() }),
    {}
  );
  const captchaResponse = {
    answers,
    sitekey,
    serverdomain: host,
    job_mode: job,
    motionData: {
      st: timestamp,
      dct: timestamp,
      mm: getMouseMovements(timestamp),
    },
  };

  response = await request(`https://hcaptcha.com/checkcaptcha/${key}`, {
    method: "post",
    headers,
    json: true,
    form: captchaResponse,
  });

  if (response.generated_pass_UUID) {
    return response.generated_pass_UUID;
  }
}

async function solveCaptcha(headers, host) {
  const siteKey = uuid();

  try {
    const result = await tryToSolve(siteKey, host, headers);
    if (result) {
      return result;
    }
  } catch (e) {
    if (e.statusCode === 429) {
      // reached rate limit, wait 30 sec
      await new Promise((r) => setTimeout(r, 30000));
    } else {
      throw e;
    }
  }
}

async function hcaptcha(browser, page) {
  // Get useragent from browser which is super useful paired with puppeteer stealth
  const userAgent = await browser.userAgent();

  // Expose the page to our solveCaptcha function so we can utilize it
  await page.exposeFunction("solveCaptcha", solveCaptcha);

  await page.evaluate(async (userAgent) => {
    // Get hcaptcha iframe so we can get the host value
    const iframesrc = document.querySelector(
      'iframe[src*="assets.hcaptcha.com"]'
    ).src;
    const urlParams = new URLSearchParams(iframesrc);

    while (true) {
      try {
        // Pass useragent and host value to solveCaptcha
        let response = await solveCaptcha(userAgent, urlParams.get("host"));

        // Once we have the response set the required elements to the response
        document.querySelector('[name="h-captcha-response"]').value = response;
        document.querySelector(
          '[name="g-recaptcha-response"]'
        ).value = response;
        break;
      } catch {
        // Keep retrying
      }
    }
  }, userAgent);

  // Submit form
  return;
}

module.exports = hcaptcha;
