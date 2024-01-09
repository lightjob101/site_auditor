const axios = require('axios');
const fs = require('fs').promises;
const { SingleBar, Presets } = require('cli-progress');
const fetchLighthouseReport = async (url, apiKey, progressBar, Queue) => {
    const apiEndpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo&key=${apiKey}`;

    try {
        const response = await axios.get(apiEndpoint);
        const data = response.data;

        // Check if the necessary data exists
        if (!data.lighthouseResult || !data.lighthouseResult.categories || !data.lighthouseResult.audits) {
            throw new Error('Lighthouse report is missing necessary data');
        }

        const categoryScores = data.lighthouseResult.categories;
        const audits = data.lighthouseResult.audits;

        let contrast = audits["color-contrast"] ? audits["color-contrast"]["title"] : undefined;
        if (!contrast || contrast === 'Background and foreground colors have a sufficient contrast ratio') {
            contrast = 'NA';
        }

        let font = audits["font-size"] ? audits["font-size"]["title"] : undefined;
        if (!font || font === 'Document uses legible font sizes') {
            font = 'NA';
        }

        let links = audits["link-text"] ? audits["link-text"]["title"] : undefined;
        if (!links || links === 'Links have descriptive text') {
            links = 'NA';
        }

        const scores = {
            Performance: categoryScores.performance.score * 100,
            Accessibility: categoryScores.accessibility.score * 100,
            BestPractices: categoryScores['best-practices'].score * 100,
            SEO: categoryScores.seo.score * 100,
            Contrast: contrast,
            User_Exprerience : font,
            Mobile_Friendly: links
        };

        progressBar.increment();
        await fs.writeFile('response.json', JSON.stringify(response.data, null, 2));
        return { url, scores };
    } catch (error) {
        console.error(`Error fetching Lighthouse report for ${url}:`, error.message);
    }
};


const fetchLighthouseReports = async (urls, apiKey, Queue) => {
    const start = performance.now();

    const validUrls = urls.filter(url => url.startsWith('http://') || url.startsWith('https://'));

    const totalRequests = validUrls.length;
    const progressBar = new SingleBar({
        format: 'Progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}',
    }, Presets.shades_classic);

    progressBar.start(totalRequests, 0);

    const queue = new Queue({ concurrency: 30 });

    const reportPromises = validUrls.map(url => queue.add(() => fetchLighthouseReport(url, apiKey, progressBar, Queue)));

    const reports = await Promise.allSettled(reportPromises);

    const fulfilledReports = reports.filter(result => result.status === 'fulfilled').map(result => result.value);

    progressBar.stop();
    const end = performance.now();
    const totalTime = end - start;
    console.log(`Total time taken: ${totalTime} milliseconds`);

    // Write data to JSON file asynchronously
    const jsonFilePath = 'lighthouse_reports.json';
    try {
        await fs.writeFile(jsonFilePath, JSON.stringify(fulfilledReports, null, 2));
        console.log(`Lighthouse reports written to ${jsonFilePath}`);
    } catch (error) {
        console.error(`Error writing to ${jsonFilePath}:`, error);
    }

    return fulfilledReports;
};

const main = async (realUrls) => {
    const apiKey = 'AIzaSyAC2a5FRPuTu1TBCoauzicmTSRiuisI8xA';

    try {
        const Queue = await import('p-queue');
        const lighthouseReports = await fetchLighthouseReports(realUrls, apiKey, Queue.default);        
        return lighthouseReports
        // console.log('All Lighthouse reports have been saved in lighthouse_reports.json', lighthouseReports);
    } catch (error) {
        console.error('Error in main function:', error);
    }
};

module.exports= {main}
