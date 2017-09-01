const CDP = require('chrome-remote-interface');
const argv = require('minimist')(process.argv.slice(2));
const file = require('mz/fs');
const timeout = require('delay');

// username and password for login
const passwd = require('./passwd');
const log = require('./log');

// CLI Args
const url = argv.url || 'https://www.google.com';
const format = argv.format === 'jpeg' ? 'jpeg' : 'png';
const viewportWidth = argv.viewportWidth || 1440;
let viewportHeight = argv.viewportHeight || 900;
const delay = argv.delay || 0;
const userAgent = argv.userAgent;
const fullPage = argv.full;
const outputDir = argv.outputDir || './';
const output = argv.output || `output.${format === 'png' ? 'png' : 'jpg'}`;

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

    // Navigate to target page
    log('Navigate to target page:', url)
    await Page.navigate({url});

    // Wait for page load event to take screenshot
    await Page.loadEventFired();

    log('delay:', delay);
    await timeout(delay);

    // If the `full` CLI option was passed, we need to measure the height of
    // the rendered page and use Emulation.setVisibleSize
    if (fullPage) {
      const {root: {nodeId: documentNodeId}} = await DOM.getDocument();
      const {nodeId: bodyNodeId} = await DOM.querySelector({
        selector: 'body',
        nodeId: documentNodeId,
      });
      const {model} = await DOM.getBoxModel({nodeId: bodyNodeId});
      viewportHeight = model.height;

      await Emulation.setVisibleSize({width: viewportWidth, height: viewportHeight});
      // This forceViewport call ensures that content outside the viewport is
      // rendered, otherwise it shows up as grey. Possibly a bug?
      await Emulation.forceViewport({x: 0, y: 0, scale: 1});
    }

    if (1) {
      // do login
      // const {root: {nodeId: documentNodeId}} = await DOM.getDocument();
      // const {nodeId: bodyNodeId} = await DOM.querySelector({
      //   selector: 'input[id=username]',
      //   nodeId: documentNodeId,
      // });
      // const {model} = await DOM.getBoxModel({nodeId: bodyNodeId});
      async function getResult(evaluationStr) {
        const { result } = await Runtime.evaluate({expression: evaluationStr});
        return result;
      }
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
        log('wait for login and redirect:', delay);
        await timeout(delay);
      } else {
        log('no, go on');
      }
    }

    log('take snapshot');
    const screenshot = await Page.captureScreenshot({
      format,
      fromSurface: true,
      clip: {
        width: viewportWidth,
        height: viewportHeight
      }
    });

    log('start saving snapshot');
    const buffer = new Buffer(screenshot.data, 'base64');
    const path = `${outputDir + output}`;
    await file.writeFile(path, buffer, 'base64');
    log('Screenshot saved');
    client.close();
  } catch (err) {
    if (client) {
      client.close();
    }
    console.error('Exception while taking screenshot:', err);
    process.exit(1);
  }
}
