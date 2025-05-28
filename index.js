const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const prompt = require('prompt-sync')();

const userDataDir = path.join(__dirname, 'puppeteer_profile');

const loginChoice = prompt('Would you like to log in to Instagram? (Y/N): ').trim().toUpperCase();

let loginDone = false;

(async () => {
    let browser;

    if (loginChoice === 'Y') {
        console.log("Opening Instagram login page...");

        browser = await puppeteer.launch({
            headless: false,
            userDataDir: userDataDir,
            defaultViewport: { width: 1280, height: 720 }, // 🔥 Normal-sized login window
            args: ["--window-size=1280,720"]
        });

        const loginPage = await browser.newPage();
        await loginPage.setViewport({ width: 1280, height: 720 }); // 🔥 Normal size
        await loginPage.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

        console.log("Please log in manually. The script will detect when you have logged in...");

        await loginPage.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log("Login detected! Closing login window...");
        await browser.close();
        loginDone = true;
    }

    while (true) {
        const inputURL = prompt('Enter the post URL (Instagram/VSCO) or type "exit" to quit: ').trim();

        if (inputURL.toLowerCase() === 'exit') {
            console.log("Exiting the program...");
            break;
        }

        if (inputURL.startsWith('https://www.instagram.com/p/')) {
            console.log("Detected Instagram link. Processing...");
            await processInstagram(inputURL);
        } else if (inputURL.startsWith('https://vsco.co/')) {
            console.log("Detected VSCO link. Processing...");
            await processVSCO(inputURL);
        } else {
            console.log("❌ Invalid URL. Please enter a valid Instagram or VSCO link.");
        }
    }
})();

// ✅ Instagram Image Downloader
async function processInstagram(instaURL) {
    let browser = await puppeteer.launch({
        headless: false,
        userDataDir: userDataDir,
        defaultViewport: { width: 3840, height: 2160 },
        args: ["--window-size=1,1"] // 🔥 Tiny browser window for Instagram posts
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 3840, height: 2160 }); // 🔥 Keep 4K resolution
    await page.goto(instaURL, { waitUntil: 'networkidle2' });

    async function closeInstagramPopups() {
        for (let i = 0; i < 3; i++) {
            await page.keyboard.press('Escape');
        }
    }

    await closeInstagramPopups();

    let username = await page.evaluate(() => {
        let userElement = document.querySelector('header a[href^="/"]');
        return userElement ? userElement.innerText.trim() : "unknown_user";
    });

    if (!username) {
        console.log("⚠️ Unable to detect username. Defaulting to 'unknown_user'.");
        username = "unknown_user";
    }

    console.log(`Username detected: ${username}`);

    const userFolder = path.join(__dirname, 'Downloaded_Posts', username);
    if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '_').split('.')[0];

    let imageUrls = new Set();

    while (true) {
        await page.waitForSelector('img[src]');

        let newImages = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('img[src]'))
                .map(img => img.src)
                .filter(src => src.includes('cdninstagram')); // Optional: filters out random junk
        });

        newImages.forEach(imgSrc => imageUrls.add(imgSrc));

        const nextButton = await page.$('button[aria-label="Next"]');
        if (nextButton) {
            await nextButton.click();
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
            break;
        }
    }

    console.log(`Found ${imageUrls.size} image(s) in the post.`);

    if (imageUrls.size === 0) {
        console.log("⚠️ No images were found. If this is a private post, ensure you're logged in.");
    }

    let count = 1;
    for (let imgSrc of imageUrls) {
        const response = await page.goto(imgSrc);
        const buffer = await response.buffer();
        const fileSize = buffer.length / 1024;

        if (fileSize < 50) {
            console.log(`Skipped image ${count} (size: ${fileSize.toFixed(2)} KB, too small).`);
            continue;
        }

        const filePath = path.join(userFolder, `${timestamp}_image_${count}.jpg`);
        fs.writeFileSync(filePath, buffer);
        console.log(`Saved image ${count} as ${filePath} (size: ${fileSize.toFixed(2)} KB).`);
        count++;
    }

    await browser.close();
    console.log("\nDownload complete. Ready for the next link.\n");
}

// ✅ VSCO Screenshot-Based Image Downloader
async function processVSCO(vscoURL) {
    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 3840, height: 2160 },
        args: ["--window-size=1,1"] // 🔥 Tiny browser window for VSCO screenshots
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 3840, height: 2160 }); // 🔥 Keep 4K resolution
    await page.goto(vscoURL, { waitUntil: 'networkidle2' });

    let username = vscoURL.split('/')[3].split('?')[0];

    console.log(`Username detected: ${username}`);

    const baseFolder = path.join(__dirname, 'Downloaded_Posts', username);
    if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '_').split('.')[0];
    

    try {
        await page.waitForSelector('img', { timeout: 10000 });

        const images = await page.$$('img');

        if (images.length === 0) {
            console.log("⚠️ No images found on this VSCO page.");
            return;
        }

        let count = 1;
        for (const image of images) {
            await page.evaluate(img => {
                img.scrollIntoView();
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
            }, image);

            const filePath = path.join(baseFolder, `${timestamp}_image_${count}.jpg`);

            await image.screenshot({
                path: filePath,
                omitBackground: true
            });

            console.log(`Saved screenshot ${count} as ${filePath}.`);
            count++;
        }

        console.log("\nDownload complete. Ready for the next link.\n");

    } catch (error) {
        //console.log("❌ Error processing VSCO images:", error.message);
    }

    await browser.close();
}
