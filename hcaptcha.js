const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
const request = require("request-promise-native");
const userAgents = JSON.parse(require('fs').readFileSync(`${__dirname}/src/useragents.json`));
const { rdn, getMouseMovements } = require("./src/utils");
const jwt_decode = require('jwt-decode');
require("@google-cloud/vision");

// Setup Google Vision Client
let client;

// Instantiate Version
let version;

puppeteer.use(pluginStealth());

async function getHSL(req) {
  version = jwt_decode(req)["l"].slice("https://newassets.hcaptcha.com/c/".length);
  const hsl = await request.get(`${jwt_decode(req)["l"]}/hsl.js`);

  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    headless: true,
    args: [
      `--window-size=1300,570`,
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
  await page.addScriptTag({
    content: hsl
  });

  const response = await page.evaluate(`hsl("${req}")`);
  await browser.close();

  return response;
}

async function getHSW(req) {
  version = jwt_decode(req)["l"].slice("https://newassets.hcaptcha.com/c/".length);
  const hsw = await request.get(`${jwt_decode(req)["l"]}/hsw.js`);

  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    headless: true,
    args: [
      `--window-size=1300,570`,
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
  await page.addScriptTag({
    content: hsw
  });

  const response = await page.evaluate(`hsw("${req}")`);
  await browser.close();

  return response;
}

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
  // Create headers
  let headers = {
    "Authority": "hcaptcha.com",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://newassets.hcaptcha.com",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "User-Agent": userAgent
  };
  
  // Check site config
  let response = await request({
    method: 'get',
    headers,
    json: true,
    url: `https://hcaptcha.com/checksiteconfig?host=${host}&sitekey=${sitekey}&sc=1&swa=1`
  });

  let timestamp = Date.now() + rdn(30, 120);

  // Check for HSJ
  if (response.c !== undefined && response.c.type === "hsj") {
    console.error('Wrong Challenge Type. Retrying.');
    return null;
  }
  
  // Setup form for getting tasks list 
  if (response.c === undefined) {
    form = {
      sitekey,
      host,
      hl: 'en',
      motionData: {
        st: timestamp,
        mm: getMouseMovements(timestamp)
      },
    }
  } else {
    form = {
      sitekey,
      host,
      hl: 'en',
      motionData: {},
      n: response.c.type === "hsl" ? await getHSL(response.c.req) : await getHSW(response.c.req),
      v: version,
      c: JSON.stringify(response.c)
    }
  }

  // Get tasks
  let getTasks = await request({
    method: "post",
    headers,
    json: true,
    url: `https://hcaptcha.com/getcaptcha?s=${sitekey}`,
    form: form
  });

  if (getTasks.generated_pass_UUID) {
    return getTasks.generated_pass_UUID;
  }

  // Find what the captcha is looking for user's to click
  const requestImageArray = getTasks.requester_question.en.split(" ");
  let request_image = requestImageArray[requestImageArray.length - 1];
  if (request_image === "motorbus") {
    request_image = "bus"
  } else {
    request_image = requestImageArray[requestImageArray.length - 1];
  }

  const key = getTasks.key;
  if (key.charAt(0) !== "E" && key.charAt(2) === "_") {
    return key;
  }

  const tasks = getTasks.tasklist;
  const job = getTasks.request_type;
  timestamp = Date.now() + rdn(30, 120);

  // Get Answers
  const answers = await getAnswers(request_image, tasks);

  // Renew response
  response = await request({
    method: 'get',
    headers,
    json: true,
    url: `https://hcaptcha.com/checksiteconfig?host=${host}&sitekey=${sitekey}&sc=1&swa=1`
  });

  // Setup data for checking answers
  if (response.c === undefined) {
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
    }
  } else {
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
      n: await getHSL(response.c.req),
      c: JSON.stringify(response.c)
    }
  }

  // Set new headers
  headers = {
    "Authority": "hcaptcha.com",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "Origin": "https://newassets.hcaptcha.com",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "User-Agent": userAgent,
  };

  // Check answers
  const checkAnswers = await request(`https://hcaptcha.com/checkcaptcha/${key}?s=${sitekey}`, {
    method: "post",
    headers,
    json: true,
    body: captchaResponse,
  });

  if (checkAnswers.generated_pass_UUID) {
    return checkAnswers.generated_pass_UUID;
  }

  console.error('Wrong Response. Retrying.');
  return null;
}

async function solveCaptcha(siteKey, host) {
  try {
    while (true) {
      // Get random index for random user agent
      const randomIndex = Math.round(Math.random() * ((userAgents.length - 1) - 0) + 0)

      // Attempt to solve hCaptcha
      const result = await tryToSolve(userAgents[randomIndex].useragent, siteKey, host);
      if (result && result !== null) {
        return result;
      }
    }
  } catch (e) {
    if (e.statusCode === 429) {
      // Reached rate limit, wait 30 sec
      console.log('Rate limited. Waiting 30 seconds.');
      await new Promise((r) => setTimeout(r, 30000));
    } else {
      throw e;
    }
  }
}

async function hcaptcha(page, visionClient) {
  // Set client passed in to Google Client
  client = await visionClient;

  // Expose the page to our solveCaptcha function so we can utilize it
  await page.exposeFunction("solveCaptcha", solveCaptcha);

  // Wait for iframe to load
  await page.waitForSelector('iframe[src*="assets.hcaptcha.com"]');

  const token = await page.evaluate(async () => {
    // Get hcaptcha iframe so we can get the host value
    const iframesrc = document.querySelector(
      'iframe[src*="assets.hcaptcha.com"]'
    ).src;
    const urlParams = new URLSearchParams(iframesrc);

    return await solveCaptcha(
      urlParams.get("sitekey"),
      urlParams.get("host")
    );
  });

  await page.evaluate((token) => {
    document.querySelector('[name="h-captcha-response"]').value = token;
  }, token)

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