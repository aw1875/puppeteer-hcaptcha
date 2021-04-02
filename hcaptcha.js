const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
const request = require("request-promise-native");
const userAgents = JSON.parse(require('fs').readFileSync('./src/useragents.json'));
const { rdn, getMouseMovements } = require("./src/utils");
require("@google-cloud/vision");

// Setup Google Vision Client
let client;

puppeteer.use(pluginStealth());

async function getAnswers(request_image, tasks) {
  let answers = new Map();
  for (const task of tasks) {
    await client.objectLocalization(task.datapoint_uri).then((res) => {
      let [data] = res;
      if (data.localizedObjectAnnotations.find((i) => i.name.toUpperCase() === request_image.toUpperCase() && i.score > 0.5)) {
        answers[task.task_key] = "true";
      } else {
        answers[task.task_key] = "false";
      }
    });
  }

  return answers;
}

async function tryToSolve(userAgent, sitekey, host) {
  let headers = {
    "Authority": "hcaptcha.com",
    "Accept": "application/json",
    "User-Agent": userAgent,
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://assets.hcaptcha.com",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Accept-Language": "en-US,en;q=0.9",
  };

  let timestamp = Date.now() + rdn(30, 120);
  
  let response = await request({
    method: "post",
    headers,
    json: true,
    url: "https://hcaptcha.com/getcaptcha",
    form: {
      sitekey,
      host,
      hl: 'en',
      motionData: {
        st: timestamp,
        mm: getMouseMovements(timestamp),
      }
    }
  });

  if (response.generated_pass_UUID) {
    return response.generated_pass_UUID;
  }

  const requestImageArray = response.requester_question.en.split(" ");
  let request_image = requestImageArray[requestImageArray.length - 1];
  if (request_image === "motorbus") {
    request_image = "bus"
  } else {
    request_image = requestImageArray[requestImageArray.length - 1];
  }

  const key = response.key;
  if (key.charAt(2) === "_") {
    return key;
  }

  const tasks = response.tasklist;
  const job = response.request_type;
  timestamp = Date.now() + rdn(30, 120);

  // Get Answers
  const answers = await getAnswers(request_image, tasks);

  // Check answers
  let captchaResponse;
  captchaResponse = {
    job_mode: job,
    answers,
    serverdomain: host,
    sitekey,
    motionData: JSON.stringify({
      st: timestamp,
      dct: timestamp,
      mm: getMouseMovements(timestamp),
    }),
    n: null,
    c: "null",
  };

  headers = {
    "Authority": "hcaptcha.com",
    "Accept": "application/json",
    "User-Agent": userAgent,
    "Content-Type": "application/json",
    "Origin": "https://assets.hcaptcha.com",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Accept-Language": "en-US,en;q=0.9",
  };

  response = await request(`https://hcaptcha.com/checkcaptcha/${key}`, {
    method: "post",
    headers,
    json: true,
    body: captchaResponse,
  });

  if (response.generated_pass_UUID) {
    return response.generated_pass_UUID;
  }
}

async function solveCaptcha(siteKey, host) {
  try {
    while (true) {
      const randomIndex = Math.round(Math.random() * ((userAgents.length - 1) - 0) + 0)
      const result = await tryToSolve(userAgents[randomIndex].useragent, siteKey, host);
      if (result && result !== null) {
        return result;
      }
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

async function hcaptcha(browser, page, visionClient) {
  // Set client passed in to Google Client
  client = await visionClient;

  // Get useragent from browser which is super useful paired with puppeteer stealth
  const userAgent = await browser.userAgent();

  // Expose the page to our solveCaptcha function so we can utilize it
  await page.exposeFunction("solveCaptcha", solveCaptcha);

  // Wait for iframe to load
  await page.waitForSelector('iframe[src*="assets.hcaptcha.com"]');

  await page.evaluate(async (userAgent) => {
    // Get hcaptcha iframe so we can get the host value
    const iframesrc = document.querySelector(
      'iframe[src*="assets.hcaptcha.com"]'
    ).src;
    const urlParams = new URLSearchParams(iframesrc);

    let response = await solveCaptcha(
      urlParams.get("sitekey"),
      urlParams.get("host")
    );
    document.querySelector('[name="h-captcha-response"]').value = response;
    document.querySelector('[name="g-recaptcha-response"]').value = response;
  }, userAgent);

  return;
}

async function hcaptchaToken(url, visionClient) {
  // Set client passed in to Google Client
  if (!visionClient) {
    return undefined
  }

  client = await visionClient;

  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    headless: true,
  });

  // Get browser pages
  const [page] = await browser.pages();
  await page.goto(url)
  await page.setDefaultNavigationTimeout(0);

  // Wait for iframe to load
  await page.waitForSelector('iframe[src*="assets.hcaptcha.com"]');

  let captchaData = await page.evaluate(async () => {
    // Get hcaptcha iframe so we can get the host value
    const iframesrc = document.querySelector(
      'iframe[src*="assets.hcaptcha.com"]'
    ).src;
    const urlParams = new URLSearchParams(iframesrc);

    return [urlParams.get('sitekey'), urlParams.get('host')];
  });

  await browser.close()

  // Solve Captcha
  return await solveCaptcha(captchaData[0], captchaData[1]);
}


module.exports = { hcaptcha, hcaptchaToken };