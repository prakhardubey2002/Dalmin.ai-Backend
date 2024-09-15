const puppeteer = require('puppeteer-core');
const chrome = require('chrome-aws-lambda');
const express = require('express');
const app = express();

app.use(express.json());

module.exports = async (req, res) => {
  const { place, category } = req.body;

  try {
    const browser = await puppeteer.launch({
      args: [...chrome.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: chrome.headless,
    });
    
    const page = await browser.newPage();
    const searchUrl = `https://www.google.com/search?q=${category}+in+${place}&tbm=lcl`;
    await page.goto(searchUrl);

    const autoScroll = async () => {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 500;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= document.body.scrollHeight - 100) {
              clearInterval(timer);
              resolve();
            }
          }, 500);
        });
      });
    };

    await autoScroll();

    const data = await page.evaluate(() => {
      const profiles = [];
      const elements = document.querySelectorAll('.VkpGBb');

      elements.forEach((element) => {
        const nameElement = element.querySelector('.dbg0pd');
        const ratingElement = element.querySelector('.BTtC6e');
        const reviewsElement = element.querySelector('.UY7F9');
        const addressElement = element.querySelector('.rllt__details > div:nth-child(3)');
        const phoneElement = element.querySelector('.rllt__wrapped .Aq14fc');
        const websiteElement = element.querySelector('a.yYlJEf');
        const gmbProfileLinkElement = element.querySelector('a[href^="/url?q="]');
        
        const name = nameElement ? nameElement.innerText.trim() : 'N/A';
        const rating = ratingElement ? parseFloat(ratingElement.innerText.trim()) : 'N/A';
        const reviews = reviewsElement ? parseInt(reviewsElement.innerText.replace(/[^0-9]/g, '').trim()) : 'N/A';
        const address = addressElement ? addressElement.innerText.trim() : 'N/A';
        const phone = phoneElement ? phoneElement.innerText.trim() : 'N/A';
        const website = websiteElement ? websiteElement.getAttribute('href') : 'N/A';
        const gmbProfileLink = gmbProfileLinkElement ? gmbProfileLinkElement.getAttribute('href') : 'N/A';

        profiles.push({
          name,
          rating,
          reviews,
          address,
          phone,
          website,
          gmbProfileLink,
        });
      });

      return profiles.slice(0, 50);
    });

    await browser.close();
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to scrape GMB data' });
  }
};
