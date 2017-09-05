/**
 * TODO 可以进行优化
 * - 升级到更高层的API https://github.com/GoogleChrome/puppeteer
 */

const CDP = require('chrome-remote-interface');
const argv = require('minimist')(process.argv.slice(2));
const file = require('mz/fs');
const timeout = require('delay');

// username and password for login
const passwd = require('./passwd');
const log = require('./log');

// CLI Args
const format = argv.format === 'jpeg' ? 'jpeg' : 'png';
const viewportWidth = argv.viewportWidth || 1440;
const viewportHeight = argv.viewportHeight || 900;
const userAgent = argv.userAgent || 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Mobile Safari/537.36';
const outputDir = argv.outputDir || './output/';

init();

async function init() {
  log('init');
  let client;
  try {
    // Start the Chrome Debugging Protocol
    client = await CDP();

    // Verify version
    const { Browser } = await CDP.Version();
    const browserVersion = Browser.match(/\/(\d+)/)[1];
    if (Number(browserVersion) !== 60) {
      console.warn(`This script requires Chrome 60, however you are using version ${browserVersion}. The script is not guaranteed to work and you may need to modify it.`);
    }

    // Extract used DevTools domains.
    const { DOM, Emulation, Network, Page, Runtime, Log } = client;

    // Enable events on domains we are interested in.
    await Page.enable();
    await DOM.enable();
    await Network.enable();
    await Log.enable();

    Log.entryAdded(function ({ entry }) {
      log('[REMOTE]', entry.text);
    });

    // If user agent override was specified, pass to Network domain
    if (userAgent) {
      await Network.setUserAgentOverride({userAgent});
    }

    // Set up viewport resolution, etc.
    const deviceMetrics = {
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: 0,
      mobile: false,
      fitWindow: false,
    };
    await Emulation.setDeviceMetricsOverride(deviceMetrics);
    await Emulation.setVisibleSize({
      width: viewportWidth,
      height: viewportHeight,
    });

    const shouyeUrl = 'https://acc.yonyoucloud.com/m/shouye';

    // Navigate to target page
    log('Navigate to shouye page:', shouyeUrl)
    await Page.navigate({ url: shouyeUrl });

    // Wait for page load event to take screenshot
    await Page.loadEventFired();

    log('delay: 2000');
    await timeout(2000);

    async function getResult(evaluationStr) {
      const { result } = await Runtime.evaluate({expression: evaluationStr});
      return result;
    }

    /**
     * 执行脚本得到结果
     * ```js
     * getResultValue('foo = "bar"; foo;'); // "bar"
     * ````
     * @param  {string} evaluationStr 确保语句执行结果的类型是string，否则可能会报错
     * @return {[type]}               [description]
     */
    async function getResultValue(evaluationStr) {
      const { result: { value } } = await Runtime.evaluate({expression: evaluationStr});
      return value;
    }

    // do login
    if (1) {
      log('need login?');
      if ((await getResult('typeof doLogin')).value === 'function') {
        log('yes, we are at login page');
        log('input username and password, do login');
        const evaluationStr = `
          console.log('xxdebug');
          document.querySelector('input[id=username]').value = '${passwd.username}';
          document.querySelector('input[id=password]').value = '${passwd.password}';
          doLogin();`
        const result = await Runtime.evaluate({expression: evaluationStr});
        log('login result:', result);
        log('wait for login and redirect: 5000');
        await timeout(5000);
      } else {
        log('no, go on');
      }
    }
    
    // 从首页获取所有需要截图的报表的URL
    let dupontUrl = await getResultValue('window.FUCK.MDupont');
    
    // const dupontUrl = 'https://acc.yonyoucloud.com/fireport/ReportServer?reportlet=%2Fyonyoufi%2Foas6lr3w%2FMDupont%2FMDupont_p.cpt&__showtoolbar__=false&aid=yonyoufi&tid=oas6lr3w&userid=521fa89e-886e-4d44-9014-eb53097872d1&referAppId=yonyoufi&tenantId=oas6lr3w&op=h5&accbook=1574FCFD-89C8-4DFD-9E22-B281222D8C72';
    // const managementStatusUrl = 'https://acc.yonyoucloud.com/fireport/ReportServer?reportlet=%2Fyonyoufi%2Foas6lr3w%2FMManagementStatus%2FMManagementStatus_p.cpt&__showtoolbar__=false&aid=yonyoufi&tid=oas6lr3w&userid=521fa89e-886e-4d44-9014-eb53097872d1&referAppId=yonyoufi&tenantId=oas6lr3w&op=h5&accbook=D1C4A142-EC87-4BF0-BDD4-1FBD7D1D271A';
    // const trendAnalysisUrl = 'https://acc.yonyoucloud.com/fireport/ReportServer?reportlet=%2Fyonyoufi%2Foas6lr3w%2FMTrendAnalysis%2FMTrendAnalysis_p.cpt&__showtoolbar__=false&aid=yonyoufi&tid=oas6lr3w&userid=521fa89e-886e-4d44-9014-eb53097872d1&referAppId=yonyoufi&tenantId=oas6lr3w&rptitem=lr013&op=h5&accbook=D1C4A142-EC87-4BF0-BDD4-1FBD7D1D271A';
    // const financialDataUrl = 'https://acc.yonyoucloud.com/fireport/ReportServer?reportlet=%2Fyonyoufi%2Foas6lr3w%2FMFinancialData%2FMFinancialData_p.cpt&__showtoolbar__=false&aid=yonyoufi&tid=oas6lr3w&userid=521fa89e-886e-4d44-9014-eb53097872d1&referAppId=yonyoufi&tenantId=oas6lr3w&op=h5&accbook=D1C4A142-EC87-4BF0-BDD4-1FBD7D1D271A';
    
    /**
     * [takeSnapShot description]
     * @param  {string} url          访问这个URL然后截图
     * @param  {string} output       输出文件名称
     * @param  {Number} [delay=5000] 延时截图，比如DOM加载时间，还有报表绘制动画
     * @return {[type]}              [description]
     */
    async function takeSnapShot(url, output, delay = 2000) {
      // Navigate to target page
      log('Navigate to target page:', url)
      await Page.navigate({ url });

      // Wait for page load event to take screenshot
      await Page.loadEventFired();

      log('delay for dom loaded and page animation:', delay);
      await timeout(delay);

      log('take snapshot');
      const screenshot = await Page.captureScreenshot({
        format,
        fromSurface: true,
        clip: {
          width: viewportWidth,
          height: viewportHeight
        }
      });

      const buffer = new Buffer(screenshot.data, 'base64');
      const path = `${outputDir + output}`;
      log('start saving snapshot:', path);
      await file.writeFile(path, buffer, 'base64');
      log('Screenshot saved');
    }
    
    // 杜邦分析的动画绘制时间比较长
    await takeSnapShot(dupontUrl, 'Dupont.png', 10000);
    // await takeSnapShot(managementStatusUrl, 'ManagementStatus.png');
    // await takeSnapShot(trendAnalysisUrl, 'TrendAnalysis.png');
    // await takeSnapShot(financialDataUrl, 'FinancialData.png');
    
    client.close();
  } catch (err) {
    if (client) {
      client.close();
    }
    console.error('Exception while taking screenshot:', err);
    process.exit(1);
  }
}
