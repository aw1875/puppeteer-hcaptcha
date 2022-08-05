import puppeteer from 'puppeteer'
import axios from 'axios';
import Utils from './utils.js';
import jwtDecode from 'jwt-decode';

// Setup UserAgents list
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { readFileSync } from 'fs';
const userAgents = JSON.parse(readFileSync(`${__dirname}/useragents.json`, 'utf8'));

// Setup variables to be set at runtime
let version: string;
let userAgent: string;
let showStatus: boolean;

interface JwtResponse {
    f: number;
    s: number;
    t: string;
    d: string;
    l: string;
    e: number;
}

interface CaptchaData {
    sitekey: string;
    host: string;
}

interface SiteConfig {
    feature?: any;
    c?: {
        type: string;
        req: string;
    };
    pass?: boolean;
}

enum Color {
    Red = "\x1b[31m",
    Green = "\x1b[32m",
    Cyan = "\x1b[36m",
    Clear = "\x1b[0m",
}

namespace hCaptcha {
    /**
     * @description Dynamically get HSL or HSW token needed to solve captcha
     * @param {SiteConfig.c} { req, type } Deferenced request and type returned from the site config
     * @returns {Promise<string>} n Token
     */
    const nToken = async ({ req, type }): Promise<string> => {
        const token = jwtDecode<JwtResponse>(req);

        // Set Version
        version = token.l.slice(
            "https://newassets.hcaptcha.com/c/".length
        )

        // Inject script into puppeteer page
        const browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: true,
        });
        const [page] = await browser.pages();
        await page.addScriptTag({
            url: `${token.l}/${type}.js`
        });

        // Get Response
        const response = await page.evaluate(`${type}("${req}")`) as string;
        await browser.close();

        return response;
    }

    /**
     * @description Takes all images and classifies each as true or false if they represent the requested image type
     * @param {Object} { requester_question, tasklist } Deferenced requester_question and tasklist returned from getTasks request 
     * @returns {Promise<Map<string, string>>} Answers as a map of the image task_key and "true" or "false"
     */
    const getAnswers = async ({ requester_question, tasklist }): Promise<Map<string, string>> => {
        // Request Image
        const requestImage = requester_question.en.split(' ').at(-1);

        // Create answers map
        const answers = new Map();
        const threads: any = [];

        for (const task of tasklist) {
            threads.push(Utils.tensor(task.datapoint_uri));
        }

        try {
            await Promise.all(threads).then((results) => {
                results.forEach((res, i) => {
                    const [data] = res;

                    if (data && Utils.isValid(data, requestImage))
                        answers[tasklist[i].task_key] = "true"
                    else
                        answers[tasklist[i].task_key] = "false"
                })
            })
        } catch (err: any) {
            logger(err, Color.Red);
        }

        return answers;
    }

    /**
     * @description Main solve logic
     * @param {CaptchaData} { sitekey, host } Deferenced sitekey and host returned from captchaData
     * @returns {Promise<string | null>} Valid answer token or null if anything fails
     */
    const solve = async ({ sitekey, host }: CaptchaData): Promise<string | null> => {
        // Create headers
        let headers = {
            Authority: "hcaptcha.com",
            Accept: "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: "https://newassets.hcaptcha.com",
            Origin: "https://newassets.hcaptcha.com",
            "Sec-Fetch-Site": "same-site",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "User-Agent": userAgent
        };

        logger("Checking Site Config", Color.Cyan);

        // Check site config
        const response: SiteConfig | null = await axios.get<SiteConfig>(`https://hcaptcha.com/checksiteconfig?host=${host}&sitekey=${sitekey}&sc=1&swa=1`, { headers })
            .then((res) => res.data)
            .catch((err) => { logger(`Failed getting site config with error code ${err.response.status}`, Color.Red); return null; })

        if (!response)
            return null;

        logger("Got config", Color.Green);
        if (response.c && response.c.type === "hsj") {
            logger("Wrong Challeng Type", Color.Red);
            return null;
        }

        // Get task list
        logger("Setting up form", Color.Cyan);
        const form = await setupForm({ sitekey, host }, response);
        logger("Form setup successfully", Color.Green);

        logger("Getting task list", Color.Cyan);
        const getTasks = await axios.post(`https://hcaptcha.com/getcaptcha?s=${sitekey}`, form, { headers })
            .then((res) => res.data)
            .catch((err) => { logger(`Failed getting task list with error code ${err.response.status}`, Color.Red); return null; })

        if (!getTasks)
            return null;

        logger("Got task list", Color.Green);
        // Check if quick solved
        if (getTasks.generated_pass_UUID)
            return getTasks.generated_pass_UUID;
        if (getTasks.key.charAt(0) !== "E" && getTasks.key.charAt(2) === "_")
            return getTasks.key;

        // Get answers
        logger("Getting answers", Color.Cyan);
        const answers = await getAnswers(getTasks);

        if (Object.values(answers).every((v) => v === "false")) {
            logger("Failed getting answers", Color.Red);
            return null;
        }
        logger("Got answers", Color.Green);

        // Update Headers
        headers['Content-Type'] = "application/json";

        // Check answers
        logger("Checking answers", Color.Cyan);
        const timestamp = Date.now() + Utils.random(30, 120);
        const check = await axios.post(`https://hcaptcha.com/checkcaptcha/${sitekey}/${getTasks.key}`, {
            job_mode: getTasks.request_type,
            answers,
            serverdomain: host,
            sitekey,
            motionData: JSON.stringify({
                st: timestamp,
                dct: timestamp,
                mm: Utils.mm()
            }),
            n: await nToken(response.c!),
            v: version,
            c: JSON.stringify(response.c)
        }, {
            headers
        })
            .then((res) => res.data)
            .catch((err) => { logger(`Failed checking answers with error code ${err.response.status}`, Color.Red); return err.response.data; })

        if (check.generated_pass_UUID) {
            logger("Got correct response", Color.Green);
            return check.generated_pass_UUID;
        } else {
            logger("Wrong response", Color.Red);
            return null;
        }
    }

    /**
     * @description Helper function to setup the request form
     * @param {string} sitekey The website's sitekey
     * @param {string} host The host
     * @param {SiteConfig} { c } Deferenced c value from the website's site config data
     * @returns {Promise<URLSearchParams>} The appropriate request form needed for solving captcha as URLSearchParams
     */
    const setupForm = async ({ sitekey, host }: CaptchaData, { c }: SiteConfig): Promise<URLSearchParams> => {
        const timestamp = Date.now() + Utils.random(30, 120);

        if (!c) {
            return new URLSearchParams({
                sitekey,
                host,
                hl: 'en',
                motionData: JSON.stringify({
                    st: timestamp,
                    mm: Utils.mm(),
                })
            });
        } else {
            return new URLSearchParams({
                sitekey,
                host,
                hl: 'en',
                motionData: JSON.stringify({
                    st: timestamp,
                    dct: timestamp,
                    mm: Utils.mm()
                }),
                n: await nToken(c),
                v: version,
                c: JSON.stringify(c)
            });
        }
    }

    /**
     * @description Debug Logger function
     * @param {string} message Message to be logged
     * @param {Color} color Color for the message to be displayed as
     * @returns {void}
     */
    const logger = (message: string, color: Color): void => {
        if (showStatus) {
            const date = new Date();
            const h = String(date.getHours()).padStart(2, '0');
            const m = String(date.getMinutes()).padStart(2, '0');
            const s = String(date.getSeconds()).padStart(2, '0');
            const ms = String(date.getMilliseconds()).padStart(3, '0');
            console.log(`${color}%s${Color.Clear}`, `[${h}:${m}:${s}.${ms}] ${message}`);
        }
    }

    export const autoSolve = async (url: string, withLogs: boolean = false): Promise<puppeteer.Browser | null> => {
        const startTime = Date.now();

        showStatus = withLogs;
        logger("Starting solver with logs", Color.Cyan);

        // Spawn Browser
        const browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: false
        })

        const [page] = await browser.pages();
        await page.goto(url);

        // Wait for frame to load
        await page.waitForSelector('iframe[src*="hcaptcha.com"]');

        const captchaData = await page.evaluate(() => {
            const iframesrc = (document.querySelector(
                'iframe[src*="hcaptcha.com"]'
            ) as HTMLIFrameElement).src;
            const urlParams = new URLSearchParams(iframesrc);

            return { sitekey: urlParams.get("sitekey"), host: urlParams.get("host") }
        }) as CaptchaData

        // await browser.close()

        if (captchaData) {
            while (true) {
                userAgent = userAgents[Utils.random(0, userAgents.length - 1)].useragent;
                const token = await solve(captchaData)
                if (token) {
                    logger(`✅ Completed in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`, Color.Green);
                    await page.evaluate((token) => {
                        (document.querySelector('[name="h-captcha-response"]') as HTMLTextAreaElement).value = token;
                    }, token);
                    return browser;
                } else {
                    logger("Waiting 5 seconds before retrying", Color.Red);
                    await new Promise((r) => setTimeout(r, 5000));
                }
            }
        } else {
            await browser.close();
            logger("Solver failed to aquire captcha details", Color.Red);
            return null;
        }
    }

    /**
     * @description Exposed token function. Used for gaining solve token for hCaptcha form
     * @param {string} url Url with hCaptcha
     * @param {boolean?} withLogs Optional flag for enabling logging - Default value is false
     * @returns {Promise<string>} Valid response token
     */
    export const tokenOnly = async (url: string, withLogs: boolean = false): Promise<string> => {
        const startTime = Date.now();

        showStatus = withLogs;
        logger("Starting solver with logs", Color.Cyan);

        // Spawn Browser
        const browser = await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: true
        })

        const [page] = await browser.pages();
        await page.goto(url);

        // Wait for frame to load
        await page.waitForSelector('iframe[src*="hcaptcha.com"]');

        const captchaData = await page.evaluate(() => {
            const iframesrc = (document.querySelector(
                'iframe[src*="hcaptcha.com"]'
            ) as HTMLIFrameElement).src;
            const urlParams = new URLSearchParams(iframesrc);

            return { sitekey: urlParams.get("sitekey"), host: urlParams.get("host") }
        }) as CaptchaData

        await browser.close()

        if (captchaData) {
            while (true) {
                userAgent = userAgents[Utils.random(0, userAgents.length - 1)].useragent;
                const token = await solve(captchaData)
                if (token) {
                    logger(`✅ Completed in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`, Color.Green);
                    return token;
                } else {
                    logger("Waiting 5 seconds before retrying", Color.Red);
                    await new Promise((r) => setTimeout(r, 5000));
                }
            }
        } else {
            return "Failed"
        }
    }
}

export default hCaptcha;
