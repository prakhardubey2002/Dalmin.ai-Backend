const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const checkLicense = require('./middleware/licenseCheck');
const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.post('/scrape', checkLicense, async (req, res) => {
  const { place, category } = req.body;

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const searchUrl = `https://www.google.com/search?q=${category}+in+${place}&tbm=lcl`;
    await page.goto(searchUrl);

    // Auto-scrolling function to load more results
    const autoScroll = async () => {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 500; // Scroll distance increased for more data load
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= document.body.scrollHeight - 100) {
              clearInterval(timer);
              resolve();
            }
          }, 500); // Increased time to allow lazy-loaded content
        });
      });
    };

    await autoScroll();

    // Scraping logic
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
        const reviewCountSpan = element.querySelector('span.RDApEe.YrbPuc');
        const ratingSpan = element.querySelector('span.yi40Hd.YrbPuc');
        const phoneNumberSpan = element.querySelector('span.BNeawe.tAd8D.AP7Wnd');
        
        // New method for extracting specific phone numbers
        const phoneNumbers = phoneNumberSpan 
          ? phoneNumberSpan.innerText.trim()
            .split('⋅')
            .map(phoneNumber => phoneNumber.replace(/\D/g, '')) // Clean up each phone number
            .filter(Boolean)
          : []; // Handle case where phone numbers are not present
        
        const name = nameElement ? nameElement.innerText.trim() : 'N/A';
        const rating = ratingElement ? parseFloat(ratingElement.innerText.trim()) : 'N/A';
        const reviews = reviewsElement ? parseInt(reviewsElement.innerText.replace(/[^0-9]/g, '').trim()) : 'N/A';
        const address = addressElement ? addressElement.innerText.trim() : 'N/A';
        const phone = phoneElement ? phoneElement.innerText.trim() : 'N/A';
        const website = websiteElement ? websiteElement.getAttribute('href') : 'N/A';
        const gmbProfileLink = gmbProfileLinkElement ? gmbProfileLinkElement.getAttribute('href') : 'N/A';
        const reviewCount = reviewCountSpan ? reviewCountSpan.innerText.trim().match(/\d+/)[0] : 'N/A';
        const ratingValue = ratingSpan ? parseFloat(ratingSpan.innerText.trim()) : 'N/A';
        
        // New selector for the business category
        const categoryElement = element.querySelector('.rllt__details > div:nth-child(2)');
        
        const category = categoryElement ? categoryElement.innerText.trim() : 'N/A';
        
        profiles.push({
          name,
          rating,
          reviews,
          address,
          phone,
          website,
          gmbProfileLink,
          reviewCount,
          ratingValue,
          phoneNumbers,
          category, // Add category to the object
        });
      });

      return profiles.slice(0, 150); // Limit to top 150 profiles
    });

    await browser.close();
    console.log(data);
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to scrape GMB data' });
  }
});

app.get('/', (req, res) => {
  res.send('Hello Prakhar!, Welcome to GMB Scraper API.');
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
