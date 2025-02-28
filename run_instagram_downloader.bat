@echo off
title Instagram Image Downloader

:: Install required dependencies and wait for completion
echo Installing necessary packages...
call npm install puppeteer prompt-sync --save

:: Run the script after installation is complete
echo Running the Instagram downloader...
call node index.js

:: Keep the window open after execution
pause
exit
