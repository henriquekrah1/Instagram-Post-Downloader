# Instagram-Post-Downloader

A **simple Instagram post downloader** built with **Puppeteer**. This script allows users to download all images from any public post (or private post if logged in) and saves them in a structured folder based on the username.  It saves posts without using Instagram's API, often overcomplicating things. Instead, it saves images almost like a screenshot, working more smoothly and with fewer issues.

## 📌 Features  
✅ **Downloads all images from an Instagram post**  
✅ **Handles multiple images in a post (carousel support)**  
✅ **Allows for multiple links until you exit**  
✅ **Stores images in a folder named after the Instagram user**  

## 🚀 Installation & Usage  

### **1️⃣ Prerequisites**  
- Install [**Node.js**](https://nodejs.org/) (Make sure `npm` is included)  

### **2️⃣ Download & Install Dependencies**  
- **Clone the repository** or **download the ZIP**  
- Extract the files  
- **Run `run_instagram_downloader.bat`** (This will install dependencies and start the script)  

### **3️⃣ Using the Script**  
- After running `run_instasaver.bat`, the script will ask:  
  `Would you like to log in to Instagram? (Y/N):`  
  - **Press `Y`** if you want to download from private accounts.  
  - **Press `N`** to proceed without logging in.  
- Then, paste an **Instagram post URL**.  
- The script will download and save the images.  
- It will then ask for another post URL.  
- **Type `exit` to stop the script.**


## ⚠️ Known Issues  
- **Images under "More Posts From..." are downloaded.** The script will often download extra images that are not from the desired post. 
- **Username retrieval may fail**, causing images to be saved under **unknown_user**.
- Only works for actual posts, but not for videos (or Reels)

## 📜 License  
This project is **open-source**. Feel free to contribute!  
