(async() => {

    const cheerio = require('cheerio'); // Parse HTML
    const axios = require('axios'); // Download the webpage to scrapped
    const https = require('https'); // Request Download Video
    const fs = require('fs'); // Save File
    const chalk = require('chalk'); // Colorful outputs on terminal
    const DraftLog = require('draftlog').into(console) // Helps me update text on terminal(instead of rewriting)

    const urls = [
        'https://player.vimeo.com/video/445061524',
    ];

    /**
     * Turns a string into a number by removing all NaNs
     * @param {*} value string
     */
    function onlyNumbers(value) {
        return value.match(/\d+/)[0];
    }

    /**
     * Download the webpage and search for the videoURL
     * @param {*} url 
     * @param {*} index 
     */
    function getVideoUrl(url, index) {
        return new Promise(async(resolve) => {
            const response = await axios.get(url);

            const $ = cheerio.load(response.data);
            const scripts = $('script');

            const funcao = scripts[2].children[0].data;

            const jsonIndexOfStartCriteria = 'var config = ';
            const jsonIndexOfEndCriteria = '; if (!config.request)';

            const extractedText = funcao.substring(funcao.indexOf(jsonIndexOfStartCriteria) + jsonIndexOfStartCriteria.length, funcao.indexOf(jsonIndexOfEndCriteria));
            const jsonParsed = JSON.parse(extractedText);

            const highestResNode = jsonParsed.request.files.progressive.sort((a, b) => Number(onlyNumbers(b.quality)) - Number(onlyNumbers(a.quality)))[0];
            resolve({ index, url: highestResNode.url, path: response.request.path });
        });
    }

    /**
     * Download the video and saves into a downloaded folder
     * @param {*} fileUrl 
     */
    function downloadFile(fileUrl) {

        const draftLogPrinter = console.draft();

        let receivedBytes = 0;
        let totalBytes = 0;

        https.get(fileUrl, (response) => {

            const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
            const out = fs.createWriteStream(`./downloaded/${fileName}`);
            response.pipe(out);
            totalBytes = parseInt(response.headers['content-length']);

            response.on('data', (chunk) => {
                receivedBytes += chunk.length;
                showProgress(receivedBytes, totalBytes, fileName, draftLogPrinter);
            });

            response.on('end', () => {});

        });

    }

    /**
     * Self Explanatory
     * @param {} bytes 
     */
    function bytesToMB(bytes) {
        return (bytes / Math.pow(1024, 2)).toFixed(2);
    }

    /**
     * Self Explanatory
     * @param {*} received 
     * @param {*} total 
     * @param {*} fileName 
     * @param {*} draftLogPrinter 
     */
    function showProgress(received, total, fileName, draftLogPrinter) {
        const percentage = ((received * 100) / total).toFixed(2);
        const symbolFillers = Math.round(percentage / 5);
        const loadingBar = `${chalk.dim('║')}${chalk.blue('█').repeat(symbolFillers)}${'░'.repeat(20 - symbolFillers)}${chalk.dim('║ ')}`;
        const extraInfos = `${chalk.magenta(percentage + '%')} | ${bytesToMB(received)}MB / ${bytesToMB(total)}MB ~ ${fileName}`;
        draftLogPrinter(`${loadingBar}${extraInfos}`);
    }

    console.log(chalk.blueBright('Downloading Process Started'));

    const newVideoUrlsPromise = urls.map(async(url, i) => getVideoUrl(url, i));
    const videoUrlsToBeDownloaded = await Promise.all(newVideoUrlsPromise);

    videoUrlsToBeDownloaded.forEach((r) => downloadFile(r.url));

})();