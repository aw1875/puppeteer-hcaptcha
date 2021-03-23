const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
const request = require("request-promise-native");
const axios = require("axios");
const { rdn, getMouseMovements } = require("./src/utils");
require("@google-cloud/vision");

// Setup Google Vision Client
let client;

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
    url: "https://assets.hcaptcha.com/c/6043b6da/hsw.js",
  });

  let hswResponse = await page.evaluate(
    (response) => hsw(response.c.req),
    response
  );
  browser.close();

  return [hswResponse, response["c"]];
}

async function getAnswers(request_image, tasks) {
  let answers = new Map();
  for (const task of tasks) {
    await client.objectLocalization(task.datapoint_uri).then((res) => {
      let [data] = res;
      if (
        data.localizedObjectAnnotations.find(
          (i) =>
            i.name.toUpperCase() === request_image.toUpperCase() &&
            i.score > 0.5
        )
      ) {
        answers[task.task_key] = "true";
      } else {
        answers[task.task_key] = "false";
      }
    });
  }

  return answers;
}

async function tryToSolve(userAgent, sitekey, host) {
  // Get our hsw response as a variable so we can post for our response token
  let hswResponse = await getHSW(host, sitekey);

  let headers = {
    Authority: "hcaptcha.com",
    Accept: "application/json",
    "User-Agent": userAgent,
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "https://assets.hcaptcha.com",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Accept-Language": "en-US,en;q=0.9",
  };

  let timestamp = Date.now() + rdn(30, 120);
  try {
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
  } catch {
    return null;
  }

  if (response.generated_pass_UUID) {
    return response.generated_pass_UUID;
  }

  const requestImageArray = response.requester_question.en.split(" ");
  const request_image = requestImageArray[requestImageArray.length - 1];

  const key = response.key;
  const tasks = response.tasklist;
  const job = response.request_type;
  timestamp = Date.now() + rdn(30, 120);

  // Get Answers
  const answers = await getAnswers(request_image, tasks);

  // Get new hsw values
  hswResponse = await getHSW(host, sitekey);

  const captchaResponse = {
    job_mode: job,
    answers,
    serverdomain: host,
    sitekey,
    motionData: JSON.stringify({
      st: timestamp,
      dct: timestamp,
      mm: getMouseMovements(timestamp),
    }),
    n: hswResponse[0],
    c: JSON.stringify(hswResponse[1]),
  };

  headers = {
    Authority: "hcaptcha.com",
    Accept: "application/json",
    "User-Agent": userAgent,
    "Content-Type": "application/json",
    Origin: "https://assets.hcaptcha.com",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    response = await request(`https://hcaptcha.com/checkcaptcha/${key}`, {
      method: "post",
      headers,
      json: true,
      body: captchaResponse,
    });
  } catch {
    return null;
  }

  if (response.generated_pass_UUID) {
    return response.generated_pass_UUID;
  }
}

async function solveCaptcha(userAgent, siteKey, host) {
  try {
    while (true) {
      const result = await tryToSolve(userAgent, siteKey, host);
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

  await page.evaluate(async (userAgent) => {
    // Get hcaptcha iframe so we can get the host value
    const iframesrc = document.querySelector(
      'iframe[src*="assets.hcaptcha.com"]'
    ).src;
    const urlParams = new URLSearchParams(iframesrc);

    let response = await solveCaptcha(
      userAgent,
      urlParams.get("sitekey"),
      urlParams.get("host")
    );
    document.querySelector('[name="h-captcha-response"]').value = response;
    document.querySelector('[name="g-recaptcha-response"]').value = response;
  }, userAgent);

  return;
}

async function hcaptchaToken(url, visionClient) {
  // Create token var
  let token;

  // Set client passed in to Google Client
  if (!visionClient) {
    return undefined
  }

  client = await visionClient;

  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    headless: true,
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
  await page.goto(url)
  await page.setDefaultNavigationTimeout(0);
  
  // Get useragent from browser which is super useful paired with puppeteer stealth
  const userAgent = await browser.userAgent();

  // Expose the page to our solveCaptcha function so we can utilize it
  await page.exposeFunction("solveCaptcha", solveCaptcha);

  token = await page.evaluate(async (userAgent) => {
    // Get hcaptcha iframe so we can get the host value
    const iframesrc = document.querySelector(
      'iframe[src*="assets.hcaptcha.com"]'
    ).src;
    const urlParams = new URLSearchParams(iframesrc);

    return await solveCaptcha(
      userAgent,
      urlParams.get("sitekey"),
      urlParams.get("host")
    );
  }, userAgent);

  return token;
}


module.exports = { hcaptcha, hcaptchaToken };