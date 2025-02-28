const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const prompt = require('prompt-sync')();

// Use a persistent profile to keep the login session
const userDataDir = path.join(__dirname, 'puppeteer_profile');

// Ask the user if they want to log in
const loginChoice = prompt('Would you like to log in to Instagram? (Y/N): ').trim().toUpperCase();

let loginDone = false;

(async () => {
    let browser;

    if (loginChoice === 'Y') {
        console.log("Opening Instagram login page...");

        // Open browser with persistent session
        browser = await puppeteer.launch({
            headless: false,
            userDataDir: userDataDir // Keep login session
        });

        const loginPage = await browser.newPage();
        await loginPage.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

        console.log("Please log in manually. The script will detect when you have logged in...");

        // Wait for user to log in by checking if Instagram homepage loads
        await loginPage.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log("Login detected! Closing login window...");
        await browser.close();
        loginDone = true;
    }

    while (true) {
        // Ask for the Instagram post URL
        const instaURL = prompt('Enter the Instagram post URL (or type "exit" to quit): ').trim();

        if (instaURL.toLowerCase() === 'exit') {
            console.log("Exiting the program...");
            break;
        }

        if (!instaURL.startsWith('https://www.instagram.com/p/')) {
            console.log("❌ Invalid Instagram URL. Make sure it starts with 'https://www.instagram.com/p/'.");
            continue;
        }

        // Open a new browser instance using the saved session
        browser = await puppeteer.launch({
            headless: false,
            userDataDir: userDataDir // Use the same session to keep login
        });

        const page = await browser.newPage();
        await page.goto(instaURL, { waitUntil: 'networkidle2' });

        // Function to close Instagram popups using ESC key
        async function closeInstagramPopups() {
            console.log("Attempting to close Instagram popups...");
            for (let i = 0; i < 3; i++) { // Try multiple times in case of multiple popups
                await page.keyboard.press('Escape'); // Press "ESC" key
            }
            console.log("Popup check complete.");
        }

        await closeInstagramPopups(); // Ensure popups are gone before scraping

        // Extract username from the post
        let username = await page.evaluate(() => {
            let userElement = document.querySelector('header a[href^="/"]');
            return userElement ? userElement.innerText.trim() : null;
        });

        if (!username) {
            console.log("⚠️ Unable to detect username. Defaulting to 'unknown_user'.");
            username = "unknown_user";
        }

        console.log(`Username detected: ${username}`);

        // Create "Downloaded_Posts" folder and user-specific folder dynamically
        const baseFolder = path.join(__dirname, 'Downloaded_Posts');
        const userFolder = path.join(baseFolder, username);

        if (!fs.existsSync(baseFolder)) {
            fs.mkdirSync(baseFolder);
        }
        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder);
        }

        // Generate a unique timestamp for this post batch
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '_').split('.')[0];

        let imageUrls = new Set();

        while (true) {
            // Wait for images to load
            await page.waitForSelector('img[src]');

            // Get all images inside the post (works for both logged-in and logged-out users)
            let newImages = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('article img[src]'))
                    .map(img => img.src);
            });

            // Add to the set (avoiding duplicates)
            newImages.forEach(imgSrc => imageUrls.add(imgSrc));

            // Check if a "next" button exists (carousel posts)
            const nextButton = await page.$('button[aria-label="Next"]');
            if (nextButton) {
                await nextButton.click();
                await new Promise(resolve => setTimeout(resolve, 100)); // Faster transition
            } else {
                break; // No next button, stop looping
            }
        }

        console.log(`Found ${imageUrls.size} image(s) in the post.`);

        if (imageUrls.size === 0) {
            console.log("⚠️ No images were found. If this is a private post, ensure you're logged in.");
        }

        // Save images with unique names, but only if they are above 50KB
        let count = 1;
        for (let imgSrc of imageUrls) {
            const response = await page.goto(imgSrc);
            const buffer = await response.buffer();
            const fileSize = buffer.length / 1024; // Convert bytes to KB

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
})();
